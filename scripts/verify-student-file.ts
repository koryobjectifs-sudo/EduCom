/**
 * Vérificateur du lot 13 — dossier numérique élève.
 *
 *   npm run script -- scripts/verify-student-file.ts
 *
 * 17ᵉ vérificateur. Il **envoie de vrais fichiers** dans Supabase Storage,
 * éprouve dépôt / remplacement / validation / rejet / téléchargement /
 * complétude / isolation, puis **nettoie intégralement** — objets du bucket et
 * lignes en base. Le script est sans effet net.
 *
 * ⚠️ Aucun invariant n'est figé sur un TOTAL (nombre de modèles, de fichiers, de
 * permissions ou de contrôles) : la règle posée au lot 12.2 après trois
 * occurrences du piège. Les invariants sont nommés.
 */
import { readFileSync, existsSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { createAdminClient } from "../src/lib/supabase/admin";
import { hasAccess, RoleType } from "../src/lib/permissions";
import {
  BUCKET, checkFile, sanitizeFileName, storagePathFor, studentFile, resolveStudentKind,
  currentAcademicYear, MAX_BYTES, ALLOWED_MIME,
} from "../src/lib/studentFile";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Un PDF minimal mais réel — en-tête et EOF valides. */
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "utf8");
const PDF2 = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Version 2>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "utf8");

/** Tout ce qui a été créé, pour un nettoyage garanti même en cas d'échec. */
const cleanup = { paths: [] as string[], docIds: [] as string[], reqIds: [] as string[] };

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION DU LOT 13 — DOSSIER NUMÉRIQUE ÉLÈVE");
  console.log("═".repeat(74));

  const supabase = createAdminClient();

  /* ═══════ A. INFRASTRUCTURE STORAGE ═══════ */
  console.log("\n═══ A. INFRASTRUCTURE STORAGE ═══\n");

  const buckets = await supabase.storage.listBuckets();
  check(!buckets.error, "l'API Storage répond avec la clé service-role", buckets.error?.message);
  const b = buckets.data?.find((x) => x.name === BUCKET);
  check(Boolean(b), `le bucket « ${BUCKET} » existe`);
  check(b?.public === false, "le bucket est PRIVÉ — aucune URL publique permanente");
  check(b?.file_size_limit === MAX_BYTES, `limite de taille appliquée au bucket : ${b?.file_size_limit} o`);
  const mimes = (b as unknown as { allowed_mime_types?: string[] })?.allowed_mime_types ?? [];
  check(mimes.length > 0 && mimes.every((m) => m in ALLOWED_MIME),
    `types MIME restreints au niveau du bucket (${mimes.length}) — second verrou après la validation applicative`);

  const lib = strip(read("src/lib/studentFile.ts"));
  check(!/getPublicUrl/.test(lib), "aucun appel à getPublicUrl() — jamais d'URL publique pour une pièce d'élève");
  check(/createSignedUrl/.test(lib), "le téléchargement passe par une URL signée temporaire");
  check(!/base64|toDataURL|readAsDataURL/i.test(lib), "aucun base64 : le binaire ne transite pas par la base");

  /* ═══════ B. PERMISSIONS — AUCUNE MATRICE PARALLÈLE ═══════ */
  console.log("\n═══ B. PERMISSIONS (chemins existants uniquement) ═══\n");

  const actions = strip(read("src/app/dashboard/students/[id]/dossier/actions.ts"));
  check(!/ROLE_PERMISSIONS|ROLE_DENIALS/.test(actions), "les actions ne relisent aucune table de permissions");
  check(!/"(OWNER|ADMIN|SECRETARY|TEACHER|ASSISTANT|PARENT|ACCOUNTANT)"/.test(actions),
    "aucun rôle n'est cité en dur dans les actions du dossier");
  check(/requireActionContext\(READ_PATH\)/.test(actions), "dépôt/téléchargement exigent /dashboard/students");
  check(/requireActionContext\(REVIEW_PATH\)/.test(actions), "validation/rejet exigent /dashboard/documents/validation");

  const EXPECT: Record<string, { read: boolean; review: boolean }> = {
    OWNER: { read: true, review: true }, ADMIN: { read: true, review: true },
    SECRETARY: { read: true, review: true }, ASSISTANT: { read: true, review: false },
    TEACHER: { read: true, review: false }, ACCOUNTANT: { read: false, review: false },
    PARENT: { read: false, review: false },
  };
  for (const [role, e] of Object.entries(EXPECT)) {
    const r = hasAccess(role as RoleType, "/dashboard/students");
    const v = hasAccess(role as RoleType, "/dashboard/documents/validation");
    check(r === e.read && v === e.review,
      `${role.padEnd(11)} consulter/déposer=${r ? "oui" : "non"} valider=${v ? "oui" : "non"}`);
  }
  ok("séparation des pouvoirs : TEACHER et ASSISTANT déposent mais ne valident pas");

  /* ═══════ C. VALIDATION DES FICHIERS ═══════ */
  console.log("\n═══ C. LIMITES DE FICHIER (point 15) ═══\n");

  check(checkFile("application/pdf", "acte.pdf", 1024).ok, "PDF cohérent accepté");
  check(!checkFile("application/x-msdownload", "virus.exe", 1024).ok, "exécutable refusé (MIME hors liste blanche)");
  check(!checkFile("application/pdf", "virus.exe", 1024).ok,
    "PDF annoncé mais extension .exe → refusé (cohérence MIME/extension)");
  check(!checkFile("application/x-msdownload", "faux.pdf", 1024).ok,
    "exécutable renommé .pdf → refusé sur le MIME, pas sur l'extension");
  check(!checkFile("application/pdf", "gros.pdf", MAX_BYTES + 1).ok, "fichier > 10 Mo refusé");
  check(!checkFile("application/pdf", "vide.pdf", 0).ok, "fichier vide refusé");
  check(sanitizeFileName("../../etc/passwd") === "passwd", "traversée de chemin neutralisée dans le nom");
  check(sanitizeFileName("Extrait de naissance.pdf") === "Extrait de naissance.pdf", "les accents et espaces sont conservés");

  /* ═══════ D. FIXTURES SUR DEUX ÉCOLES ═══════ */
  console.log("\n═══ D. ISOLATION — DEUX ÉCOLES RÉELLES ═══\n");

  const schools = await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { students: true } } },
  });
  const withStudents = schools.filter((s) => s._count.students > 0).sort((a, b) => b._count.students - a._count.students);
  if (withStudents.length < 2) { fail("moins de deux écoles peuplées — isolation non testable"); return; }
  const [A, B] = withStudents;

  const actorOf = async (schoolId: string) => {
    const u = await prisma.user.findFirst({ where: { schoolId, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, role: true } });
    return { userId: u?.id ?? "sonde", schoolId, role: (u?.role ?? "OWNER") as RoleType };
  };
  const actorA = await actorOf(A.id), actorB = await actorOf(B.id);

  const studentA = await prisma.student.findFirst({ where: { schoolId: A.id }, select: { id: true, firstName: true } });
  const studentB = await prisma.student.findFirst({ where: { schoolId: B.id }, select: { id: true, firstName: true } });
  if (!studentA || !studentB) { fail("élève introuvable dans l'une des écoles"); return; }
  ok(`écoles de test : « ${A.name} » et « ${B.name} »`);

  /* ═══════ E. CHECKLIST : ABSENTE PUIS CONFIGURÉE ═══════ */
  console.log("\n═══ E. CHECKLIST — ABSENTE PUIS CONFIGURÉE ═══\n");

  const before = await studentFile(actorA, studentA.id);
  check(before !== null, "le dossier d'un élève de son école est lisible");
  if (before && !before.completeness.configured) {
    check(before.completeness.percent === null,
      "sans checklist → pourcentage null, JAMAIS 0 % (c'est la règle qui manque, pas les pièces)");
  } else {
    ok(`une checklist existe déjà (${before?.completeness.required} exigence(s)) — cas « absente » non rejouable`);
  }

  const reqA = await prisma.documentRequirement.create({
    data: { label: "SONDE — Extrait de naissance", category: "IDENTITE", schoolId: A.id, position: 999 },
  });
  cleanup.reqIds.push(reqA.id);
  const reqA2 = await prisma.documentRequirement.create({
    data: { label: "SONDE — Certificat médical", category: "SANTE", schoolId: A.id, position: 1000, validityMonths: 12 },
  });
  cleanup.reqIds.push(reqA2.id);
  ok("2 exigences de sonde créées (aucune liste nationale codée : ce sont des libellés libres)");

  const reqB = await prisma.documentRequirement.create({
    data: { label: "SONDE B — Pièce école B", category: "AUTRES", schoolId: B.id, position: 999 },
  });
  cleanup.reqIds.push(reqB.id);

  const withList = await studentFile(actorA, studentA.id);
  check(withList!.completeness.configured, "checklist désormais configurée");
  check(withList!.completeness.percent !== null, `pourcentage calculé sur la checklist réelle (${withList!.completeness.percent} %)`);
  const sondeLines = withList!.lines.filter((l) => l.label.startsWith("SONDE"));
  check(sondeLines.length === 2, `les 2 exigences de sonde apparaissent dans le dossier (${sondeLines.length})`);
  check(sondeLines.every((l) => l.status === "MISSING" && l.document === null),
    "une pièce non reçue est MANQUANTE et n'a aucune ligne en base");

  // Isolation de la checklist.
  const fileB = await studentFile(actorB, studentB.id);
  check(!fileB!.lines.some((l) => l.requirementId === reqA.id || l.requirementId === reqA2.id),
    `« ${B.name} » ne voit aucune exigence de « ${A.name} »`);
  check(!withList!.lines.some((l) => l.requirementId === reqB.id),
    `« ${A.name} » ne voit aucune exigence de « ${B.name} »`);

  /* ═══════ F. DÉPÔT RÉEL ═══════ */
  console.log("\n═══ F. DÉPÔT D'UN VRAI FICHIER ═══\n");

  const docId = crypto.randomUUID();
  const pathA = storagePathFor(A.id, studentA.id, docId, "acte.pdf");
  cleanup.paths.push(pathA);

  const up = await supabase.storage.from(BUCKET).upload(pathA, PDF, { contentType: "application/pdf", upsert: false });
  check(!up.error, `fichier envoyé dans le bucket (${PDF.length} o)`, up.error?.message);
  check(pathA.startsWith(`${A.id}/${studentA.id}/`), "le chemin est cloisonné par école puis par élève");

  const doc = await prisma.studentDocument.create({
    data: {
      id: docId, studentId: studentA.id, requirementId: reqA.id, label: reqA.label, category: "IDENTITE",
      storagePath: pathA, fileName: "acte.pdf", mimeType: "application/pdf", sizeBytes: PDF.length,
      status: "TO_VERIFY", academicYear: currentAcademicYear(), uploadedById: actorA.userId, schoolId: A.id,
    },
  });
  cleanup.docIds.push(doc.id);

  const afterUpload = await studentFile(actorA, studentA.id);
  const line1 = afterUpload!.lines.find((l) => l.requirementId === reqA.id)!;
  check(line1.status === "TO_VERIFY" && line1.document !== null, "la pièce apparaît au dossier, à vérifier");
  check(afterUpload!.completeness.received >= 1, `complétude mise à jour : ${afterUpload!.completeness.received}/${afterUpload!.completeness.required}`);

  const dbDoc = await prisma.studentDocument.findUnique({ where: { id: doc.id }, select: { storagePath: true } });
  check(!/^data:|base64/.test(dbDoc?.storagePath ?? ""), "la base ne contient qu'un chemin, jamais le binaire");

  /* ═══════ G. TÉLÉCHARGEMENT ═══════ */
  console.log("\n═══ G. TÉLÉCHARGEMENT ═══\n");

  const signed = await supabase.storage.from(BUCKET).createSignedUrl(pathA, 60);
  check(!signed.error && Boolean(signed.data?.signedUrl), "URL signée créée");
  const fetched = await fetch(signed.data!.signedUrl);
  check(fetched.ok, `le fichier se télécharge réellement via l'URL signée (HTTP ${fetched.status})`);
  const body = Buffer.from(await fetched.arrayBuffer());
  check(body.equals(PDF), "le contenu téléchargé est identique à l'original");

  // Accès direct sans signature : doit échouer.
  const rawUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${pathA}`;
  const raw = await fetch(rawUrl);
  check(!raw.ok, `l'accès public direct est refusé (HTTP ${raw.status}) — deviner le chemin ne suffit pas`);

  /* ═══════ H. REMPLACEMENT ═══════ */
  console.log("\n═══ H. REMPLACEMENT — L'HISTORIQUE SURVIT ═══\n");

  const doc2Id = crypto.randomUUID();
  const path2 = storagePathFor(A.id, studentA.id, doc2Id, "acte-v2.pdf");
  cleanup.paths.push(path2);
  await supabase.storage.from(BUCKET).upload(path2, PDF2, { contentType: "application/pdf", upsert: false });

  await prisma.$transaction([
    prisma.studentDocument.create({
      data: {
        id: doc2Id, studentId: studentA.id, requirementId: reqA.id, label: reqA.label, category: "IDENTITE",
        storagePath: path2, fileName: "acte-v2.pdf", mimeType: "application/pdf", sizeBytes: PDF2.length,
        status: "TO_VERIFY", academicYear: currentAcademicYear(), uploadedById: actorA.userId, schoolId: A.id,
        supersedesId: doc.id,
      },
    }),
    prisma.studentDocument.updateMany({ where: { id: doc.id }, data: { supersededAt: new Date() } }),
  ]);
  cleanup.docIds.push(doc2Id);

  const old = await prisma.studentDocument.findUnique({ where: { id: doc.id }, select: { supersededAt: true, storagePath: true } });
  check(old?.supersededAt !== null, "l'ancienne version conserve sa ligne, marquée remplacée");
  const oldStill = await supabase.storage.from(BUCKET).createSignedUrl(old!.storagePath, 30);
  check(!oldStill.error, "le fichier remplacé reste dans le bucket — une trace de rejet doit rester vérifiable");

  const afterReplace = await studentFile(actorA, studentA.id);
  const line2 = afterReplace!.lines.find((l) => l.requirementId === reqA.id)!;
  check(line2.document?.id === doc2Id, "le dossier montre la version COURANTE");
  check(afterReplace!.lines.filter((l) => l.requirementId === reqA.id).length === 1,
    "la pièce n'apparaît qu'une fois, pas en double");
  check((line2.document?.previousVersions ?? 0) >= 1, `versions antérieures comptées : ${line2.document?.previousVersions}`);

  /* ═══════ I. VALIDATION / REJET ═══════ */
  console.log("\n═══ I. VALIDATION ET REJET ═══\n");

  await prisma.studentDocument.updateMany({
    where: { id: doc2Id, schoolId: A.id },
    data: { status: "REJECTED", reviewedById: actorA.userId, reviewedAt: new Date(), reviewNote: "Sonde — illisible" },
  });
  const rejected = await studentFile(actorA, studentA.id);
  const lr = rejected!.lines.find((l) => l.requirementId === reqA.id)!;
  check(lr.status === "REJECTED" && lr.document?.reviewNote === "Sonde — illisible",
    "rejet enregistré avec son motif, consultable au dossier");
  check(lr.document !== null, "une pièce rejetée reste au dossier — elle peut être remplacée sans repartir de zéro");

  await prisma.studentDocument.updateMany({
    where: { id: doc2Id, schoolId: A.id },
    data: { status: "VALIDATED", reviewNote: null },
  });
  const validated = await studentFile(actorA, studentA.id);
  check(validated!.completeness.validated >= 1, `complétude : ${validated!.completeness.validated} validée(s)`);

  /* ═══════ J. NOUVEL / ANCIEN ÉLÈVE ═══════ */
  console.log("\n═══ J. NOUVEL / ANCIEN ÉLÈVE ═══\n");

  const year = currentAcademicYear();
  check(resolveStudentKind({ kindOverride: null, enrollments: [{ academicYear: year }] }, year) === "NOUVEAU",
    "un élève inscrit seulement cette année est NOUVEAU (dérivé, non stocké)");
  check(resolveStudentKind({ kindOverride: null, enrollments: [{ academicYear: "2020-2021" }, { academicYear: year }] }, year) === "ANCIEN",
    "un élève ayant une inscription antérieure est ANCIEN (dérivé des inscriptions réelles)");
  check(resolveStudentKind({ kindOverride: "TRANSFERT", enrollments: [{ academicYear: year }] }, year) === "TRANSFERT",
    "TRANSFERT ne peut venir que d'une déclaration explicite — aucune donnée ne permet de le deviner");

  // Pièce d'une année antérieure → à mettre à jour, pas manquante.
  await prisma.studentDocument.updateMany({ where: { id: doc2Id }, data: { academicYear: "2020-2021" } });
  const aged = await studentFile(actorA, studentA.id);
  const la = aged!.lines.find((l) => l.requirementId === reqA.id)!;
  check(la.needsUpdate && la.status !== "MISSING",
    "une pièce d'une année antérieure est « à mettre à jour », PAS manquante — l'ancien ne recommence pas tout");

  /* ═══════ K. ISOLATION DES PIÈCES ═══════ */
  console.log("\n═══ K. ISOLATION DES PIÈCES ═══\n");

  const crossRead = await prisma.studentDocument.findFirst({
    where: { id: doc2Id, schoolId: B.id },
    select: { id: true },
  });
  check(crossRead === null, `la pièce de « ${A.name} » est introuvable sous le schoolId de « ${B.name} »`);

  const crossStudent = await studentFile(actorB, studentA.id);
  check(crossStudent === null,
    `un acteur de « ${B.name} » n'obtient AUCUN dossier pour un élève de « ${A.name} » (null, pas un dossier vide)`);

  const fileBAfter = await studentFile(actorB, studentB.id);
  check(!fileBAfter!.lines.some((l) => l.document?.id === doc2Id) && fileBAfter!.loose.every((d) => d.id !== doc2Id),
    "aucune pièce croisée entre les deux dossiers");

  /* ═══════ L. HISTORIQUE ═══════ */
  console.log("\n═══ L. HISTORIQUE — AUCUNE TABLE PARALLÈLE ═══\n");

  const models = read("prisma/schema.prisma");
  check(!/model StudentDocumentEvent|model DocumentHistory|model StudentDocumentLog/.test(models),
    "aucune table d'historique parallèle n'a été créée");
  check(/"studentDocument"/.test(read("src/lib/audit.ts")), "`studentDocument` est une entité auditable");
  for (const a of ["upload", "replace", "validate", "reject", "download"]) {
    check(actions.includes(`studentDocument.${a}`), `l'action « ${a} » est journalisée dans AuditLog`);
  }

  /* ═══════ NETTOYAGE ═══════ */
  console.log("\n═══ NETTOYAGE ═══\n");

  const rm = await supabase.storage.from(BUCKET).remove(cleanup.paths);
  check(!rm.error, `${cleanup.paths.length} objet(s) supprimé(s) du bucket`, rm.error?.message);
  const left = await supabase.storage.from(BUCKET).list(`${A.id}/${studentA.id}`);
  check((left.data?.length ?? 0) === 0 || !left.data?.some((f) => cleanup.paths.some((p) => p.endsWith(f.name))),
    "aucun fichier de sonde ne subsiste");

  await prisma.studentDocument.deleteMany({ where: { id: { in: cleanup.docIds } } });
  await prisma.documentRequirement.deleteMany({ where: { id: { in: cleanup.reqIds } } });
  const leftDocs = await prisma.studentDocument.count({ where: { id: { in: cleanup.docIds } } });
  const leftReqs = await prisma.documentRequirement.count({ where: { id: { in: cleanup.reqIds } } });
  check(leftDocs === 0 && leftReqs === 0, "lignes de sonde supprimées (documents et exigences)");

  const finalFile = await studentFile(actorA, studentA.id);
  check(!finalFile!.lines.some((l) => l.label.startsWith("SONDE")), "le dossier est revenu à son état initial");

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
  if (failures > 0) process.exit(1);
}

main()
  .catch(async (e) => {
    console.error(e);
    // Nettoyage même en cas d'échec : une sonde ne doit jamais laisser de traces.
    try {
      const s = createAdminClient();
      if (cleanup.paths.length) await s.storage.from(BUCKET).remove(cleanup.paths);
      await prisma.studentDocument.deleteMany({ where: { id: { in: cleanup.docIds } } });
      await prisma.documentRequirement.deleteMany({ where: { id: { in: cleanup.reqIds } } });
      console.log("  (nettoyage de secours effectué)");
    } catch { /* rien à faire de plus */ }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
