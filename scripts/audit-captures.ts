/**
 * OUTIL D'AUDIT — captures d'écran du produit réellement rendu (phase 4).
 *
 *   SHOT_DIR=/chemin npm run script -- scripts/audit-captures.ts
 *
 * ⚠️ Ce script ne vérifie rien et n'affirme rien : il PHOTOGRAPHIE. Il existe
 * parce qu'un audit visuel mené sur le code source seul décrit ce que le code
 * prétend faire, pas ce que l'utilisateur voit. Les écarts entre les deux sont
 * précisément ce qu'un audit doit trouver.
 *
 * ⚠️ Aucune ligne du produit n'est modifiée par ce fichier. Il crée une école
 * jetable, la photographie, puis la supprime. Les établissements réels ne sont
 * jamais lus ni écrits.
 *
 * Les fixtures sont volontairement RICHES : une école vide ne montre que des
 * états vides, et on n'auditerait alors ni la densité, ni la hiérarchie, ni la
 * lisibilité des listes — c'est-à-dire l'essentiel du sujet.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, waitFor, shot, sessionCookies, MOBILE, DESKTOP } from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";

const PORT = Number(process.env.CDP_PORT ?? 9449);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "audit-"));
const TAG = "AUDITUX";
const PASSWORD = `Audit-${Math.random().toString(36).slice(2)}-2026!`;

const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTIiIGZpbGw9IiMwQjFGM0EiLz48dGV4dCB4PSIzMiIgeT0iNDIiIGZvbnQtc2l6ZT0iMzAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5BPC90ZXh0Pjwvc3ZnPg==";

const trash = {
  authIds: [] as string[], userIds: [] as string[], schoolIds: [] as string[],
  classIds: [] as string[], studentIds: [] as string[], invoiceIds: [] as string[], dirs: [] as string[],
};

/** Attente d'un DOM stabilisé — le seul signal indépendant du contenu de l'écran. */
const STABLE = `(() => {
  const n = document.querySelectorAll("button, a, td, li").length;
  const s = (window.__st = window.__st || { n: -1, fois: 0 });
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  return s.fois >= 5 && n > 0;
})()`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`\n  Captures → ${OUT}\n`);

  if (!chromeAvailable()) throw new Error("Google Chrome introuvable");
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) throw new Error(`application injoignable sur ${BASE}`);

  const admin = createAdminClient();
  const stamp = Date.now();

  const school = await prisma.school.create({
    data: {
      name: `${TAG} Institution Bilingue Les Palmiers`,
      onboardingCompleted: true,
      logo: LOGO, primaryColor: "#0B1F3A",
      email: "contact@palmiers.sn", phone: "+221 33 800 12 34", address: "Sacré-Cœur 3, Dakar",
    },
    select: { id: true },
  });
  trash.schoolIds.push(school.id);

  const email = `${TAG.toLowerCase()}.${stamp}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`compte de sonde : ${error?.message}`);
  trash.authIds.push(data.user.id);
  await prisma.user.create({
    data: { id: data.user.id, email, firstName: "Aïssatou", lastName: "Diop", role: "OWNER", schoolId: school.id },
  });
  trash.userIds.push(data.user.id);

  for (const [prenom, nom, role] of [
    ["Moussa", "Sarr", "TEACHER"], ["Bineta", "Fall", "SECRETARY"], ["Omar", "Ndoye", "ACCOUNTANT"],
  ] as const) {
    const e = `${TAG.toLowerCase()}.${prenom.toLowerCase()}.${stamp}@sonde.invalid`;
    const { data: u } = await admin.auth.admin.createUser({ email: e, password: PASSWORD, email_confirm: true });
    if (!u?.user) continue;
    trash.authIds.push(u.user.id);
    await prisma.user.create({ data: { id: u.user.id, email: e, firstName: prenom, lastName: nom, role, schoolId: school.id } });
    trash.userIds.push(u.user.id);
  }

  const classes = await prisma.class.createManyAndReturn({
    data: [
      { name: "CM2 A", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "CM1 B", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "6ème", cycle: "COLLEGE", schoolId: school.id },
    ],
    select: { id: true },
  });
  for (const c of classes) trash.classIds.push(c.id);

  const noms: [string, string][] = [
    ["Aminata", "Ndiaye"], ["Ousmane", "Ba"], ["Fatoumata", "Sow"], ["Cheikh", "Diallo"],
    ["Mariama", "Gueye"], ["Ibrahima", "Sy"], ["Awa", "Cissé"], ["Modou", "Faye"],
    ["Khadija", "Camara"], ["Serigne", "Mbaye"], ["Ndeye", "Thiam"], ["Alioune", "Kane"],
  ];
  const eleves = await prisma.student.createManyAndReturn({
    data: noms.map(([p, n]) => ({ firstName: p, lastName: n, schoolId: school.id, status: "ENROLLED" as const })),
    select: { id: true, firstName: true },
  });
  for (const e of eleves) trash.studentIds.push(e.id);

  const annee = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  await prisma.enrollment.createMany({
    data: eleves.map((e, i) => ({ studentId: e.id, classId: classes[i % classes.length].id, academicYear: annee })),
  });

  // Des factures aux statuts variés : c'est la variété qui révèle la hiérarchie
  // visuelle des états, pas une liste uniforme.
  const jour = 86_400_000;
  const factures = await prisma.invoice.createManyAndReturn({
    data: eleves.slice(0, 8).map((e, i) => ({
      title: `Scolarité — ${["Octobre", "Novembre", "Décembre"][i % 3]}`,
      totalAmount: [150_000, 90_000, 210_000, 75_000][i % 4],
      status: (["PENDING", "PAID", "OVERDUE", "PENDING"] as const)[i % 4],
      dueDate: new Date(Date.now() + (i % 4 === 2 ? -12 : 9) * jour),
      schoolId: school.id, studentId: e.id,
    })),
    select: { id: true },
  });
  for (const f of factures) trash.invoiceIds.push(f.id);

  console.log(`  fixtures : 3 classes · ${eleves.length} élèves · ${factures.length} factures · 4 membres\n`);

  const cookies = await sessionCookies(email, PASSWORD);
  const profile = mkdtempSync(join(tmpdir(), "cdp-audit-"));
  trash.dirs.push(profile);
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
  for (const c of cookies) {
    await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
  }

  const premier = eleves[0].id;
  const ECRANS: [string, string][] = [
    ["/dashboard", "01-tableau-de-bord"],
    ["/dashboard/students", "02-eleves"],
    [`/dashboard/students/${premier}`, "03-fiche-eleve"],
    ["/dashboard/students/dossiers", "04-dossiers-admissions"],
    ["/dashboard/payments", "05-finance"],
    ["/dashboard/team", "06-equipe"],
    ["/dashboard/settings", "07-reglages"],
  ];

  for (const [vpNom, vp, tactile] of [["bureau", DESKTOP, false], ["mobile", MOBILE, true]] as const) {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: tactile, maxTouchPoints: 5 }, session);
    await cdp.send("Emulation.setEmitTouchEventsForMouse",
      { enabled: tactile, configuration: tactile ? "mobile" : "desktop" }, session);
    for (const [chemin, nom] of ECRANS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: tactile,
      }, session);
      await cdp.send("Page.navigate", { url: `${BASE}${chemin}` }, session);
      const rendu = await waitFor(cdp, session, STABLE, 40_000);
      const m = await evaluate<{ sw: number; cw: number; titre: string }>(cdp, session,
        `({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, titre: (document.querySelector("h1")||{}).textContent || "(pas de h1)" })`);
      const f = await shot(cdp, session, OUT, `${nom}-${vpNom}`);
      const deborde = m.sw > m.cw + 1 ? `  ⚠️ DÉBORDE ${m.sw}>${m.cw}` : "";
      console.log(`  ${rendu ? "✓" : "✗"} ${vpNom.padEnd(7)} ${nom.padEnd(24)} h1: ${m.titre.trim().slice(0, 34).padEnd(34)}${deborde}`);
    }
  }

  cdp.close();
  chrome.kill();
  console.log(`\n  ${ECRANS.length * 2} captures dans ${OUT}\n`);
}

main()
  .catch((e) => { console.error("  ⛔", e.message ?? e); })
  .finally(async () => {
    try {
      const admin = createAdminClient();
      await prisma.payment.deleteMany({ where: { invoiceId: { in: trash.invoiceIds } } });
      await prisma.invoice.deleteMany({ where: { id: { in: trash.invoiceIds } } });
      await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
      for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
      await prisma.school.deleteMany({ where: { id: { in: trash.schoolIds } } });
      for (const d of trash.dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } }
      const reste = await prisma.school.count({ where: { name: { startsWith: TAG } } });
      console.log(reste === 0 ? "  ✓ fixtures d'audit supprimées\n" : `  ✗ ${reste} résidu(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
  });
