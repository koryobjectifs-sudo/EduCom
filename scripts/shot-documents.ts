/**
 * Capture les 4 onglets du hub Documents, en vraie session, à 1440 × 900.
 * Fixtures créées puis SUPPRIMÉES dans le `finally`. Script temporaire.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { currentAcademicYear } from "../src/lib/studentFile";
import { CDP, chromeAvailable, launchChrome, waitFor, shot, sessionCookies, DESKTOP } from "./_cdp";

const PORT = Number(process.env.CDP_PORT ?? 9455);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR!;
const TAG = "SHOTDOC";
const PASSWORD = `Shot-${Math.random().toString(36).slice(2)}-26!`;

const trash = { authIds: [] as string[], userIds: [] as string[], docIds: [] as string[], folderIds: [] as string[], reqIds: [] as string[] };

async function main() {
  if (!chromeAvailable()) throw new Error("Chrome introuvable");
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) throw new Error(`app injoignable sur ${BASE}`);

  const admin = createAdminClient();
  const year = currentAcademicYear();
  const school = await prisma.school.findFirst({ where: { onboardingCompleted: true }, select: { id: true, name: true } });
  if (!school) throw new Error("aucune école installée");
  console.log(`école : ${school.name}`);

  const email = `${TAG.toLowerCase()}.${Date.now()}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`compte : ${error?.message}`);
  trash.authIds.push(data.user.id);
  await prisma.user.create({ data: { id: data.user.id, email, firstName: `${TAG}-Direction`, lastName: "Capture", role: "OWNER", schoolId: school.id } });
  trash.userIds.push(data.user.id);

  // Dossiers + documents, pour que le rendu montre autre chose qu'un état vide.
  for (const name of ["Règlements", "Circulaires", "Fournitures", "Emplois du temps"]) {
    const f = await prisma.documentFolder.create({ data: { name: `${TAG} ${name}`, schoolId: school.id }, select: { id: true } });
    trash.folderIds.push(f.id);
  }
  const docs = [
    ["Règlement intérieur 2026", "application/pdf", "reglement.pdf", 184_320, "PUBLISHED"],
    ["Circulaire rentrée — familles", "application/pdf", "circulaire-rentree.pdf", 96_100, "PUBLISHED"],
    ["Liste de fournitures CM2", "application/pdf", "fournitures-cm2.pdf", 43_800, "DRAFT"],
    ["Emploi du temps 6e A", "image/png", "edt-6a.png", 512_000, "REVIEW"],
    ["Note de service — surveillance", "application/pdf", "note-service.pdf", 22_400, "ARCHIVED"],
  ] as const;
  for (const [i, [title, mimeType, fileName, sizeBytes, status]] of docs.entries()) {
    const d = await prisma.schoolDocument.create({
      data: {
        title: `${TAG} ${title}`, status: status as never, audience: i % 2 ? "FAMILIES" : "STAFF",
        scopeKind: "SCHOOL", storagePath: `${school.id}/shot/${i}/${fileName}`, fileName, mimeType, sizeBytes,
        academicYear: year, createdById: data.user.id, schoolId: school.id,
        folderId: i < trash.folderIds.length ? trash.folderIds[i] : null,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        publishedById: status === "PUBLISHED" ? data.user.id : null,
      }, select: { id: true },
    });
    trash.docIds.push(d.id);
  }
  const r = await prisma.documentRequest.create({
    data: { name: `${TAG} Attestation de bourse`, description: "Modèle demandé par le secrétariat", schoolId: school.id },
    select: { id: true },
  });
  trash.reqIds.push(r.id);
  console.log("fixtures : 4 dossiers, 5 documents, 1 demande");

  const cookies = await sessionCookies(email, PASSWORD);
  const profile = mkdtempSync(join(tmpdir(), "cdpshot-"));
  const launched = await launchChrome(PORT, profile);
  if (!launched) throw new Error("Chrome n'a pas ouvert son point DevTools");
  const { chrome, wsUrl } = launched;

  const cdp = await CDP.open(wsUrl);
  const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);
  for (const c of cookies) await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: DESKTOP.width, height: DESKTOP.height, deviceScaleFactor: 2, mobile: false }, session);

  const pages: [string, string][] = [
    ["/dashboard/documents/centre", "01-centre"],
    ["/dashboard/students/export", "02-exports"],
    ["/dashboard/documents", "03-documents"],
  ];
  for (const [path, name] of pages) {
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: `${BASE}${path}` }, session);
    await loaded;
    const okRender = await waitFor(cdp, session, `!!document.querySelector('h1')`);
    const url = await cdp.send<{ result: { value: string } }>("Runtime.evaluate", { expression: "location.pathname", returnByValue: true }, session);
    console.log(`${name} → ${url.result.value} (h1 rendu : ${okRender}) → ${await shot(cdp, session, OUT, name)}`);
  }
  chrome.kill();
}

main()
  .catch((e) => console.error("ÉCHEC :", e.message))
  .finally(async () => {
    const admin = createAdminClient();
    if (trash.docIds.length) await prisma.schoolDocument.deleteMany({ where: { id: { in: trash.docIds } } });
    if (trash.folderIds.length) await prisma.documentFolder.deleteMany({ where: { id: { in: trash.folderIds } } });
    if (trash.reqIds.length) await prisma.documentRequest.deleteMany({ where: { id: { in: trash.reqIds } } });
    if (trash.userIds.length) await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
    for (const id of trash.authIds) await admin.auth.admin.deleteUser(id);
    console.log("fixtures supprimées");
    await prisma.$disconnect();
    process.exit(0);
  });
