/**
 * Vérificateur du lot 13.1 — fermeture des réserves de l'audit du lot 13.
 *
 *   npm run script -- scripts/verify-lot-13-1.ts
 *
 * 18ᵉ vérificateur. Il éprouve les quatre réserves, sur des **fixtures créées
 * pour l'occasion** (école réelle, mais élèves, classes et comptes de sonde) :
 *
 *   réserve 2  expiration réellement calculée
 *   réserve 3  section « Documents manquants » exacte
 *   réserve 4  périmètre enseignant : classes ET catégories
 *   §5         périmètre parent
 *   §6         isolation inter-écoles, rejouée après correction
 *
 * ⚠️ Aucun invariant n'est figé sur un TOTAL. Les nombres qui apparaissent
 * ci-dessous sont ceux des fixtures que ce script vient lui-même de créer : ce
 * sont des faits qu'il contrôle, pas des constantes du dépôt.
 *
 * Le script est sans effet net : tout ce qu'il crée est supprimé à la fin, y
 * compris en cas d'échec.
 */
import { readFileSync, existsSync } from "node:fs";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { ActorContext } from "../src/lib/audit";
import {
  BUCKET, studentFile, signedUrlFor, expiryFor, effectiveStatus,
  storagePathFor, currentAcademicYear,
} from "../src/lib/studentFile";
import {
  canSeeStudent, canSeeCategory, canSeeHealthData, visibleCategories,
  TEACHER_DOC_CATEGORIES, teacherClassIds,
} from "../src/lib/studentScope";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "utf8");
const TAG = "SONDE131";

const cleanup = {
  paths: [] as string[], docIds: [] as string[], reqIds: [] as string[],
  enrollmentIds: [] as string[], studentIds: [] as string[], classIds: [] as string[], userIds: [] as string[],
};

const monthsAgo = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d; };

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION DU LOT 13.1 — FERMETURE DES RÉSERVES DU LOT 13");
  console.log("═".repeat(74));

  const supabase = createAdminClient();
  const year = currentAcademicYear();

  /* ═══════ A. RÉSERVE 2 — LE CALCUL D'EXPIRATION, FONCTION PURE ═══════ */
  console.log("\n═══ A. EXPIRATION — CALCUL DÉTERMINISTE ═══\n");

  check(expiryFor(new Date("2026-01-15T10:00:00Z"), null) === null,
    "sans durée de validité → aucune échéance (aucune durée n'est inventée)");
  check(expiryFor(new Date("2026-01-15T10:00:00Z"), 0) === null,
    "durée nulle ou négative → aucune échéance");

  const e12 = expiryFor(new Date("2026-01-15T10:00:00Z"), 12)!;
  check(e12.getFullYear() === 2027 && e12.getMonth() === 0 && e12.getDate() === 15,
    `12 mois après le 15/01/2026 → ${e12.toISOString().slice(0, 10)}`);

  // Le 31 janvier + 1 mois n'existe pas : `setMonth` déborderait au 3 mars.
  const eEdge = expiryFor(new Date(2026, 0, 31, 12), 1)!;
  check(eEdge.getMonth() === 1 && eEdge.getDate() === 28,
    `débordement de fin de mois ramené au dernier jour : 31/01 + 1 mois → ${eEdge.getDate()}/0${eEdge.getMonth() + 1}`);

  check(effectiveStatus("VALIDATED", null) === "VALIDATED", "sans échéance, le statut de contrôle est conservé");
  check(effectiveStatus("VALIDATED", monthsAgo(1)) === "EXPIRED", "échéance dépassée → EXPIRED, même si la pièce était validée");
  check(effectiveStatus("TO_VERIFY", new Date(Date.now() + 86400000)) === "TO_VERIFY", "échéance à venir → statut inchangé");
  check(effectiveStatus("REJECTED", monthsAgo(1)) === "REJECTED",
    "un rejet l'emporte sur une expiration — sinon le motif de rejet disparaîtrait de l'écran");

  const libFile = strip(read("src/lib/studentFile.ts"));
  const libScope = strip(read("src/lib/studentScope.ts"));
  const actionsSrc = strip(read("src/app/dashboard/students/[id]/dossier/actions.ts"));
  check(!/status:\s*"EXPIRED"/.test(libFile + actionsSrc),
    "`EXPIRED` n'est JAMAIS écrit dans la colonne `status` — il se dérive, il ne se stocke pas");
  check(/expiryFor\(receivedAt/.test(actionsSrc), "le dépôt calcule l'échéance depuis la règle de l'exigence");
  check(/expiryFor\(d\.createdAt, r\.validityMonths\)/.test(libFile),
    "la lecture recalcule l'échéance depuis la règle EN VIGUEUR, pas depuis la colonne");

  /* ═══════ B. FIXTURES CONTRÔLÉES ═══════ */
  console.log("\n═══ B. FIXTURES — DEUX ÉCOLES, CLASSES ET COMPTES DE SONDE ═══\n");

  const schools = await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { students: true } } },
  });
  const peopled = schools.filter((s) => s._count.students > 0).sort((a, b) => b._count.students - a._count.students);
  if (peopled.length < 2) { fail("moins de deux écoles peuplées — isolation non testable"); return; }
  const [A, B] = peopled;
  ok(`écoles de test : « ${A.name} » et « ${B.name} »`);

  const mkUser = async (schoolId: string, role: string, first: string) => {
    const u = await prisma.user.create({
      data: {
        email: `${TAG}.${first.toLowerCase()}.${Date.now()}@sonde.invalid`,
        firstName: `${TAG}-${first}`, lastName: "Sonde", role: role as never, schoolId,
      },
      select: { id: true, role: true, schoolId: true },
    });
    cleanup.userIds.push(u.id);
    return { userId: u.id, schoolId: u.schoolId, role: u.role } as ActorContext;
  };

  const teacher = await mkUser(A.id, "TEACHER", "Prof");
  const parent = await mkUser(A.id, "PARENT", "Parent");
  const otherParent = await mkUser(A.id, "PARENT", "Autre");

  const ownerA = await prisma.user.findFirst({ where: { schoolId: A.id, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, role: true } });
  const ownerB = await prisma.user.findFirst({ where: { schoolId: B.id, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, role: true } });
  const actorA: ActorContext = { userId: ownerA?.id ?? "sonde", schoolId: A.id, role: ownerA?.role ?? "OWNER" };
  const actorB: ActorContext = { userId: ownerB?.id ?? "sonde", schoolId: B.id, role: ownerB?.role ?? "OWNER" };

  const mkClass = async (name: string, teacherId: string | null) => {
    const c = await prisma.class.create({ data: { name: `${TAG} ${name}`, schoolId: A.id, teacherId } });
    cleanup.classIds.push(c.id);
    return c;
  };
  const sienne = await mkClass("Classe du prof", teacher.userId);
  const autre = await mkClass("Classe d'un collègue", null);

  const mkStudent = async (first: string, classId: string, parentId: string | null) => {
    const s = await prisma.student.create({
      data: { firstName: `${TAG}-${first}`, lastName: "Sonde", schoolId: A.id, status: "ENROLLED", parentId },
      select: { id: true },
    });
    cleanup.studentIds.push(s.id);
    const e = await prisma.enrollment.create({ data: { studentId: s.id, classId, academicYear: year } });
    cleanup.enrollmentIds.push(e.id);
    return s.id;
  };

  const sienId = await mkStudent("Eleve-A", sienne.id, parent.userId);   // sa classe, enfant du parent
  const horsId = await mkStudent("Eleve-B", autre.id, otherParent.userId); // hors de ses classes

  const tClasses = await teacherClassIds(teacher);
  check(tClasses.includes(sienne.id) && !tClasses.includes(autre.id),
    `les classes de l'enseignant sont résolues par titularité (${tClasses.length} classe(s))`);

  /* ═══════ C. RÉSERVE 3 — COMPLÉTUDE ET DOCUMENTS MANQUANTS ═══════ */
  console.log("\n═══ C. DOCUMENTS MANQUANTS — 10 EXIGÉS / 8 REÇUS ═══\n");

  // Exigences ciblées sur la classe de sonde : aucun élève réel n'est concerné.
  const REQUIRED = 10, RECEIVED = 8;
  const reqs = [];
  for (let i = 0; i < REQUIRED; i++) {
    const r = await prisma.documentRequirement.create({
      data: {
        label: `${TAG} — Pièce ${i + 1}`, category: "INSCRIPTION", schoolId: A.id,
        classId: sienne.id, position: 900 + i,
      },
    });
    cleanup.reqIds.push(r.id);
    reqs.push(r);
  }

  const mkDoc = async (opts: {
    studentId: string; requirementId: string | null; label: string; category: string;
    status?: string; createdAt?: Date; note?: string;
  }) => {
    const d = await prisma.studentDocument.create({
      data: {
        studentId: opts.studentId, requirementId: opts.requirementId, label: opts.label,
        category: opts.category as never, storagePath: `${A.id}/${opts.studentId}/sonde/${opts.label}.pdf`,
        fileName: `${opts.label}.pdf`, mimeType: "application/pdf", sizeBytes: PDF.length,
        status: (opts.status ?? "TO_VERIFY") as never, academicYear: year,
        uploadedById: actorA.userId, schoolId: A.id, reviewNote: opts.note ?? null,
        ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
      },
      select: { id: true },
    });
    cleanup.docIds.push(d.id);
    return d.id;
  };

  for (let i = 0; i < RECEIVED; i++) {
    await mkDoc({ studentId: sienId, requirementId: reqs[i].id, label: `${TAG}-doc-${i + 1}`, category: "INSCRIPTION" });
  }
  // Pièce hors checklist : elle ne doit gonfler NI le dénominateur, NI les manquants.
  await mkDoc({ studentId: sienId, requirementId: null, label: `${TAG}-hors-checklist`, category: "INSCRIPTION" });

  const f1 = (await studentFile(actorA, sienId))!;
  check(f1.completeness.required === REQUIRED, `exigences applicables : ${f1.completeness.required}`);
  check(f1.completeness.received === RECEIVED, `pièces reçues : ${f1.completeness.received}`);
  check(f1.completeness.missing === REQUIRED - RECEIVED,
    `manquantes : ${f1.completeness.missing} (${REQUIRED} exigées − ${RECEIVED} reçues)`);
  check(f1.completeness.percent === Math.round((RECEIVED / REQUIRED) * 100),
    `complétude : ${f1.completeness.percent} %`);
  check(f1.loose.length === 1, "la pièce hors checklist est classée à part, pas dans la checklist");
  check(f1.lines.length === f1.completeness.required,
    "une ligne par exigence applicable — le compte affiché ne peut pas diverger de la checklist");
  check(f1.lines.filter((l) => l.status === "MISSING").length === f1.completeness.missing,
    "le nombre de manquants dérive des lignes, il n'est pas recompté séparément");
  check(f1.lines.filter((l) => l.status === "VALIDATED").length === 0
     && !f1.lines.some((l) => l.status === "MISSING" && l.document !== null),
    "aucune pièce reçue ni validée n'est comptée comme manquante");

  /* ═══════ D. RÉSERVE 2 — EXPIRATION EN CONDITIONS RÉELLES ═══════ */
  console.log("\n═══ D. EXPIRATION — SUR PIÈCES RÉELLES ═══\n");

  const reqPerime = await prisma.documentRequirement.create({
    data: { label: `${TAG} — Certificat médical`, category: "SANTE", schoolId: A.id, classId: sienne.id, position: 950, validityMonths: 12 },
  });
  cleanup.reqIds.push(reqPerime.id);
  const reqEternel = await prisma.documentRequirement.create({
    data: { label: `${TAG} — Extrait de naissance`, category: "IDENTITE", schoolId: A.id, classId: sienne.id, position: 951 },
  });
  cleanup.reqIds.push(reqEternel.id);
  const reqFrais = await prisma.documentRequirement.create({
    data: { label: `${TAG} — Assurance`, category: "SCOLARITE", schoolId: A.id, classId: sienne.id, position: 952, validityMonths: 12 },
  });
  cleanup.reqIds.push(reqFrais.id);

  const docPerime = await mkDoc({ studentId: sienId, requirementId: reqPerime.id, label: `${TAG}-perime`, category: "SANTE", status: "VALIDATED", createdAt: monthsAgo(13) });
  await mkDoc({ studentId: sienId, requirementId: reqEternel.id, label: `${TAG}-eternel`, category: "IDENTITE", status: "VALIDATED", createdAt: monthsAgo(60) });
  await mkDoc({ studentId: sienId, requirementId: reqFrais.id, label: `${TAG}-frais`, category: "SCOLARITE", status: "VALIDATED", createdAt: monthsAgo(1) });

  const f2 = (await studentFile(actorA, sienId))!;
  const lineOf = (id: string) => f2.lines.find((l) => l.requirementId === id)!;
  check(lineOf(reqPerime.id).status === "EXPIRED", "pièce reçue il y a 13 mois, validité 12 mois → EXPIRED");
  check(lineOf(reqEternel.id).status === "VALIDATED", "pièce sans durée de validité, reçue il y a 5 ans → NON expirée");
  check(lineOf(reqFrais.id).status === "VALIDATED", "pièce reçue il y a 1 mois, validité 12 mois → non expirée");
  check(lineOf(reqPerime.id).document?.expiresAt != null, "l'échéance est exposée à l'écran, pas seulement déduite");
  check(f2.completeness.expired === 1, `complétude : ${f2.completeness.expired} pièce expirée comptée`);

  const rawPerime = await prisma.studentDocument.findUnique({ where: { id: docPerime }, select: { status: true } });
  check(rawPerime?.status === "VALIDATED",
    "la colonne `status` reste sur le contrôle réel (VALIDATED) — l'expiration ne l'écrase pas");

  // Remplacement d'une pièce expirée : la nouvelle repart à zéro.
  await prisma.studentDocument.update({ where: { id: docPerime }, data: { supersededAt: new Date() } });
  const docNeuf = await mkDoc({ studentId: sienId, requirementId: reqPerime.id, label: `${TAG}-remplacant`, category: "SANTE", status: "TO_VERIFY" });
  const f3 = (await studentFile(actorA, sienId))!;
  check(f3.lines.find((l) => l.requirementId === reqPerime.id)!.status === "TO_VERIFY",
    "après remplacement, la pièce expirée cède la place à une pièce à vérifier");
  check(f3.completeness.expired === 0, "plus aucune pièce expirée après remplacement");
  await prisma.studentDocument.update({ where: { id: docNeuf }, data: { supersededAt: null } });

  /* ═══════ E. RÉSERVE 4 — PÉRIMÈTRE ENSEIGNANT ═══════ */
  console.log("\n═══ E. ENSEIGNANT — CLASSES ET CATÉGORIES ═══\n");

  check(await canSeeStudent(teacher, sienId), "élève de SES classes → autorisé");
  check(!(await canSeeStudent(teacher, horsId)), "élève de son école mais HORS de ses classes → refusé");
  check((await studentFile(teacher, horsId)) === null, "le dossier d'un élève hors de ses classes n'est pas construit");

  const ft = (await studentFile(teacher, sienId))!;
  check(ft !== null, "le dossier d'un élève de ses classes reste accessible");
  const seen = new Set(ft.lines.map((l) => String(l.category)));
  check([...seen].every((c) => (TEACHER_DOC_CATEGORIES as readonly string[]).includes(c)),
    `catégories visibles par l'enseignant : ${[...seen].join(", ") || "aucune"}`);
  check(!ft.lines.some((l) => String(l.category) === "SANTE"),
    "aucune pièce de santé dans le dossier vu par l'enseignant — pas même son intitulé");
  check(!ft.loose.some((d) => !canSeeCategory(teacher, d.category)),
    "les pièces hors checklist sont filtrées par la même règle");
  check(ft.restricted && ft.notice !== null, "la vue partielle s'annonce comme telle (elle ne se fait pas passer pour complète)");
  check(ft.completeness.required === ft.lines.length,
    `la complétude de l'enseignant porte sur SON périmètre (${ft.completeness.required} exigence(s))`);
  check(!canSeeHealthData(teacher), "groupe sanguin et notes médicales suivent la même règle que les pièces de santé");
  check(canSeeHealthData(actorA), "la direction, elle, y accède");

  // Contournement par appel direct d'une action, avec un identifiant deviné.
  const santeDoc = await prisma.studentDocument.findFirst({
    where: { studentId: sienId, category: "SANTE", supersededAt: null }, select: { id: true },
  });
  const scoDoc = await prisma.studentDocument.findFirst({
    where: { studentId: sienId, category: "SCOLARITE", supersededAt: null }, select: { id: true },
  });
  const docHors = await mkDoc({ studentId: horsId, requirementId: null, label: `${TAG}-hors`, category: "SCOLARITE" });

  const rSante = await signedUrlFor(teacher, santeDoc!.id);
  const rHors = await signedUrlFor(teacher, docHors);
  check("error" in rSante, "URL signée refusée sur une pièce de santé, même pour SON élève");
  check("error" in rHors, "URL signée refusée sur la pièce d'un élève hors de ses classes");
  check("error" in rSante && "error" in rHors && rSante.error === rHors.error,
    "message identique dans les deux refus — il ne révèle pas laquelle des deux bornes a joué");

  // Cas positif : il faut un objet réel dans le bucket.
  const realPath = storagePathFor(A.id, sienId, scoDoc!.id, "sonde.pdf");
  const up = await supabase.storage.from(BUCKET).upload(realPath, PDF, { contentType: "application/pdf", upsert: true });
  check(!up.error, "dépôt d'un objet réel dans le bucket pour éprouver le cas autorisé", up.error?.message);
  cleanup.paths.push(realPath);
  await prisma.studentDocument.update({ where: { id: scoDoc!.id }, data: { storagePath: realPath } });
  const rOk = await signedUrlFor(teacher, scoDoc!.id);
  check(!("error" in rOk), "pièce pédagogique de SON élève → URL signée délivrée", "error" in rOk ? rOk.error : undefined);

  /* ═══════ F. §5 — PÉRIMÈTRE PARENT ═══════ */
  console.log("\n═══ F. PARENT — SES ENFANTS, ET RIEN D'AUTRE ═══\n");

  check(await canSeeStudent(parent, sienId), "son propre enfant → la borne de lignes l'autorise");
  check(!(await canSeeStudent(parent, horsId)), "l'enfant d'un autre parent, même école → refusé");
  check(!(await canSeeStudent(parent, (await prisma.student.findFirstOrThrow({ where: { schoolId: B.id }, select: { id: true } })).id)),
    "un élève d'une autre école → refusé");
  check((await studentFile(otherParent, sienId)) === null,
    "appel direct de la lecture du dossier avec l'identifiant d'un enfant d'autrui → rien");
  check("error" in (await signedUrlFor(otherParent, scoDoc!.id)),
    "appel direct du téléchargement avec un documentId d'autrui → refusé");
  check((visibleCategories(parent) ?? []).length === 0,
    "aucune catégorie n'est ouverte au parent : le modèle de permissions ne lui donne pas le dossier");

  /* ═══════ G. §6 — ISOLATION INTER-ÉCOLES, REJOUÉE ═══════ */
  console.log("\n═══ G. ISOLATION — A→A, A→B, B→B, B→A ═══\n");

  const studentB = await prisma.student.findFirstOrThrow({ where: { schoolId: B.id }, select: { id: true } });
  check((await studentFile(actorA, sienId)) !== null, "A → A : autorisé (témoin)");
  check((await studentFile(actorA, studentB.id)) === null, "A → B : refusé");
  check((await studentFile(actorB, studentB.id)) !== null, "B → B : autorisé (témoin)");
  check((await studentFile(actorB, sienId)) === null, "B → A : refusé");
  check("error" in (await signedUrlFor(actorB, scoDoc!.id)), "documentId étranger → refusé");
  const guessed = await supabase.storage.from(BUCKET).download(realPath.replace(A.id, B.id));
  check(Boolean(guessed.error), "chemin Storage deviné en substituant l'identifiant d'école → introuvable");

  /* ═══════ H. GARDE-FOUS DE CODE ═══════ */
  console.log("\n═══ H. GARDE-FOUS ═══\n");

  check(/default:/.test(libScope), "`studentWhereFor()` a une branche par défaut — un rôle inconnu ne reçoit rien");
  check(/AND: \[scope/.test(libFile) && !/\.\.\.scope, id: studentId/.test(libFile),
    "le périmètre est combiné par `AND`, jamais par étalement (qui écraserait la clé `id` du refus)");
  check(!/ROLE_PERMISSIONS|ROLE_DENIALS|hasAccess/.test(libScope),
    "`studentScope.ts` ne réécrit aucune permission de chemin — il ne répond qu'à « quelles lignes »");
  const client = read("src/app/dashboard/students/[id]/dossier/DossierClient.tsx");
  check(/title="Documents manquants"/.test(client), "la section « Documents manquants » existe à l'écran");
  check(/const missing = lines\.filter/.test(client), "elle dérive des lignes de la checklist, elle ne recompte rien");
  const listSrc = strip(read("src/app/dashboard/students/page.tsx"));
  const detailSrc = strip(read("src/app/dashboard/students/[id]/page.tsx"));
  check(/studentWhereFor/.test(listSrc), "l'annuaire des élèves applique le même périmètre");
  check(/studentWhereFor/.test(detailSrc), "la fiche élève applique le même périmètre");
  check(/canSeeHealthData/.test(detailSrc), "la fiche élève masque les données médicales hors périmètre");

  /* ═══════ I. FRONTIÈRE CLIENT / SERVEUR ═══════ */
  console.log("\n═══ I. FRONTIÈRE CLIENT / SERVEUR ═══\n");

  // ⚠️ Le défaut le plus coûteux du lot 13 n'était visible NI dans `tsc`, NI dans
  // aucun vérificateur : `DossierClient.tsx` (`"use client"`) importait
  // `@/lib/studentFile`, qui importe Prisma → `pg` → `dns`. Le bundle navigateur
  // ne compilait pas, la route ne produisait pas son manifeste, l'écran répondait
  // 500 — et le dossier n'a donc jamais été affiché depuis sa livraison.
  //
  // Ce contrôle empêche la récidive sur TOUT composant client, pas seulement sur
  // celui du dossier : il suit les imports `@/lib/...` de proche en proche.
  const { readdirSync, statSync } = await import("node:fs");
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      const full = `${dir}/${e}`;
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(full)) out.push(full);
    }
    return out;
  };
  const libImports = (src: string) =>
    [...src.matchAll(/^\s*import\s+(?!type\s)[^;]*?from\s+"(@\/lib\/[^"]+)"/gm)].map((m) => m[1]);

  const touchesPrisma = (mod: string, seen = new Set<string>()): string | null => {
    if (seen.has(mod)) return null;
    seen.add(mod);
    if (mod === "@/lib/prisma") return mod;
    const src = read(`src/lib/${mod.replace("@/lib/", "")}.ts`) || read(`src/lib/${mod.replace("@/lib/", "")}.tsx`);
    if (!src) return null;
    for (const dep of libImports(src)) {
      const hit = touchesPrisma(dep, seen);
      if (hit) return `${mod} → ${hit}`;
    }
    return null;
  };

  const offenders: string[] = [];
  let clientFiles = 0;
  for (const f of walk("src/app")) {
    const src = read(f);
    if (!/^\s*["']use client["']/m.test(src)) continue;
    clientFiles++;
    for (const dep of libImports(src)) {
      const chain = touchesPrisma(dep);
      if (chain) offenders.push(`${f} → ${chain}`);
    }
  }
  check(clientFiles > 0, `${clientFiles} composants client inspectés`);
  check(offenders.length === 0,
    "aucun composant client n'entraîne Prisma dans le bundle navigateur",
    offenders.join("\n      "));

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
}

async function wipe() {
  const s = createAdminClient();
  if (cleanup.paths.length) await s.storage.from(BUCKET).remove(cleanup.paths);
  await prisma.studentDocument.deleteMany({ where: { OR: [{ id: { in: cleanup.docIds } }, { studentId: { in: cleanup.studentIds } }] } });
  await prisma.enrollment.deleteMany({ where: { studentId: { in: cleanup.studentIds } } });
  await prisma.student.deleteMany({ where: { id: { in: cleanup.studentIds } } });
  await prisma.documentRequirement.deleteMany({ where: { id: { in: cleanup.reqIds } } });
  await prisma.class.deleteMany({ where: { id: { in: cleanup.classIds } } });
  await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
}

main()
  .catch((e) => { console.error(e); failures++; })
  .finally(async () => {
    // ⚠️ Le nettoyage tourne DANS `finally` : au lot 13, une erreur d'indice
    // après les tests avait sauté le nettoyage et laissé une pièce de sonde.
    try { await wipe(); console.log("  (fixtures de sonde supprimées)"); }
    catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    const left = await prisma.student.count({ where: { firstName: { startsWith: TAG } } });
    console.log(left === 0 ? "  ✓ aucune fixture résiduelle\n" : `  ✗ ${left} fixture(s) résiduelle(s)\n`);
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
