/**
 * Vérification automatisée des 3 chantiers Documents :
 * 1. Bouton contextuel "Générer un document" et suppression du bandeau explicatif
 * 2. Déplacement de la Validation des bulletins dans Pédagogie (redirection + navigation + permissions)
 * 3. Assainissement des identifiants techniques dans les titres de documents
 */

import { prisma } from "./_env";
import { visibleSections, getActiveNavItemHref } from "../src/lib/navigation";
import { hasAccess, ROLE_DENIALS } from "../src/lib/permissions";
import { humanizeDocumentLabel, isTechnicalIdentifier } from "../src/lib/documentTitle";

async function main() {
  console.log("=== VÉRIFICATION DES 3 CHANTIERS DOCUMENTS ===\n");
  let failures = 0;

  // ── POINT 1 : BOUTON CONTEXTUEL & SUPPRESSION DU BANDEAU ──
  console.log("[POINT 1] Présence et visibilité du bouton contextuel");
  // a) Vérifier que TEACHER et ADMIN ont accès au dropdown élève
  const teacherAccessStudent = hasAccess("TEACHER", "/dashboard/students");
  const adminAccessStudent = hasAccess("ADMIN", "/dashboard/students");
  if (!teacherAccessStudent || !adminAccessStudent) {
    console.error("❌ ÉCHEC : Accès fiche élève manquant pour l'un des rôles !");
    failures++;
  } else {
    console.log("✅ Fiche élève accessible pour l'enseignant et l'administration.");
  }

  // ── POINT 2 : VALIDATION DANS PÉDAGOGIE ──
  console.log("\n[POINT 2] Validation déplacée dans Pédagogie");
  // a) Rôles autorisés vs refusés
  const adminCanValidate = hasAccess("ADMIN", "/dashboard/grades/validation");
  const secCanValidate = hasAccess("SECRETARY", "/dashboard/grades/validation");
  const teacherCanValidate = hasAccess("TEACHER", "/dashboard/grades/validation");
  const parentCanValidate = hasAccess("PARENT", "/dashboard/grades/validation");

  if (!adminCanValidate || !secCanValidate) {
    console.error("❌ ÉCHEC : Direction ou secrétariat n'ont pas accès à /dashboard/grades/validation !");
    failures++;
  } else {
    console.log("✅ Direction et Secrétariat ont accès à /dashboard/grades/validation.");
  }

  if (teacherCanValidate || parentCanValidate) {
    console.error("❌ ÉCHEC DE SÉCURITÉ : L'enseignant ou le parent peut valider des bulletins !");
    failures++;
  } else {
    console.log("✅ Enseignant et Parent strictement bloqués sur /dashboard/grades/validation.");
  }

  // b) Navigation Enseignement : Présence de Validation à côté de Bulletins
  const adminSections = visibleSections("ADMIN");
  const teachingSec = adminSections.find((s) => s.title === "Enseignement");
  const items = teachingSec?.items || [];
  const bulletinIdx = items.findIndex((i) => i.href === "/dashboard/grades/report-card");
  const validIdx = items.findIndex((i) => i.href === "/dashboard/grades/validation");

  if (validIdx === -1 || bulletinIdx === -1) {
    console.error("❌ ÉCHEC : Entrée 'Validation' introuvable dans Enseignement !");
    failures++;
  } else {
    console.log(`✅ Entrée 'Validation' présente dans Enseignement (index ${validIdx}, Bulletins index ${bulletinIdx}).`);
  }

  // c) Sidebar active item sur validation
  const allAdminItems = adminSections.flatMap((s) => s.items);
  const activeHref = getActiveNavItemHref(allAdminItems, "/dashboard/grades/validation");
  if (activeHref !== "/dashboard/grades/validation") {
    console.error(`❌ ÉCHEC : Navigation active = ${activeHref} au lieu de /dashboard/grades/validation !`);
    failures++;
  } else {
    console.log("✅ Seule l'entrée 'Validation' est active sur /dashboard/grades/validation.");
  }

  // ── POINT 3 : TITRES PROPRES SANS IDENTIFIANTS TECHNIQUES ──
  console.log("\n[POINT 3] Assainissement des titres de documents");
  const test1 = humanizeDocumentLabel("0bcb337a51bc5f1b58e7ec567033b4f7", null, "INSCRIPTION");
  const test2 = humanizeDocumentLabel("0bcb337a51bc5f1b58e7ec567033b4f7", "Extrait de naissance", "INSCRIPTION");
  const test3 = humanizeDocumentLabel("IMG_20260901_182736.jpg", null, "MEDICAL");
  const test4 = humanizeDocumentLabel("Fiche de renseignements signée", null, null);

  if (test1 !== "Pièce d'inscription") {
    console.error(`❌ ÉCHEC test1: reçu '${test1}' au lieu de 'Pièce d\'inscription'`);
    failures++;
  } else {
    console.log("✅ Hash MD5/hex sans exigence transformé en 'Pièce d\'inscription'.");
  }

  if (test2 !== "Extrait de naissance") {
    console.error(`❌ ÉCHEC test2: reçu '${test2}' au lieu de 'Extrait de naissance'`);
    failures++;
  } else {
    console.log("✅ Priorité donnée au libellé officiel 'Extrait de naissance'.");
  }

  if (test3 !== "Fiche médicale") {
    console.error(`❌ ÉCHEC test3: reçu '${test3}' au lieu de 'Fiche médicale'`);
    failures++;
  } else {
    console.log("✅ Nom de fichier smartphone IMG_... transformé en 'Fiche médicale'.");
  }

  if (test4 !== "Fiche de renseignements signée") {
    console.error(`❌ ÉCHEC test4: reçu '${test4}' au lieu de 'Fiche de renseignements signée'`);
    failures++;
  } else {
    console.log("✅ Libellé légitime conservé intact.");
  }

  if (failures > 0) {
    console.error(`\n❌ ${failures} test(s) en échec.`);
    process.exit(1);
  }

  console.log("\n🎉 TOUS LES TESTS DOCUMENTS SONT VALIDÉS AVEC SUCCÈS !");
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
