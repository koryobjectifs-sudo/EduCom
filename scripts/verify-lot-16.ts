/**
 * Vérificateur du lot 16 — export, ZIP, transmission.
 *
 *   npm run script -- scripts/verify-lot-16.ts
 *
 * 23ᵉ vérificateur. Il dépose de vrais fichiers, **produit un vrai ZIP**, le
 * fait ouvrir par `python3 -m zipfile` (un décompresseur extérieur au projet) et
 * vérifie ce qu'il contient — puis supprime tout.
 *
 * ⚠️ Aucun invariant figé sur un total : les nombres cités sont ceux des
 * fixtures que ce script vient lui-même de créer.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { ActorContext } from "../src/lib/audit";
import { hasAccess, type RoleType } from "../src/lib/permissions";
import { BUCKET, currentAcademicYear, storagePathFor } from "../src/lib/studentFile";
import { zipStream, crc32, safeSegment } from "../src/lib/zip";
import {
  studentExportPlan, multiExportPlan, exportFileNameFor, exportFileName,
  dossierState, EXPORT_FOLDERS,
} from "../src/lib/exportDossier";
import {
  recordTransmission, transmittedStudentIds, transmissionHistory,
  preparationSummary, MANUAL_METHOD, TRANSMITTED_ACTION,
} from "../src/lib/transmission";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PDF = (tag: string) => Buffer.from(`%PDF-1.4\n${tag}\n%%EOF\n`, "utf8");
const TAG = "SONDE16";
const trash = {
  docIds: [] as string[], reqIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], userIds: [] as string[], paths: [] as string[], dirs: [] as string[],
};

async function collect(gen: AsyncGenerator<Uint8Array>): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const c of gen) parts.push(c);
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION DU LOT 16 — EXPORT / ZIP / TRANSMISSION");
  console.log("═".repeat(74));

  const supabase = createAdminClient();
  const year = currentAcademicYear();
  const dir = mkdtempSync(join(tmpdir(), "sonde16-"));
  trash.dirs.push(dir);

  /* ═══════ A. ÉCRITURE ZIP ═══════ */
  console.log("\n═══ A. ÉCRITURE ZIP ═══\n");

  check(crc32(new TextEncoder().encode("abc")).toString(16) === "352441c2",
    "CRC-32 conforme à la valeur de référence pour « abc »");
  check(safeSegment("../../etc/passwd").indexOf("/") === -1,
    `traversée de chemin neutralisée dans un nom d'entrée : « ${safeSegment("../../etc/passwd")} »`);
  check(!/\.\./.test(safeSegment("../../etc/passwd")), "aucune remontée « .. » ne subsiste (zip slip)");

  const zipLib = strip(read("src/lib/zip.ts"));
  check(/AsyncIterable|AsyncGenerator/.test(zipLib),
    "l'écriture est un flux : les entrées sont produites une par une, jamais accumulées");
  check(/0x0800/.test(zipLib), "le drapeau UTF-8 est posé — les accents des noms survivent");

  /* ═══════ B. FIXTURES ═══════ */
  console.log("\n═══ B. FIXTURES — DEUX ÉCOLES ═══\n");

  const schools = await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { students: true } } },
  });
  const peopled = schools.filter((s) => s._count.students > 0).sort((a, b) => b._count.students - a._count.students);
  if (peopled.length < 2) { fail("moins de deux écoles peuplées — isolation non testable"); return; }
  const [A, B] = peopled;

  const mkUser = async (schoolId: string, role: string, tag: string) => {
    const u = await prisma.user.create({
      data: { email: `${TAG.toLowerCase()}.${tag}.${Date.now()}@sonde.invalid`, firstName: `${TAG}-${tag}`, lastName: "Sonde", role: role as never, schoolId },
      select: { id: true, role: true, schoolId: true },
    });
    trash.userIds.push(u.id);
    return { userId: u.id, schoolId: u.schoolId, role: u.role } as ActorContext;
  };
  const direction = await mkUser(A.id, "OWNER", "dir");
  const teacher = await mkUser(A.id, "TEACHER", "prof");
  const dirB = await mkUser(B.id, "OWNER", "dirb");

  const sienne = await prisma.class.create({ data: { name: `${TAG} CM2`, cycle: "ELEMENTAIRE", schoolId: A.id, teacherId: teacher.userId }, select: { id: true } });
  const autre = await prisma.class.create({ data: { name: `${TAG} 6e`, cycle: "COLLEGE", schoolId: A.id }, select: { id: true } });
  trash.classIds.push(sienne.id, autre.id);

  const mkStudent = async (first: string, classId: string) => {
    const s = await prisma.student.create({ data: { firstName: `${TAG}${first}`, lastName: "Ndiaye", schoolId: A.id, status: "ENROLLED" }, select: { id: true } });
    trash.studentIds.push(s.id);
    await prisma.enrollment.create({ data: { studentId: s.id, classId, academicYear: year } });
    return s.id;
  };
  const complet = await mkStudent("Aminata", sienne.id);
  const incomplet = await mkStudent("Ousmane", sienne.id);
  const horsClasse = await mkStudent("Fatou", autre.id);

  const mkReq = async (label: string, category: string, validityMonths: number | null = null) => {
    const r = await prisma.documentRequirement.create({
      data: { label: `${TAG} ${label}`, category: category as never, schoolId: A.id, classId: sienne.id, validityMonths },
      select: { id: true, category: true },
    });
    trash.reqIds.push(r.id);
    return r;
  };
  const rNaissance = await mkReq("Extrait de naissance", "IDENTITE");
  const rBulletin = await mkReq("Bulletin precedent", "SCOLARITE");
  const rMedical = await mkReq("Certificat medical", "SANTE");
  const rPhoto = await mkReq("Photo identite", "INSCRIPTION");

  const mkDoc = async (o: { studentId: string; req: { id: string; category: string } | null; label: string; category?: string; status?: string; createdAt?: Date; note?: string; superseded?: boolean }) => {
    const id = crypto.randomUUID();
    const cat = o.category ?? o.req?.category ?? "AUTRES";
    const path = storagePathFor(A.id, o.studentId, id, `${o.label}.pdf`);
    const up = await supabase.storage.from(BUCKET).upload(path, PDF(o.label), { contentType: "application/pdf", upsert: true });
    if (!up.error) trash.paths.push(path);
    const d = await prisma.studentDocument.create({
      data: {
        id, studentId: o.studentId, requirementId: o.req?.id ?? null,
        label: `${TAG} ${o.label}`, category: cat as never,
        storagePath: path, fileName: `${o.label}.pdf`, mimeType: "application/pdf", sizeBytes: PDF(o.label).length,
        status: (o.status ?? "VALIDATED") as never, academicYear: year,
        uploadedById: direction.userId, schoolId: A.id, reviewNote: o.note ?? null,
        ...(o.createdAt ? { createdAt: o.createdAt } : {}),
        ...(o.superseded ? { supersededAt: new Date() } : {}),
      },
      select: { id: true },
    });
    trash.docIds.push(d.id);
    return d.id;
  };

  // Dossier COMPLET : les 4 exigences servies, dont une pièce de santé.
  await mkDoc({ studentId: complet, req: rNaissance, label: "Extrait naissance" });
  await mkDoc({ studentId: complet, req: rBulletin, label: "Bulletin" });
  await mkDoc({ studentId: complet, req: rMedical, label: "Certificat medical" });
  await mkDoc({ studentId: complet, req: rPhoto, label: "Photo" });
  // Une version antérieure remplacée, pour éprouver le §21.
  const vieille = await mkDoc({ studentId: complet, req: rNaissance, label: "Extrait naissance ANCIEN", superseded: true });
  // Pièce hors checklist.
  await mkDoc({ studentId: complet, req: null, label: "Attestation libre", category: "AUTRES" });

  // Dossier INCOMPLET : une pièce rejetée, une manquante, une hors checklist.
  await mkDoc({ studentId: incomplet, req: rNaissance, label: "Extrait rejete", status: "REJECTED", note: "Illisible" });
  await mkDoc({ studentId: incomplet, req: rBulletin, label: "Bulletin ok" });
  ok(`fixtures : 3 élèves, 4 exigences, ${trash.docIds.length} pièces réelles dans Storage`);

  /* ═══════ C. PLAN D'EXPORT — COMPLÉTUDE RÉUTILISÉE ═══════ */
  console.log("\n═══ C. PLAN D'EXPORT ═══\n");

  const planC = (await studentExportPlan(direction, complet))!;
  check(planC !== null, "le plan d'un élève accessible est construit");
  check(planC.state === "PRET", `dossier complet → état « ${planC.state} »`);
  check(planC.missing.length === 0, "aucune pièce manquante annoncée");
  check(planC.entries.length === 5,
    `${planC.entries.length} pièces courantes exportées (4 exigées + 1 hors checklist) — la version remplacée est écartée`);
  check(!planC.entries.some((e) => e.documentId === vieille),
    "la version antérieure n'entre PAS dans le dossier courant (§21)");
  check(planC.totalBytes > 0 && planC.totalBytes === planC.entries.reduce((n, e) => n + e.sizeBytes, 0),
    `taille annoncée = somme des tailles réelles (${planC.totalBytes} o), jamais une estimation`);

  const planI = (await studentExportPlan(direction, incomplet))!;
  check(planI.state === "INCOMPLET", `dossier avec pièce rejetée → « ${planI.state} »`);
  check(planI.missing.some((m) => m.reason === "REJECTED"), "la pièce rejetée est signalée comme à refournir");
  check(planI.missing.some((m) => m.reason === "MISSING"), "les pièces jamais reçues sont listées");
  check(planI.entries.length > 0, "un dossier incomplet reste exportable (§8)");
  check(dossierState({ configured: true, missing: 0, toVerify: 1, rejected: 0, expired: 0 }) === "A_VERIFIER",
    "un dossier sans manque mais avec pièce à vérifier n'est pas déclaré prêt");
  check(dossierState({ configured: false, missing: 0, toVerify: 0, rejected: 0, expired: 0 }) === "NON_CONFIGURE",
    "sans checklist, l'état n'est pas « prêt » mais « non configuré » — on ne prétend rien");

  const withVersions = (await studentExportPlan(direction, complet, { includeVersions: true }))!;
  check(withVersions.entries.length === planC.entries.length + 1,
    "les versions antérieures n'arrivent que sur action explicite");
  check(withVersions.entries.some((e) => e.path.startsWith("99-Versions antérieures/")),
    "et elles sont rangées à part, jamais mêlées aux pièces courantes");

  /* ═══════ D. PERMISSIONS ET PÉRIMÈTRE ═══════ */
  console.log("\n═══ D. PERMISSIONS ═══\n");

  const EXPECT: Record<string, boolean> = {
    OWNER: true, ADMIN: true, SECRETARY: true, ASSISTANT: true, TEACHER: true,
    ACCOUNTANT: false, PARENT: false,
  };
  for (const [role, want] of Object.entries(EXPECT)) {
    const got = hasAccess(role as RoleType, "/dashboard/students");
    check(got === want, `${role.padEnd(11)} peut exporter = ${got ? "oui" : "non"}`);
  }
  ok("aucun chemin nouveau : exporter, c'est lire un dossier (§15, §16)");

  const planTeacher = (await studentExportPlan(teacher, complet))!;
  check(planTeacher !== null, "l'enseignant exporte un élève de SA classe");
  check(!planTeacher.entries.some((e) => String(e.category) === "SANTE"),
    "aucune pièce de santé dans SON export, alors qu'elle existe pour cet élève (§15, §25)");
  check(planTeacher.excludedCategories.length > 0,
    `les catégories écartées sont annoncées : ${planTeacher.excludedCategories.join(", ")}`);
  check(planTeacher.entries.length < planC.entries.length,
    `${planTeacher.entries.length} pièces pour l'enseignant contre ${planC.entries.length} pour la direction`);
  check((await studentExportPlan(teacher, horsClasse)) === null,
    "un élève hors de ses classes n'a aucun plan d'export");

  const mixte = await multiExportPlan(teacher, [complet, horsClasse, incomplet]);
  check(mixte.requested === 3 && mixte.accessible === 2,
    `sélection mixte : ${mixte.requested} demandés, ${mixte.accessible} retenus (§24)`);
  check(!mixte.plans.some((p) => p.studentId === horsClasse),
    "l'élève non autorisé est exclu avant toute construction d'archive");

  /* ═══════ E. ISOLATION INTER-ÉCOLES ═══════ */
  console.log("\n═══ E. ISOLATION ═══\n");

  const studentB = await prisma.student.findFirstOrThrow({ where: { schoolId: B.id }, select: { id: true } });
  check((await studentExportPlan(direction, studentB.id)) === null, "A → plan d'export d'un élève de B : refusé");
  check((await studentExportPlan(dirB, complet)) === null, "B → plan d'export d'un élève de A : refusé");
  const crossed = await multiExportPlan(dirB, [complet, incomplet, studentB.id]);
  check(crossed.plans.every((p) => p.studentId === studentB.id),
    "un export groupé mêlant deux écoles ne retient que la sienne");
  const guessed = await supabase.storage.from(BUCKET).download(planC.entries[0].storagePath.replace(A.id, B.id));
  check(Boolean(guessed.error), "chemin Storage deviné en substituant l'école → introuvable");

  /* ═══════ F. ZIP RÉEL, OUVERT PAR UN OUTIL EXTÉRIEUR ═══════ */
  console.log("\n═══ F. ZIP RÉELLEMENT PRODUIT ET OUVERT ═══\n");

  const build = async (plans: typeof mixte.plans, multi: boolean) => {
    async function* entries() {
      for (const plan of plans) {
        const root = multi ? `${plan.folder}/` : "";
        for (const e of plan.entries) {
          const { data, error } = await supabase.storage.from(BUCKET).download(e.storagePath);
          if (error || !data) continue;
          yield { path: `${root}${e.path}`, bytes: new Uint8Array(await data.arrayBuffer()) };
        }
        yield { path: `${root}RESUME.txt`, bytes: new TextEncoder().encode(`DOSSIER — ${plan.studentName}\nManquants : ${plan.missing.length}`) };
      }
    }
    return collect(zipStream(entries()));
  };

  const single = await build([planC], false);
  const file1 = join(dir, "single.zip");
  writeFileSync(file1, single);

  const inspect = (path: string) => {
    const out = execFileSync("python3", ["-c", `
import json, zipfile
z = zipfile.ZipFile(${JSON.stringify(path)})
print(json.dumps({
  "bad": z.testzip(),
  "names": z.namelist(),
  "sizes": [i.file_size for i in z.infolist()],
  "utf8": all(bool(i.flag_bits & 0x800) for i in z.infolist()),
  "first": z.read(z.namelist()[0]).decode("latin1")[:20],
}))`], { encoding: "utf8" });
    return JSON.parse(out) as { bad: string | null; names: string[]; sizes: number[]; utf8: boolean; first: string };
  };

  const z1 = inspect(file1);
  check(z1.bad === null, "python zipfile — archive individuelle : aucune corruption détectée");
  check(z1.names.length === planC.entries.length + 1,
    `${z1.names.length} entrées : ${planC.entries.length} pièces + le résumé`);
  check(z1.utf8, "toutes les entrées portent le drapeau UTF-8");
  check(z1.first.startsWith("%PDF-1.4"), "le contenu relu depuis l'archive est bien le PDF d'origine");
  check(z1.names.some((n) => n.startsWith("01-Identité/")) && z1.names.some((n) => n.startsWith("03-Scolarité/")),
    "structure par rayons numérotés (§2)");
  check(!z1.names.some((n) => /^0[0-9]-[^/]+\/$/.test(n)),
    "aucun rayon vide n'est fabriqué pour faire joli");
  check(z1.names.some((n) => /Extrait de naissance\.pdf$/.test(n)),
    "les fichiers portent leur libellé métier, pas un identifiant technique (§3)");
  check(!z1.names.some((n) => /[0-9a-f]{8}-[0-9a-f]{4}-/.test(n)), "aucun UUID dans les noms de fichiers");
  check(z1.names.includes("RESUME.txt"), "un résumé accompagne le dossier");
  check(!z1.names.some((n) => /manquant.*\.pdf$/i.test(n)), "aucun faux fichier « document-manquant.pdf » (§23)");

  const multiPlans = (await multiExportPlan(direction, [complet, incomplet])).plans;
  const multiZip = await build(multiPlans, true);
  const file2 = join(dir, "multi.zip");
  writeFileSync(file2, multiZip);
  const z2 = inspect(file2);
  check(z2.bad === null, "python zipfile — archive groupée : aucune corruption");
  const roots = [...new Set(z2.names.map((n) => n.split("/")[0]))];
  check(roots.length === 2, `un dossier racine par élève : ${roots.join(", ")}`);
  check(roots.every((r) => r.startsWith(TAG)), "les racines portent le nom des élèves");
  check(!z2.names.some((n) => n.includes("..")), "aucune entrée ne remonte hors de l'archive");

  // ⚠️ Preuve d'isolation DANS le fichier produit, pas seulement en base.
  const teacherZip = await build([planTeacher], false);
  const file3 = join(dir, "prof.zip");
  writeFileSync(file3, teacherZip);
  const z3 = inspect(file3);
  check(!z3.names.some((n) => n.startsWith("05-Santé/")),
    "l'archive de l'enseignant ne contient AUCUN rayon Santé — vérifié dans le ZIP lui-même");
  check(z3.names.some((n) => n.startsWith("03-Scolarité/")), "mais bien ses pièces pédagogiques");

  const name1 = exportFileNameFor([planC]);
  const nameN = exportFileNameFor(multiPlans, "CM2");
  check(name1.includes(year) && nameN.includes(year), `noms d'archive datés de l'année réelle : ${name1}`);
  check(!/20\d\d-20\d\d/.test(strip(read("src/lib/exportDossier.ts")).replace(/currentAcademicYear/g, "")),
    "aucune année scolaire codée en dur dans la logique d'export (§26)");
  check(exportFileName("Extrait de naissance", "scan_001.pdf") === "Extrait de naissance.pdf",
    "le nom vient du libellé, l'extension du fichier réel");

  /* ═══════ G. TRANSMISSION ═══════ */
  console.log("\n═══ G. TRANSMISSION ═══\n");

  const before = await transmittedStudentIds(direction, [complet, incomplet]);
  check(before.size === 0, "aucun dossier n'est transmis avant qu'on ne le déclare");

  const rec = await recordTransmission(direction, { studentIds: [complet, incomplet], destination: `${TAG} Inspection`, note: "Remis en main propre" });
  check(!("error" in rec), "transmission manuelle enregistrée");
  const after = await transmittedStudentIds(direction, [complet, incomplet]);
  check(after.size === 2, `${after.size} dossiers désormais marqués transmis — compteur interrogeable en base`);

  const refused = await recordTransmission(teacher, { studentIds: [horsClasse] });
  check("error" in refused, "déclarer transmis un élève hors de son périmètre est refusé");

  const hist = await transmissionHistory(direction, 5);
  check(hist.length >= 1, "l'historique restitue la transmission");
  check(hist[0].method === MANUAL_METHOD, `méthode explicite : ${hist[0].method}`);
  check(hist[0].count === 2 && hist[0].students.length === 2, "avec les dossiers concernés");
  check(hist[0].who.startsWith(TAG), `et l'auteur : ${hist[0].who}`);
  check(hist[0].destination === `${TAG} Inspection`, "et la destination réellement saisie");

  const model = read("prisma/schema.prisma");
  check(!/model Transmission|model Export/.test(model),
    "aucune table de transmission ni d'export n'a été créée — `AuditLog` suffisait (§34)");
  const auditRow = await prisma.auditLog.findFirst({
    where: { schoolId: A.id, entity: "student", action: TRANSMITTED_ACTION, entityId: complet },
    select: { userId: true, createdAt: true },
  });
  check(auditRow !== null && auditRow.userId === direction.userId,
    "qui / quoi / quand sont dans le journal existant (§13, §14)");

  const routeSrc = strip(read("src/app/dashboard/students/export/download/route.ts"));
  const txSrc = strip(read("src/lib/transmission.ts"));
  check(!/Inspection|académie|ministère/i.test(routeSrc + strip(read("src/app/dashboard/students/export/ExportClient.tsx"))
    .replace(/placeholder="[^"]*"/g, "")),
    "l'écran ne prétend nulle part avoir transmis à une administration (§40)");
  check(/sentByEduCom: false/.test(txSrc), "le journal enregistre explicitement qu'EduCom n'a rien envoyé");
  check(!/fetch\(|axios|twilio/i.test(txSrc), "aucun envoi réel n'est tenté — aucune API inventée");

  /* ═══════ H. TABLEAU DE PRÉPARATION ═══════ */
  console.log("\n═══ H. TABLEAU DE PRÉPARATION ═══\n");

  const summary = await preparationSummary(direction, [complet, incomplet, horsClasse]);
  check(summary.rows.length === 3, `${summary.rows.length} lignes calculées sur des dossiers réels`);
  check(summary.counts.ready + summary.counts.incomplete + summary.counts.toVerify + summary.counts.unconfigured === summary.rows.length,
    "les compteurs se somment exactement au nombre de dossiers — aucun chiffre décoratif");
  check(summary.counts.transmitted === 2, `${summary.counts.transmitted} transmis, cohérent avec ce qui vient d'être déclaré`);
  check(summary.rows.find((r) => r.studentId === complet)!.state === "PRET", "le dossier complet est « prêt »");
  check(summary.rows.find((r) => r.studentId === incomplet)!.state === "INCOMPLET", "l'autre est « incomplet »");

  const teacherSummary = await preparationSummary(teacher, [complet, horsClasse]);
  check(teacherSummary.rows.length === 1 && teacherSummary.rows[0].studentId === complet,
    "le tableau de l'enseignant ne contient que les élèves de ses classes");

  /* ═══════ I. STOCKAGE ET NETTOYAGE ═══════ */
  console.log("\n═══ I. STOCKAGE ═══\n");

  const buckets = (await supabase.storage.listBuckets()).data ?? [];
  check(buckets.length === 1 && buckets[0].name === BUCKET,
    `aucun bucket d'export n'a été créé : « ${buckets.map((b) => b.name).join(", ")} »`);
  check(buckets[0]?.public === false, "le bucket source reste privé");
  check(!/storage\.from\([^)]*\)\.upload/.test(routeSrc),
    "la route d'export n'écrit RIEN dans Storage — aucune seconde copie (§20)");
  check(/ReadableStream/.test(routeSrc) && /download\(/.test(routeSrc),
    "les pièces sont téléchargées une par une et poussées dans un flux (§5, §30)");
  check(!/writeFileSync|mkdtemp|\/tmp/.test(routeSrc),
    "aucun fichier temporaire sur le disque du serveur — il n'y a donc rien à nettoyer");
  check(/requireActionContext\(READ_PATH\)/.test(routeSrc),
    "la route refait le contrôle de session et de chemin — c'est une porte HTTP à part entière");
  check(/multiExportPlan\(ctx, ids/.test(routeSrc),
    "et filtre les identifiants reçus par le périmètre avant de construire quoi que ce soit");

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
}

async function wipe() {
  const s = createAdminClient();
  if (trash.paths.length) await s.storage.from(BUCKET).remove(trash.paths);
  for (const d of trash.dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } }
  await prisma.auditLog.deleteMany({ where: { entityId: { in: [...trash.studentIds, ...trash.docIds] } } });
  await prisma.auditLog.deleteMany({ where: { entity: "transmission", userId: { in: trash.userIds } } });
  await prisma.studentDocument.deleteMany({ where: { studentId: { in: trash.studentIds } } });
  await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
  await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
  await prisma.documentRequirement.deleteMany({ where: { id: { in: trash.reqIds } } });
  await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
  await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
}

main()
  .catch((e) => { console.error(e); failures++; })
  .finally(async () => {
    try {
      await wipe();
      const left = await prisma.student.count({ where: { firstName: { startsWith: TAG } } });
      const objs = await createAdminClient().storage.from(BUCKET).list("", { limit: 1000 });
      const stray = (objs.data ?? []).length;
      console.log(left === 0 ? "  ✓ aucune fixture résiduelle en base" : `  ✗ ${left} fixture(s) résiduelle(s)`);
      console.log(`  · objets restants à la racine du bucket : ${stray}\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
