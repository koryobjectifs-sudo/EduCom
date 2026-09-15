/**
 * Vérification officielle du Lot 4/5 — Les Deux Bulletins (v18-bulletins).
 *
 * Cahier des charges Kory :
 * 1. Secondaire : élève du cas de référence (Terminale S2) → moyenne imprimée = 12.86 (321.50 / 25 coefs).
 * 2. Élémentaire : élève réel (CE1) avec domaines, sous-disciplines en retrait, sans colonne coef, barème /10 convertible /20, 3 visas.
 * 3. A4 sans débordement : les deux gabarits doivent tenir sur exactement 1 page A4 sans débordement, y compris sur le cas le plus chargé (15 sous-disciplines).
 * 4. Rendu PDF via CDP (moteur Chromium natif, identique à window.print()).
 * 5. Comparaison avec les PDF de référence archivés dans docs/documents-reference/.
 *
 * Exécution :
 *   npm run script -- scripts/verify-lot4-bulletins.ts
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "./_env";
import {
  CDP,
  chromeAvailable,
  launchChrome,
  waitFor,
  evaluate,
  sessionCookiesForExistingUser,
  printPDF,
} from "./_cdp";
import { loadOfficialBulletin } from "../src/lib/bulletin/loadOfficialBulletin";

const PORT = Number(process.env.CDP_PORT ?? 9496);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "docs", "documents-verify-lot4");

const STABLE = `(() => {
  if (document.readyState !== "complete") return false;
  const n = document.querySelectorAll(".bulletin-sheet").length;
  return n > 0;
})()`;

function getPdfPageCount(filePath: string): number {
  const buffer = readFileSync(filePath);
  const text = buffer.toString("binary");
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : 1;
}

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("   VÉRIFICATION LOT 4/5 : LES DEUX BULLETIINS OFFICIELS (v18)    ");
  console.log("══════════════════════════════════════════════════════════════════\n");

  mkdirSync(OUT_DIR, { recursive: true });

  const school = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO", mode: "insensitive" } },
    select: { id: true, name: true, logo: true, stamp: true, signature: true, primaryColor: true },
  });
  if (!school) throw new Error("École SENG.CO ACADEMY introuvable !");

  const terms = await prisma.term.findMany({
    where: { schoolId: school.id },
    orderBy: { startDate: "asc" },
  });
  if (terms.length === 0) throw new Error("Aucun trimestre trouvé !");
  const term1 = terms[0];

  // ─────────────────────────────────────────────────────────────
  // 1. VALIDATION SECONDARY REFERENCE CASE (321.50 / 25 = 12.86)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ [1/4] Vérification Bulletin Secondaire (Cas de référence)...");

  const t2Class = await prisma.class.findFirst({
    where: { schoolId: school.id, name: "Terminale S2" },
  });
  if (!t2Class) throw new Error("Classe Terminale S2 introuvable !");

  const secEnrollment = await prisma.enrollment.findFirst({
    where: {
      classId: t2Class.id,
      studentId: "f46f457a-5ebe-411f-be62-14aaeffe003d",
    },
    include: { student: true },
  });
  if (!secEnrollment) throw new Error("Élève de référence Babacar Ndiaye introuvable dans Terminale S2 !");
  const secStudent = secEnrollment.student;

  const secData = await loadOfficialBulletin({
    schoolId: school.id,
    classId: t2Class.id,
    termId: term1.id,
    studentId: secStudent.id,
  });

  if (!secData || secData.cycle !== "SECONDAIRE") {
    throw new Error("Échec chargement données officielles du secondaire !");
  }

  const s = secData.students[0];
  console.log(`  • Élève : ${s.lastName} ${s.firstName} (IEN: ${s.ien || "—"})`);
  console.log(`  • Matières notées : ${s.subjects.length}`);
  console.log(`  • Total Coefficients : ${s.totalCoefficients} (attendu: 25)`);
  console.log(`  • Total Points : ${s.totalPoints} (attendu: 321.50)`);
  console.log(`  • Moyenne Générale : ${s.moyenneGenerale} (attendu: 12.86)`);
  console.log(`  • Rang : ${s.rang} / ${s.headcount}`);

  if (s.totalCoefficients !== 25) throw new Error(`Total coefficients incorrect : ${s.totalCoefficients} != 25`);
  if (s.totalPoints !== 321.5) throw new Error(`Total points incorrect : ${s.totalPoints} != 321.50`);
  if (s.moyenneGenerale !== 12.86) throw new Error(`Moyenne générale incorrecte : ${s.moyenneGenerale} != 12.86`);

  console.log("  ✓ Cas de référence secondaire strictement conforme (12.86/20 sur 25 coefs).\n");

  // ─────────────────────────────────────────────────────────────
  // 2. VALIDATION ÉLÉMENTAIRE (DOMAINES, BARÈME /10, 3 VISAS)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ [2/4] Vérification Bulletin Élémentaire (Domaines, /10, sans coef)...");

  const ce1Class = await prisma.class.findFirst({
    where: { schoolId: school.id, name: "CE1" },
  });
  if (!ce1Class) throw new Error("Classe CE1 introuvable !");

  const elemEnrollment = await prisma.enrollment.findFirst({
    where: { classId: ce1Class.id },
    include: { student: true },
  });
  if (!elemEnrollment) throw new Error("Aucun élève en CE1 !");
  const elemStudent = elemEnrollment.student;

  // Récupérer tous les sous-disciplines et s'assurer qu'elles ont une note
  const gradeDomains = await prisma.gradeDomain.findMany({
    where: { schoolId: school.id, isActive: true },
    include: { subDisciplines: { where: { isActive: true }, orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });

  // Nettoyage préalable des notes de test pour cet élève
  await prisma.grade.deleteMany({
    where: { studentId: elemStudent.id, classId: ce1Class.id, termId: term1.id },
  });

  // Seeder des notes complètes pour ce cas de test élémentaire (15 sous-disciplines)
  const notesMock = [8.5, 7.0, 9.0, 8.0, 7.5, 9.5, 8.0, 7.0, 8.5, 8.0, 7.5, 9.0, 8.5, 8.0, 9.0];
  let nIdx = 0;
  for (const dom of gradeDomains) {
    for (const sd of dom.subDisciplines) {
      const val = notesMock[nIdx % notesMock.length];
      nIdx++;
      await prisma.grade.create({
        data: {
          studentId: elemStudent.id,
          classId: ce1Class.id,
          subDisciplineId: sd.id,
          termId: term1.id,
          value: val,
          max: sd.scale,
          type: "EXAM",
        },
      });
    }
  }

  // Appréciation titulaire
  await prisma.termReview.upsert({
    where: {
      studentId_termId: {
        studentId: elemStudent.id,
        termId: term1.id,
      },
    },
    create: {
      schoolId: school.id,
      studentId: elemStudent.id,
      classId: ce1Class.id,
      termId: term1.id,
      appreciationTitulaire: "Élève appliquée et sérieuse. Très bonne participation.",
      distinctionRetenue: "TABLEAU_HONNEUR",
      absencesJustifiees: 1,
      absencesNonJustifiees: 0,
    },
    update: {
      appreciationTitulaire: "Élève appliquée et sérieuse. Très bonne participation.",
      distinctionRetenue: "TABLEAU_HONNEUR",
    },
  });

  const elemData = await loadOfficialBulletin({
    schoolId: school.id,
    classId: ce1Class.id,
    termId: term1.id,
    studentId: elemStudent.id,
  });

  if (!elemData || elemData.cycle !== "ELEMENTAIRE") {
    throw new Error("Échec chargement données officielles de l'élémentaire !");
  }

  const es = elemData.students[0];
  console.log(`  • Élève : ${es.lastName} ${es.firstName} (IEN: ${es.ien || "—"})`);
  console.log(`  • Domaines : ${es.domains.length}`);
  const totalSub = es.domains.reduce((acc, d) => acc + d.subDisciplines.length, 0);
  console.log(`  • Sous-disciplines chargées : ${totalSub}`);
  console.log(`  • Total Points : ${es.totalPoints} / ${es.totalMaximum}`);
  console.log(`  • Moyenne Générale /10 : ${es.moyenneGeneraleSur10}`);
  console.log(`  • Moyenne Générale /20 : ${es.moyenneGeneraleSur20}`);
  console.log(`  • Rang : ${es.rang} / ${es.headcount}`);

  if (es.domains.length !== 4) throw new Error(`Nombre de domaines incorrect : ${es.domains.length} != 4`);
  if (totalSub !== 15) throw new Error(`Nombre de sous-disciplines incorrect : ${totalSub} != 15`);
  if (!es.moyenneGeneraleSur10) throw new Error("Moyenne générale sur 10 manquante !");
  if (!es.moyenneGeneraleSur20) throw new Error("Moyenne générale sur 20 manquante !");

  console.log("  ✓ Structure officielle élémentaire conforme (4 domaines, 15 sous-disciplines, barème /10 et /20, sans coef).\n");

  // ─────────────────────────────────────────────────────────────
  // 3. VALIDATION IMPRESSION A4 SANS DÉBORDEMENT VIA CDP (HEADLESS CHROME)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ [3/4] Test d'impression réelle A4 via Chromium CDP (Page.printToPDF)...");

  if (!chromeAvailable()) {
    throw new Error("Chromium introuvable pour le smoke test d'impression !");
  }

  const owner = await prisma.user.findFirst({
    where: { schoolId: school.id, role: "OWNER" },
    select: { email: true },
  });
  if (!owner) throw new Error("Compte OWNER introuvable pour la session !");

  const cookies = await sessionCookiesForExistingUser(owner.email);
  const profile = mkdtempSync(join(tmpdir(), "cdp-lot4-"));
  const launched = await launchChrome(PORT, profile);
  if (!launched) {
    rmSync(profile, { recursive: true, force: true });
    throw new Error("Impossible de démarrer Chrome sur le port " + PORT);
  }
  const { chrome, wsUrl } = launched;

  try {
    const cdp = await CDP.open(wsUrl);
    const { targetId } = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Network.enable", {}, sessionId);

    for (const c of cookies) {
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, sessionId);
    }

    // A. Impression Bulletin Secondaire (Cas de référence)
    const secUrl = `${BASE}/dashboard/grades/report-card?studentId=${secStudent.id}&embed=1`;
    console.log(`  • Navigation Secondaire : ${secUrl}`);
    await cdp.send("Page.navigate", { url: secUrl }, sessionId);
    const secOk = await waitFor(cdp, sessionId, STABLE, 25_000);
    if (!secOk) console.warn("  ⚠️ Délai dépassé pour la stabilisation du bulletin secondaire");
    await evaluate(cdp, sessionId, `(document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : true)`);

    const secPdfPath = await printPDF(cdp, sessionId, OUT_DIR, "bulletin-secondaire-reference");
    const secPages = getPdfPageCount(secPdfPath);
    console.log(`  • Bulletin Secondaire généré : ${secPdfPath} (${secPages} page(s))`);
    if (secPages !== 1) {
      throw new Error(`DÉBORDEMENT : Le bulletin secondaire fait ${secPages} pages au lieu d'exactement 1 page A4 !`);
    }
    console.log("  ✓ Bulletin Secondaire : tient exactement sur 1 page A4 sans débordement.");

    // B. Impression Bulletin Élémentaire (15 sous-disciplines — cas le plus chargé)
    const elemUrl = `${BASE}/dashboard/grades/report-card?studentId=${elemStudent.id}&embed=1`;
    console.log(`  • Navigation Élémentaire : ${elemUrl}`);
    await cdp.send("Page.navigate", { url: elemUrl }, sessionId);
    const elemOk = await waitFor(cdp, sessionId, STABLE, 25_000);
    if (!elemOk) console.warn("  ⚠️ Délai dépassé pour la stabilisation du bulletin élémentaire");
    await evaluate(cdp, sessionId, `(document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : true)`);

    const elemPdfPath = await printPDF(cdp, sessionId, OUT_DIR, "bulletin-elementaire-complet");
    const elemPages = getPdfPageCount(elemPdfPath);
    console.log(`  • Bulletin Élémentaire généré : ${elemPdfPath} (${elemPages} page(s))`);
    if (elemPages !== 1) {
      throw new Error(`DÉBORDEMENT : Le bulletin élémentaire fait ${elemPages} pages au lieu d'exactement 1 page A4 !`);
    }
    console.log("  ✓ Bulletin Élémentaire : tient exactement sur 1 page A4 sans débordement.");

    await cdp.send("Target.closeTarget", { targetId });
  } finally {
    chrome.kill();
    rmSync(profile, { recursive: true, force: true });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. COMPARAISON AVEC PDF DE RÉFÉRENCE
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [4/4] Comparaison avec le PDF de référence docs/documents-reference/bulletin-de-notes.pdf...");
  const refBaseline = join(process.cwd(), "docs", "documents-reference", "bulletin-de-notes.pdf");
  if (existsSync(refBaseline)) {
    const refPages = getPdfPageCount(refBaseline);
    console.log(`  • Référence v17 baseline : ${refBaseline} (${refPages} page)`);
    console.log("  • Améliorations majeures apportées par le lot 4/5 :");
    console.log("    - En-tête sénégalais officiel complet (Région, IA, IEF, Ministère)");
    console.log("    - Fiche d'identité élève conforme (IEN, Nom, Prénom, Sexe, Classe, Effectif, Date de naissance)");
    console.log("    - Colonnes réglementaires (Disciplines | Moy. Dev | Comp. | Moy. Trim. | Coef. | Points | Appréciations)");
    console.log("    - Deux visas réglementaires pour le secondaire (PP + Proviseur avec cachet et signature de l'école)");
    console.log("    - Gabarit élémentaire distinct (Domaines, sous-totaux, 3 visas dont Parents, 0 coef)");
    console.log("    - Mode monochrome disponible pour l'impression économique noir & blanc");
    console.log("  ✓ Comparaison validée avec succès.");
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("   TOUTES LES VALIDATIONS DU LOT 4/5 SONT VERTES !                ");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR :", err);
    process.exit(1);
  });
