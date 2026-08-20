/**
 * Sonde RUNTIME de l'export — lot 16.
 *
 *   npm run script -- scripts/verify-export-runtime.ts
 *
 * ⚠️ **Le §33 du cahier des charges est catégorique, et l'histoire du dépôt lui
 * donne raison** : le lot 13 a livré un écran en HTTP 500 malgré des scripts
 * verts, et le lot 15 a servi un client Prisma périmé qu'aucun vérificateur ne
 * pouvait voir. Ce script ne teste donc **aucune fonction** : il ouvre une vraie
 * session, demande les pages en HTTP, **télécharge le ZIP par la route réelle**,
 * et le fait ouvrir par un décompresseur extérieur.
 *
 * ⚠️ Aucune route de sonde n'est ajoutée au dépôt : on s'authentifie pour de
 * bon, avec un compte créé puis supprimé.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { BUCKET, currentAcademicYear, storagePathFor } from "../src/lib/studentFile";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const TAG = "SONDEEXP";
const PASSWORD = `Exp-${Math.random().toString(36).slice(2)}-16!`;
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const trash = {
  authIds: [] as string[], userIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], reqIds: [] as string[], paths: [] as string[], dirs: [] as string[],
};

async function cookieFor(email: string) {
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(error?.message ?? "session absente");
  const jar = new Map<string, string>();
  const ssr = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (l) => { for (const c of l) jar.set(c.name, c.value); },
    },
  });
  await ssr.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

const text = (html: string) => html.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

function reactBroken(html: string): string | null {
  for (const p of ["Element type is invalid", "Cannot read properties of undefined",
                   "Application error: a server-side exception", "Objects are not valid as a React child"]) {
    if (html.includes(p)) return p;
  }
  return null;
}

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE RUNTIME — EXPORT ET TÉLÉCHARGEMENT ZIP (lot 16)");
  console.log("═".repeat(74) + "\n");

  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) { fail(`serveur de développement injoignable sur ${BASE}`); return; }
  ok(`serveur joignable sur ${BASE}`);

  const admin = createAdminClient();
  const year = currentAcademicYear();
  const school = await prisma.school.findFirst({ where: { onboardingCompleted: true }, select: { id: true, name: true } });
  if (!school) { fail("aucune école installée — le tableau de bord redirigerait vers /onboarding"); return; }

  const mk = async (role: string, tag: string) => {
    const email = `${TAG.toLowerCase()}.${tag}.${Date.now()}@sonde.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error || !data.user) throw new Error(`création du compte ${tag} : ${error?.message}`);
    trash.authIds.push(data.user.id);
    await prisma.user.create({ data: { id: data.user.id, email, firstName: `${TAG}-${tag}`, lastName: "Sonde", role: role as never, schoolId: school.id } });
    trash.userIds.push(data.user.id);
    return { id: data.user.id, email };
  };

  const direction = await mk("OWNER", "direction");
  const prof = await mk("TEACHER", "prof");

  const sienne = await prisma.class.create({ data: { name: `${TAG} CM2`, cycle: "ELEMENTAIRE", schoolId: school.id, teacherId: prof.id }, select: { id: true } });
  const autre = await prisma.class.create({ data: { name: `${TAG} 6e`, cycle: "COLLEGE", schoolId: school.id }, select: { id: true } });
  trash.classIds.push(sienne.id, autre.id);

  const mkStudent = async (first: string, classId: string) => {
    const s = await prisma.student.create({ data: { firstName: `${TAG}${first}`, lastName: "Ndiaye", schoolId: school.id, status: "ENROLLED" }, select: { id: true } });
    trash.studentIds.push(s.id);
    await prisma.enrollment.create({ data: { studentId: s.id, classId, academicYear: year } });
    return s.id;
  };
  const eleve = await mkStudent("Aminata", sienne.id);
  const eleveHors = await mkStudent("Ousmane", autre.id);

  const mkReq = async (label: string, category: string) => {
    const r = await prisma.documentRequirement.create({
      data: { label: `${TAG} ${label}`, category: category as never, schoolId: school.id, classId: sienne.id },
      select: { id: true, category: true },
    });
    trash.reqIds.push(r.id);
    return r;
  };
  const rNaissance = await mkReq("Extrait de naissance", "IDENTITE");
  const rMedical = await mkReq("Certificat medical", "SANTE");
  // Une pièce PÉDAGOGIQUE : sans elle, l'export de l'enseignant serait vide et
  // la route répondrait 409 — comportement correct, mais qui ne prouverait rien
  // du filtrage par catégorie. C'est le premier passage de cette sonde qui l'a
  // montré : la fixture, pas le code, était en défaut.
  const rBulletin = await mkReq("Bulletin precedent", "SCOLARITE");
  await mkReq("Photo identite", "INSCRIPTION"); // jamais servie : reste manquante

  const supabase = createAdminClient();
  const mkDoc = async (req: { id: string; category: string }, label: string) => {
    const id = crypto.randomUUID();
    const path = storagePathFor(school.id, eleve, id, `${label}.pdf`);
    const body = Buffer.from(`%PDF-1.4\n${label}\n%%EOF\n`, "utf8");
    const r = await supabase.storage.from(BUCKET).upload(path, body, { contentType: "application/pdf", upsert: true });
    if (!r.error) trash.paths.push(path);
    await prisma.studentDocument.create({
      data: {
        id, studentId: eleve, requirementId: req.id, label: `${TAG} ${label}`, category: req.category as never,
        storagePath: path, fileName: `${label}.pdf`, mimeType: "application/pdf", sizeBytes: body.length,
        status: "VALIDATED", academicYear: year, uploadedById: direction.id, schoolId: school.id,
      },
    });
  };
  await mkDoc(rNaissance, "Extrait naissance");
  await mkDoc(rMedical, "Certificat medical");
  await mkDoc(rBulletin, "Bulletin");
  ok(`fixtures dans « ${school.name} » — 2 élèves, 4 exigences, 3 pièces réelles`);

  const dir = mkdtempSync(join(tmpdir(), "expzip-"));
  trash.dirs.push(dir);

  /* ═══════ 1. LES ÉCRANS RÉPONDENT ═══════ */
  console.log("\n═══ 1. RENDU DES ÉCRANS ═══\n");

  const cd = await cookieFor(direction.email);
  const get = async (path: string, cookie: string) => {
    const r = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
    const body = await r.text();
    return { status: r.status, html: body, text: text(body) };
  };

  const page = await get("/dashboard/students/export", cd);
  check(page.status === 200, `page de préparation → HTTP ${page.status}`);
  check(reactBroken(page.html) === null, "aucune erreur React", reactBroken(page.html) ?? undefined);
  check(page.text.includes("Préparation des dossiers") && page.text.includes("Classe"),
    "les sections de la page sont rendues");
  check(page.html.includes(`${TAG} CM2`), "les classes accessibles apparaissent");

  const withClass = await get(`/dashboard/students/export?class=${sienne.id}`, cd);
  check(withClass.status === 200, `page avec classe sélectionnée → HTTP ${withClass.status}`);
  check(reactBroken(withClass.html) === null, "aucune erreur React sur la vue par classe");
  check(withClass.html.includes(`${TAG}Aminata`), "les élèves de la classe sont rendus côté serveur");

  const dossier = await get(`/dashboard/students/${eleve}/dossier`, cd);
  check(dossier.status === 200 && dossier.text.includes("Exporter le dossier"),
    "le bouton « Exporter le dossier » est rendu dans le dossier élève");

  /* ═══════ 2. TÉLÉCHARGEMENT RÉEL DU ZIP ═══════ */
  console.log("\n═══ 2. TÉLÉCHARGEMENT PAR LA ROUTE RÉELLE ═══\n");

  const zipRes = await fetch(`${BASE}/dashboard/students/export/download?students=${eleve}`, {
    headers: { cookie: cd }, redirect: "manual",
  });
  check(zipRes.status === 200, `route d'export → HTTP ${zipRes.status}`);
  check(zipRes.headers.get("content-type") === "application/zip",
    `type de contenu : ${zipRes.headers.get("content-type")}`);
  const disp = zipRes.headers.get("content-disposition") ?? "";
  check(disp.includes("attachment") && disp.includes(year),
    `en-tête de téléchargement daté de l'année réelle : ${disp.slice(0, 70)}`);

  const bytes = new Uint8Array(await zipRes.arrayBuffer());
  const file = join(dir, "export.zip");
  writeFileSync(file, bytes);
  check(bytes.length > 100 && bytes[0] === 0x50 && bytes[1] === 0x4b,
    `${bytes.length} octets reçus, signature ZIP « PK » présente`);

  const inspect = (p: string) => JSON.parse(execFileSync("python3", ["-c", `
import json, zipfile
z = zipfile.ZipFile(${JSON.stringify(p)})
print(json.dumps({
  "bad": z.testzip(),
  "names": z.namelist(),
  "resume": z.read("RESUME.txt").decode("utf-8") if "RESUME.txt" in z.namelist() else None,
}))`], { encoding: "utf8" })) as { bad: string | null; names: string[]; resume: string | null };

  const z = inspect(file);
  check(z.bad === null, "le ZIP téléchargé par HTTP s'ouvre sans corruption (python zipfile)");
  check(z.names.some((n) => n.startsWith("01-Identité/")), "structure par rayons présente dans le fichier reçu");
  check(z.names.some((n) => n.startsWith("05-Santé/")), "la direction obtient bien la pièce de santé");
  check(z.resume !== null && z.resume.includes("Photo identite"),
    "le résumé joint liste la pièce jamais reçue");
  check(z.resume !== null && z.resume.includes("ne constitue pas une transmission"),
    "et rappelle que l'archive n'est pas une transmission officielle");

  /* ═══════ 3. LE PÉRIMÈTRE TIENT DANS LE FICHIER REÇU ═══════ */
  console.log("\n═══ 3. PÉRIMÈTRE ENSEIGNANT, DANS L'ARCHIVE ═══\n");

  const cp = await cookieFor(prof.email);
  const profZip = await fetch(`${BASE}/dashboard/students/export/download?students=${eleve}`, { headers: { cookie: cp }, redirect: "manual" });
  check(profZip.status === 200, `l'enseignant exporte SON élève → HTTP ${profZip.status}`);
  const pfile = join(dir, "prof.zip");
  writeFileSync(pfile, new Uint8Array(await profZip.arrayBuffer()));
  const zp = inspect(pfile);
  check(zp.bad === null, "son archive s'ouvre sans corruption");
  check(!zp.names.some((n) => n.startsWith("05-Santé/")),
    "aucune pièce de santé dans le ZIP réellement téléchargé par l'enseignant");
  check(!zp.names.some((n) => n.startsWith("01-Identité/")),
    "ni pièce d'identité : elle non plus n'est pas de son périmètre");
  check(zp.names.some((n) => n.startsWith("03-Scolarité/")),
    "mais bien la pièce pédagogique — le filtrage par catégorie tient dans le fichier reçu");
  check(zp.resume !== null && /CATÉGORIES NON INCLUSES/.test(zp.resume),
    "son résumé annonce les catégories écartées par ses droits, au lieu de les taire");

  const refused = await fetch(`${BASE}/dashboard/students/export/download?students=${eleveHors}`, { headers: { cookie: cp }, redirect: "manual" });
  check(refused.status === 404,
    `élève hors de ses classes → HTTP ${refused.status} (et non « accès refusé », qui confirmerait l'existence)`);

  const empty = await fetch(`${BASE}/dashboard/students/export/download?students=`, { headers: { cookie: cd }, redirect: "manual" });
  check(empty.status === 400, `aucune sélection → HTTP ${empty.status} avec un message clair`);

  // ⚠️ Cas d'erreur réel, découvert par cette sonde : un export dont AUCUNE pièce
  // n'est visible ne doit pas produire une archive vide qu'un tiers prendrait
  // pour un dossier. La route refuse, avec un message explicite.
  const nothing = await fetch(`${BASE}/dashboard/students/export/download?students=${eleveHors}`, { headers: { cookie: cd }, redirect: "manual" });
  check(nothing.status === 409, `dossier sans aucune pièce exportable → HTTP ${nothing.status}`);
  check((await nothing.text()).includes("aucune pièce"), "et un message compréhensible, pas un ZIP vide");

  const anon = await fetch(`${BASE}/dashboard/students/export/download?students=${eleve}`, { redirect: "manual" });
  check(anon.status !== 200, `sans session → HTTP ${anon.status}, aucune archive`);

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
}

main()
  .catch((e) => { console.error(e); failures++; })
  .finally(async () => {
    try {
      const admin = createAdminClient();
      if (trash.paths.length) await admin.storage.from(BUCKET).remove(trash.paths);
      for (const d of trash.dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } }
      await prisma.auditLog.deleteMany({ where: { OR: [{ entityId: { in: trash.studentIds } }, { userId: { in: trash.userIds } }] } });
      await prisma.studentDocument.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      await prisma.documentRequirement.deleteMany({ where: { id: { in: trash.reqIds } } });
      await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
      for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
      const left = await prisma.student.count({ where: { firstName: { startsWith: TAG } } });
      console.log(left === 0 ? "  ✓ comptes, fixtures et fichiers de sonde supprimés\n" : `  ✗ ${left} résidu(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
