/**
 * Vérificateur du lot 14 — scan mobile, import, propositions assistées.
 *
 *   npm run script -- scripts/verify-lot-14.ts
 *
 * 20ᵉ vérificateur. Il assemble de **vrais PDF** à partir de **vrais JPEG** et
 * les fait ouvrir par le lecteur PDF du système, calcule de **vrais scores** de
 * correspondance, et éprouve le périmètre et l'isolation de l'analyse sur des
 * fixtures qu'il crée puis supprime.
 *
 * ⚠️ Ce que ce script NE prouve PAS, et qu'il ne prétendra pas prouver :
 * l'appareil photo, le rendu mobile réel, et le comportement des server actions
 * `uploadStudentDocument` / `analyzeStudentDocument`, qui exigent une requête
 * HTTP authentifiée (voir `verify-render-dossier.ts`).
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { ActorContext } from "../src/lib/audit";
import { pdfFromJpegs, jpegSize, MAX_EDGE, MAX_PAGES, A4 } from "../src/lib/scan";
import {
  analyzeDocument, ocrCapability, jaroWinkler, scoreAgainst, tokens, normalize, PROPOSAL_FLOOR,
} from "../src/lib/documentProposals";
import { checkFile, MAX_BYTES } from "../src/lib/studentFileLimits";
import { currentAcademicYear, BUCKET } from "../src/lib/studentFile";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const has = (cmd: string) => { try { execFileSync("/usr/bin/which", [cmd], { stdio: "pipe" }); return true; } catch { return false; } };

const TAG = "SONDE14";
const trash = { studentIds: [] as string[], classIds: [] as string[], reqIds: [] as string[], userIds: [] as string[], paths: [] as string[] };

/** JPEG de sonde, fabriqués depuis une image système — aucune donnée réelle. */
function makeJpegs(dir: string): { bytes: Uint8Array; width: number; height: number }[] {
  const src = "/System/Library/Desktop Pictures/Mac Blue.heic";
  if (!existsSync(src) || !has("sips")) return [];
  const out: { bytes: Uint8Array; width: number; height: number }[] = [];
  for (const [i, size] of [900, 700, 500].entries()) {
    const f = join(dir, `p${i}.jpg`);
    try {
      execFileSync("sips", ["-s", "format", "jpeg", "-Z", String(size), src, "--out", f], { stdio: "pipe" });
      const bytes = new Uint8Array(readFileSync(f));
      const dim = jpegSize(bytes);
      if (dim) out.push({ bytes, ...dim });
    } catch { /* image indisponible : le contrôle sera annoncé comme non joué */ }
  }
  return out;
}

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION DU LOT 14 — SCAN, IMPORT, PROPOSITIONS ASSISTÉES");
  console.log("═".repeat(74));

  const dir = mkdtempSync(join(tmpdir(), "sonde14-"));

  /* ═══════ A. ASSEMBLAGE PDF — RÉEL, VALIDÉ PAR LE SYSTÈME ═══════ */
  console.log("\n═══ A. ASSEMBLAGE PDF ═══\n");

  const jpegs = makeJpegs(dir);
  if (jpegs.length < 2) {
    fail("impossible de fabriquer des JPEG de sonde (sips ou image système absents) — assemblage PDF non éprouvé");
  } else {
    ok(`${jpegs.length} JPEG de sonde fabriqués (${jpegs.map((j) => `${j.width}×${j.height}`).join(", ")})`);
    check(jpegs.every((j) => j.width > 0 && j.height > 0),
      "les dimensions sont lues dans les marqueurs JPEG, sans navigateur ni bibliothèque");

    const pdf = pdfFromJpegs(jpegs);
    const file = join(dir, "assemble.pdf");
    writeFileSync(file, pdf);
    trash.paths.push(file);

    const head = Buffer.from(pdf.slice(0, 8)).toString("latin1");
    const tail = Buffer.from(pdf.slice(-7)).toString("latin1");
    check(head.startsWith("%PDF-"), `en-tête PDF valide (${head.trim()})`);
    check(tail.includes("%%EOF"), "le fichier se termine par %%EOF");

    const text = Buffer.from(pdf).toString("latin1");
    check((text.match(/\/Subtype \/Image/g) ?? []).length === jpegs.length,
      `une image par page — ${jpegs.length} objets image pour ${jpegs.length} pages`);
    check(text.includes("/Filter /DCTDecode"),
      "les JPEG sont recopiés tels quels (DCTDecode) — aucun réencodage, aucune perte");
    check(new RegExp(`/Count ${jpegs.length}`).test(text), `l'arbre des pages déclare ${jpegs.length} pages`);
    const sumJpeg = jpegs.reduce((n, j) => n + j.bytes.length, 0);
    check(pdf.length > sumJpeg && pdf.length < sumJpeg * 1.05,
      `le PDF pèse ${pdf.length} o pour ${sumJpeg} o d'images — l'enveloppe est négligeable`);

    // Chaque décalage de la table xref doit tomber sur « N 0 obj ».
    const xrefAt = Number(/startxref\s+(\d+)/.exec(text)?.[1] ?? 0);
    check(xrefAt > 0 && text.slice(xrefAt, xrefAt + 4) === "xref",
      "startxref pointe exactement sur la table xref — c'est la partie qui casse en silence");
    const entries = [...text.slice(xrefAt).matchAll(/^(\d{10}) 00000 n/gm)].map((m) => Number(m[1]));
    check(entries.length > 0 && entries.every((off) => /^\d+ 0 obj/.test(text.slice(off, off + 12))),
      `les ${entries.length} décalages de la table xref tombent tous sur un objet`);

    // ⚠️ La preuve qui compte : un parseur PDF **extérieur au projet** l'ouvre.
    if (has("qlmanage")) {
      try {
        execFileSync("qlmanage", ["-t", "-s", "400", "-o", dir, file], { stdio: "pipe" });
        const thumb = `${file}.png`;
        const rendered = existsSync(thumb) && readFileSync(thumb).length > 5000;
        if (existsSync(thumb)) trash.paths.push(thumb);
        check(rendered, "le PDF est ouvert ET rendu par CoreGraphics (miniature non vide)");
      } catch (e) {
        fail("le lecteur PDF du système n'a pas pu rendre le fichier", String(e).slice(0, 200));
      }
    } else {
      fail("qlmanage absent — rendu par un parseur extérieur non éprouvé");
    }

    // Une image très large ne doit pas déborder de la page.
    const wide = pdfFromJpegs([{ bytes: jpegs[0].bytes, width: 4000, height: 500 }]);
    const cm = /q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm/.exec(Buffer.from(wide).toString("latin1"));
    const [w, h, x, y] = cm ? cm.slice(1).map(Number) : [0, 0, 0, 0];
    check(w <= A4.width + 0.01 && h <= A4.height + 0.01 && x >= -0.01 && y >= -0.01,
      `une image 4000×500 est contenue dans la page A4 (${w.toFixed(0)}×${h.toFixed(0)} pt) et centrée`);
    check(Math.abs(w / h - 4000 / 500) < 0.01, "le rapport d'aspect est préservé — la pièce n'est pas déformée");
  }

  /* ═══════ B. LIMITES ET FORMATS — MÊME CODE DES DEUX CÔTÉS ═══════ */
  console.log("\n═══ B. FORMATS ET LIMITES ═══\n");

  const scanSrc = strip(read("src/app/dashboard/students/[id]/dossier/ScanDialog.tsx"));
  check(/from "@\/lib\/studentFileLimits"/.test(scanSrc),
    "l'écran de scan valide avec le MÊME `checkFile()` que le serveur — pas une copie qui divergera");
  check(checkFile("application/pdf", "acte.pdf", 1024).ok, "PDF accepté");
  check(checkFile("image/jpeg", "page.jpg", 1024).ok, "JPEG accepté");
  check(!checkFile("image/gif", "anime.gif", 1024).ok, "GIF refusé — format annoncé nulle part, donc refusé");
  check(!checkFile("application/pdf", "gros.pdf", MAX_BYTES + 1).ok, "au-delà de 10 Mo, refus avant tout envoi");
  check(MAX_EDGE > 0 && MAX_PAGES > 0, `réduction à ${MAX_EDGE} px de côté long, ${MAX_PAGES} pages au maximum`);

  check(/createImageBitmap/.test(scanSrc) && /toBlob/.test(scanSrc),
    "les capacités du navigateur sont détectées, pas supposées");
  check(/capture" in input/.test(scanSrc), "la prise de vue directe est détectée par test de l'attribut `capture`");
  check(/sélecteur de fichiers s'ouvrira à la place|envoyée telle quelle/.test(scanSrc),
    "chaque capacité absente a un repli annoncé à l'écran");
  check(/file\.type === "application\/pdf"/.test(scanSrc) && /sans conversion/.test(scanSrc),
    "un PDF importé n'est pas converti en images — la règle de performance mobile est tenue");

  /* ═══════ C. OCR — L'ABSENCE EST DITE, PAS SIMULÉE ═══════ */
  console.log("\n═══ C. RECONNAISSANCE DE TEXTE ═══\n");

  const cap = ocrCapability();
  check(cap.available === false, `état réel : indisponible — « ${cap.reason.slice(0, 60)}… »`);
  check(cap.reason.length > 40, "l'indisponibilité est expliquée, pas seulement signalée");

  const proposalsSrc = strip(read("src/lib/documentProposals.ts"));
  check(!/fetch\(|https?:\/\/(?!\/)/.test(proposalsSrc),
    "aucun appel réseau dans le module d'analyse — rien n'est envoyé à l'extérieur");
  check(!/tesseract|vision|textract|mindee|openai|anthropic/i.test(proposalsSrc + scanSrc),
    "aucun fournisseur OCR n'est nommé ni simulé");
  const pkg = read("package.json");
  check(!/tesseract|ocr|vision/i.test(pkg), "aucune dépendance de reconnaissance de texte n'a été ajoutée");
  const actionsSrc = strip(read("src/app/dashboard/students/[id]/dossier/actions.ts"));
  check(/analyzeDocument\(ctx, input\)/.test(actionsSrc) && !/formData\.get\("file"\)[\s\S]{0,200}analyze/.test(actionsSrc),
    "l'analyse ne reçoit que des métadonnées — le binaire ne lui est jamais transmis");

  /* ═══════ D. SCORES — RÉELS, JAMAIS INVENTÉS ═══════ */
  console.log("\n═══ D. SCORES DE CORRESPONDANCE ═══\n");

  check(jaroWinkler("diallo", "diallo") === 1, "chaînes identiques → 1");
  check(jaroWinkler("diallo", "xyzabc") < 0.5, "chaînes sans rapport → score bas");
  const typo = jaroWinkler("mamadou", "mamadu");
  check(typo > 0.9 && typo < 1, `faute de frappe « mamadu » → ${typo.toFixed(3)} — proche mais pas égal`);
  check(jaroWinkler("mamadou", "amadou") < typo,
    "« Amadou » est distingué de « Mamadou » — le préfixe compte, comme il doit");
  check(normalize("Extrait de Naissance") === "extrait de naissance", "accents et casse neutralisés");
  check(!tokens("IMG_4821.jpg").includes("4821"), "les compteurs d'appareil photo ne sont pas pris pour des mots");

  const ft = tokens("Diallo Mamadou extrait de naissance.pdf");
  const good = scoreAgainst(ft, "Extrait de naissance");
  const bad = scoreAgainst(ft, "Certificat de vaccination");
  check(good > PROPOSAL_FLOOR, `« Extrait de naissance » face à ce fichier → ${(good * 100).toFixed(0)} %`);
  check(bad < PROPOSAL_FLOOR, `« Certificat de vaccination » → ${(bad * 100).toFixed(0)} %, sous le seuil d'affichage`);
  // ⚠️ L'invariant N'EST PAS « le score vaut zéro » : `IMG_4821` laisse le mot
  // « img », qui obtient mécaniquement une similarité faible mais non nulle.
  // Figer `=== 0` aurait été un contrôle faux — l'invariant qui compte est que
  // ce bruit reste SOUS le seuil, donc qu'aucune proposition n'en sorte.
  const noise = scoreAgainst(tokens("IMG_4821.jpg"), "Extrait de naissance");
  check(noise < PROPOSAL_FLOOR,
    `un nom d'appareil photo ne produit que du bruit (${(noise * 100).toFixed(0)} %), sous le seuil d'affichage`);
  check(scoreAgainst([], "Extrait de naissance") === 0,
    "un nom de fichier sans aucun mot exploitable ne produit aucun score");

  const dossierSrc = read("src/app/dashboard/students/[id]/dossier/ScanDialog.tsx");
  check(/Math\.round\(\w+\.score \* 100\)/.test(dossierSrc),
    "le pourcentage affiché est la sortie de l'algorithme, multipliée par 100 — rien d'autre");
  check(/Correspondance incertaine/.test(dossierSrc),
    "sous le seuil, l'écran écrit « correspondance incertaine » au lieu d'un chiffre");

  /* ═══════ E. FIXTURES ═══════ */
  console.log("\n═══ E. FIXTURES — DEUX ÉCOLES ═══\n");

  const schools = await prisma.school.findMany({ select: { id: true, name: true, _count: { select: { students: true } } } });
  const peopled = schools.filter((s) => s._count.students > 0).sort((a, b) => b._count.students - a._count.students);
  if (peopled.length < 2) { fail("moins de deux écoles peuplées — isolation non testable"); return; }
  const [A, B] = peopled;
  const year = currentAcademicYear();

  const mkUser = async (schoolId: string, role: string, first: string) => {
    const u = await prisma.user.create({
      data: { email: `${TAG.toLowerCase()}.${first}.${Date.now()}@sonde.invalid`, firstName: `${TAG}-${first}`, lastName: "Sonde", role: role as never, schoolId },
      select: { id: true, role: true, schoolId: true },
    });
    trash.userIds.push(u.id);
    return { userId: u.id, schoolId: u.schoolId, role: u.role } as ActorContext;
  };
  const teacher = await mkUser(A.id, "TEACHER", "prof");
  const ownerA = await prisma.user.findFirst({ where: { schoolId: A.id, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, role: true } });
  const ownerB = await prisma.user.findFirst({ where: { schoolId: B.id, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, role: true } });
  const actorA: ActorContext = { userId: ownerA?.id ?? "sonde", schoolId: A.id, role: ownerA?.role ?? "OWNER" };
  const actorB: ActorContext = { userId: ownerB?.id ?? "sonde", schoolId: B.id, role: ownerB?.role ?? "OWNER" };

  const sienne = await prisma.class.create({ data: { name: `${TAG} classe du prof`, schoolId: A.id, teacherId: teacher.userId } });
  const autre = await prisma.class.create({ data: { name: `${TAG} autre classe`, schoolId: A.id } });
  trash.classIds.push(sienne.id, autre.id);

  const mkStudent = async (first: string, last: string, classId: string) => {
    const s = await prisma.student.create({ data: { firstName: `${TAG}${first}`, lastName: last, schoolId: A.id, status: "ENROLLED" }, select: { id: true } });
    trash.studentIds.push(s.id);
    await prisma.enrollment.create({ data: { studentId: s.id, classId, academicYear: year } });
    return s.id;
  };
  const sien = await mkStudent("Mamadou", "Diallo", sienne.id);
  const hors = await mkStudent("Ousmane", "Ndiaye", autre.id);

  const mkReq = async (label: string, category: string) => {
    const r = await prisma.documentRequirement.create({
      data: { label: `${TAG} ${label}`, category: category as never, schoolId: A.id, classId: sienne.id },
    });
    trash.reqIds.push(r.id);
    return r;
  };
  const rNaissance = await mkReq("Extrait de naissance", "IDENTITE");
  await mkReq("Certificat medical", "SANTE");
  ok(`fixtures créées dans « ${A.name} » — 2 élèves, 2 classes, 2 exigences`);

  /* ═══════ F. ANALYSE — PROPOSITIONS ET PÉRIMÈTRE ═══════ */
  console.log("\n═══ F. ANALYSE ═══\n");

  const named = await analyzeDocument(actorA, { studentId: sien, fileName: `${TAG} Extrait de naissance Diallo.pdf` });
  check(named !== null, "analyse d'un élève de son école : autorisée");
  check(named!.requirements.some((r) => r.requirementId === rNaissance.id),
    `« Extrait de naissance » est proposé (${named!.requirements.map((r) => `${Math.round(r.score * 100)} %`).join(", ")})`);
  check(named!.requirements.every((r) => r.score >= PROPOSAL_FLOOR),
    "aucune proposition sous le seuil n'est renvoyée");
  check(named!.context.studentId === sien,
    "le dossier de destination reste celui d'où part l'utilisateur, quelle que soit la proposition");
  check(named!.ocr.available === false && named!.textSource === "fileName",
    "l'analyse déclare sa source : le nom du fichier, et non le contenu de la pièce");

  const blind = await analyzeDocument(actorA, { studentId: sien, fileName: "IMG_4821.jpg" });
  check(blind!.inconclusive, "nom de fichier d'appareil photo → analyse déclarée non concluante, aucune invention");
  check(blind!.requirements.length === 0 && blind!.students.length === 0, "aucune proposition, aucun pourcentage");

  // Périmètre : l'enseignant ne peut pas se faire proposer un élève hors de ses classes.
  const tAnalysis = await analyzeDocument(teacher, { studentId: sien, fileName: `${TAG}Ousmane Ndiaye bulletin.pdf` });
  check(tAnalysis !== null, "l'enseignant peut analyser une pièce pour un élève de SES classes");
  check(!tAnalysis!.students.some((s) => s.studentId === hors),
    "aucun élève hors de ses classes n'apparaît dans les propositions, même si le nom du fichier le désigne");
  check(!tAnalysis!.requirements.some((r) => String(r.category) === "SANTE"),
    "aucune exigence de catégorie fermée à l'enseignant n'est proposée");
  check((await analyzeDocument(teacher, { studentId: hors, fileName: "x.pdf" })) === null,
    "analyse pour un élève hors de ses classes → refusée");

  /* ═══════ G. ISOLATION INTER-ÉCOLES ═══════ */
  console.log("\n═══ G. ISOLATION ═══\n");

  const studentB = await prisma.student.findFirstOrThrow({ where: { schoolId: B.id }, select: { id: true, firstName: true, lastName: true } });
  check((await analyzeDocument(actorB, { studentId: sien, fileName: "x.pdf" })) === null, "B → analyse d'un élève de A : refusée");
  check((await analyzeDocument(actorA, { studentId: studentB.id, fileName: "x.pdf" })) === null, "A → analyse d'un élève de B : refusée");
  const cross = await analyzeDocument(actorA, { studentId: sien, fileName: `${studentB.firstName} ${studentB.lastName}.pdf` });
  check(!cross!.students.some((s) => s.studentId === studentB.id),
    "un nom de fichier désignant un élève de l'autre école ne le fait jamais apparaître");
  check((await analyzeDocument(actorB, { studentId: studentB.id, fileName: "x.pdf" })) !== null, "B → B : autorisée (témoin)");

  /* ═══════ H. VALIDATION HUMAINE ET REMPLACEMENT ═══════ */
  console.log("\n═══ H. DÉCISION HUMAINE ═══\n");

  check(/needsConfirmation/.test(actionsSrc), "le remplacement renvoie une demande de confirmation au lieu d'écraser");
  const upl = actionsSrc.slice(actionsSrc.indexOf("export async function uploadStudentDocument"));
  const confirmAt = upl.indexOf("needsConfirmation");
  const uploadAt = upl.indexOf(".upload(path");
  check(confirmAt > 0 && uploadAt > 0 && confirmAt < uploadAt,
    "la confirmation est exigée AVANT l'envoi du binaire — aucun objet orphelin dans le bucket");
  check(/supersededAt: new Date\(\)/.test(actionsSrc) && !/\.remove\(\[previous/.test(actionsSrc),
    "l'ancienne version est marquée remplacée, jamais supprimée (invariant du lot 13 conservé)");
  check(/Document existant/.test(scanSrc) && /conservée/.test(scanSrc),
    "l'écran annonce la pièce existante et dit ce que devient l'ancienne version");
  check(/source: \["scan", "import"\]/.test(actionsSrc) && /proposal \? \{ proposal \}/.test(actionsSrc),
    "provenance et propositions retenues sont écrites dans l'audit existant");
  check(!/prisma\.\w*[Hh]istory|model ScanJob|model OcrResult/.test(actionsSrc + read("prisma/schema.prisma")),
    "aucune table d'historique ni de traitement n'a été créée — `AuditLog` porte tout");
  check(!/ROLE_PERMISSIONS|ROLE_DENIALS/.test(actionsSrc + proposalsSrc + scanSrc),
    "aucune matrice de permissions nouvelle");
  check(/requireActionContext\(READ_PATH\)/.test(actionsSrc), "l'analyse exige le même chemin que la consultation du dossier");

  /* ═══════ I. STOCKAGE — UN SEUL BUCKET, AUCUN FICHIER TEMPORAIRE ═══════ */
  console.log("\n═══ I. STOCKAGE ═══\n");

  const supabase = createAdminClient();
  const buckets = await supabase.storage.listBuckets();
  const names = (buckets.data ?? []).map((b) => b.name);
  check(names.filter((n) => n === BUCKET).length === 1, `un seul bucket documentaire : « ${BUCKET} »`);
  check(!names.some((n) => /scan|ocr|temp|tmp/i.test(n)),
    `aucun bucket temporaire n'a été créé (buckets présents : ${names.join(", ") || "aucun"})`);
  check(!/base64|toDataURL|readAsDataURL/i.test(scanSrc + proposalsSrc),
    "aucun base64 : les scans ne transitent pas par la base");
  check(!/storage\.from\([^)]*\)\.upload/.test(scanSrc),
    "le client n'écrit jamais dans Storage lui-même — tout passe par la server action");
  check(/pdfFromJpegs/.test(scanSrc) && !/upload.*intermediaire|tempPath/i.test(scanSrc),
    "l'assemblage se fait en mémoire sur l'appareil : aucun fichier intermédiaire n'est déposé");

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
}

async function wipe() {
  for (const f of trash.paths) { try { unlinkSync(f); } catch { /* déjà parti */ } }
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
      console.log(left === 0 ? "  ✓ aucune fixture résiduelle\n" : `  ✗ ${left} fixture(s) résiduelle(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
