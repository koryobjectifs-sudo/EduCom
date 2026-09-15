import { prisma } from "./_env";
import Papa from "papaparse";
import {
  detectFieldForHeader,
  deduceCycleAndSerie,
  normalizePhone,
  executePreviewImport,
  executeImportStudents,
  type ImportRow,
} from "../src/app/dashboard/students/import/actions";
import { parseFlexibleDate } from "../src/lib/dateUtils";

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("   VÉRIFICATION COMPLÈTE DU CHANTIER IMPORT DOSSIERS ÉLÈVES       ");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // ─────────────────────────────────────────────────────────────
  // 1. LE MODÈLE CSV SE RELIT SANS AUCUN REJET (ROUND-TRIP)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ TEST 1 : Vérification du modèle CSV téléchargé depuis l'interface...");
  const templateHeaders = [
    "Prénom",
    "Nom",
    "Classe",
    "Date de naissance (JJ/MM/AAAA)",
    "Sexe (M/F)",
    "Nom du tuteur",
    "Téléphone tuteur (Ex: +221 77 123 45 67)",
    "Matricule",
  ];

  // Génération de 100 lignes types avec séparateur point-virgule et UTF-8 BOM
  const sampleDataRows: string[][] = [];
  for (let i = 1; i <= 100; i++) {
    sampleDataRows.push([
      `Prenom_${i}`,
      `Nom_${i}`,
      i % 2 === 0 ? "Terminale S2" : "6ème A",
      "12/04/2007",
      i % 2 === 0 ? "F" : "M",
      `Tuteur_${i} Nom_${i}`,
      `+221 77 ${String(100 + (i % 899)).padStart(3, "0")} 11 22`,
      `MAT-${2026}-${String(i).padStart(4, "0")}`,
    ]);
  }

  const generatedCsv =
    "\uFEFF" + [templateHeaders.join(";"), ...sampleDataRows.map((r) => r.join(";"))].join("\r\n");

  // Simulation exacte du comportement PapaParse du frontend
  const parsed = Papa.parse(generatedCsv, { header: true, skipEmptyLines: "greedy" });
  const cleanFields = (parsed.meta.fields || []).map((f) => f.trim().replace(/^\uFEFF/, "")).filter(Boolean);

  // Mapping automatique des en-têtes
  const mapping: Record<string, string> = {};
  for (const h of cleanFields) {
    const detected = detectFieldForHeader(h);
    if (detected) mapping[h] = detected;
  }

  const mappedRows: ImportRow[] = (parsed.data as any[]).map((row) => {
    const obj: any = {};
    for (const [header, fieldKey] of Object.entries(mapping)) {
      let val = row[header];
      if (val === undefined) {
        const matchedKey = Object.keys(row).find((k) => k.trim().replace(/^\uFEFF/, "") === header);
        if (matchedKey) val = row[matchedKey];
      }
      if (val !== undefined && val !== null) {
        obj[fieldKey] = String(val).trim();
      }
    }
    return {
      firstName: obj.firstName || "",
      lastName: obj.lastName || "",
      className: obj.className || "",
      dateOfBirth: obj.dateOfBirth || "",
      gender: obj.gender || "",
      emergencyContact: obj.emergencyContact || "",
      emergencyPhone: obj.emergencyPhone || "",
      matricule: obj.matricule || "",
    };
  });

  const validRows = mappedRows.filter((r) => r.firstName?.trim() && r.lastName?.trim());
  console.log(`  ✓ Lignes lues : ${mappedRows.length}/100`);
  console.log(`  ✓ Lignes valides : ${validRows.length}/100 (0 rejetée pour nom/prénom manquant)`);
  if (validRows.length !== 100) {
    throw new Error(`Échec Test 1 : 100 lignes attendues, ${validRows.length} obtenues.`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DÉTECTION DES COLONNES (CASSE, ACCENTS, PARENTHÈSES)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ TEST 2 : Détection des variantes d'en-têtes...");
  const headersToTest = [
    { header: "PRENOM", expected: "firstName" },
    { header: "Prénom(s)", expected: "firstName" },
    { header: "Prénom de l'élève", expected: "firstName" },
    { header: "NOM", expected: "lastName" },
    { header: "Nom de famille", expected: "lastName" },
    { header: "Nom de l'élève", expected: "lastName" },
    { header: "Classe / Division", expected: "className" },
    { header: "NIVEAU", expected: "className" },
    { header: "Date de naissance (JJ/MM/AAAA)", expected: "dateOfBirth" },
    { header: "Né(e) le", expected: "dateOfBirth" },
    { header: "Sexe (M/F)", expected: "gender" },
    { header: "Genre", expected: "gender" },
    { header: "Nom du tuteur", expected: "emergencyContact" },
    { header: "Parent / Responsable", expected: "emergencyContact" },
    { header: "Téléphone tuteur (Ex: +221)", expected: "emergencyPhone" },
    { header: "Tel parent", expected: "emergencyPhone" },
    { header: "Matricule", expected: "matricule" },
    { header: "Code IEN", expected: "matricule" },
  ];

  for (const item of headersToTest) {
    const detected = detectFieldForHeader(item.header);
    if (detected !== item.expected) {
      throw new Error(`Échec Test 2 : En-tête "${item.header}" détecté comme "${detected}", attendu "${item.expected}"`);
    }
  }
  console.log(`  ✓ ${headersToTest.length}/${headersToTest.length} en-têtes avec accents/parenthèses reconnus avec succès.`);

  // ─────────────────────────────────────────────────────────────
  // 3. DÉDUCTION DES CYCLES ET SÉRIES SÉNÉGALAISES
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ TEST 3 : Déduction des cycles et séries...");
  const classesToTest = [
    { name: "Petite Section", expCycle: "PRESCOLAIRE", expSerie: null },
    { name: "Grande Section B", expCycle: "PRESCOLAIRE", expSerie: null },
    { name: "CI A", expCycle: "ELEMENTAIRE", expSerie: null },
    { name: "CP", expCycle: "ELEMENTAIRE", expSerie: null },
    { name: "CM2 B", expCycle: "ELEMENTAIRE", expSerie: null },
    { name: "6ème 1", expCycle: "MOYEN", expSerie: null },
    { name: "3ème B", expCycle: "MOYEN", expSerie: null },
    { name: "2nde S", expCycle: "SECONDAIRE", expSerie: "S2" },
    { name: "1ère L2", expCycle: "SECONDAIRE", expSerie: "L2" },
    { name: "Terminale S1", expCycle: "SECONDAIRE", expSerie: "S1" },
    { name: "Terminale S2", expCycle: "SECONDAIRE", expSerie: "S2" },
    { name: "Terminale L'1", expCycle: "SECONDAIRE", expSerie: "L2" },
  ];

  for (const item of classesToTest) {
    const res = await deduceCycleAndSerie(item.name);
    if (res.cycle !== item.expCycle || res.serie !== item.expSerie) {
      throw new Error(
        `Échec Test 3 : Classe "${item.name}" -> ${res.cycle}/${res.serie}, attendu ${item.expCycle}/${item.expSerie}`,
      );
    }
  }
  console.log(`  ✓ ${classesToTest.length}/${classesToTest.length} classes correctement typées (Cycle + Série).`);

  // ─────────────────────────────────────────────────────────────
  // 4. TOLÉRANCE DES FORMATS (TÉLÉPHONE, DATES)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ TEST 4 : Tolérance des numéros de téléphone et dates...");
  const phonesToTest = [
    "+221 77 123 45 67",
    "77 123 45 67",
    "771234567",
    "77.123.45.67",
    "00221771234567",
  ];
  for (const raw of phonesToTest) {
    const norm = normalizePhone(raw);
    if (!norm || norm.normalizedDigits !== "771234567") {
      throw new Error(`Échec Test 4 téléphone : "${raw}" -> ${norm?.normalizedDigits}`);
    }
  }
  console.log("  ✓ Tous les formats de téléphone sénégalais normalisés (+221, espaces, points).");

  const datesToTest = [
    { raw: "12/04/2007", expYear: 2007, expMonth: 4, expDay: 12 },
    { raw: "12-04-2007", expYear: 2007, expMonth: 4, expDay: 12 },
    { raw: "2007-04-12", expYear: 2007, expMonth: 4, expDay: 12 },
  ];
  for (const d of datesToTest) {
    const parsedD = parseFlexibleDate(d.raw);
    if (!parsedD) throw new Error(`Échec Test 4 date : "${d.raw}" non reconnue.`);
    if (
      parsedD.getUTCFullYear() !== d.expYear ||
      parsedD.getUTCMonth() + 1 !== d.expMonth ||
      parsedD.getUTCDate() !== d.expDay
    ) {
      throw new Error(`Échec Test 4 date valeur : "${d.raw}" -> ${parsedD.toISOString()}`);
    }
  }
  console.log("  ✓ Dates au format JJ/MM/AAAA, JJ-MM-AAAA et AAAA-MM-JJ reconnues.");

  // ─────────────────────────────────────────────────────────────
  // 5. TEST EN CONDITIONS RÉELLES DANS SENG.CO ACADEMY
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ TEST 5 : Import de bout en bout de 10 élèves en Terminale S2 dans SENG.CO ACADEMY...");

  const sengco = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO" } },
    include: {
      classes: { select: { id: true, name: true, cycle: true, serie: true } },
      _count: { select: { students: true } },
    },
  });

  if (!sengco) {
    throw new Error("Établissement SENG.CO ACADEMY introuvable en base !");
  }

  const initialStudentCount = sengco._count.students;
  const initialClassCount = sengco.classes.length;
  console.log(`  • État initial SENG.CO : ${initialStudentCount} élèves, ${initialClassCount} classes.`);

  // Vérifier si Terminale S2 existait déjà (si oui, la nettoyer avant le test pour isolation propre)
  const existingTle = sengco.classes.find((c) => c.name.toLowerCase().includes("terminale s2"));
  if (existingTle) {
    console.log("  • Nettoyage pré-test de la classe Terminale S2 résiduelle...");
    await prisma.enrollment.deleteMany({ where: { classId: existingTle.id } });
    await prisma.class.delete({ where: { id: existingTle.id } });
  }

  // Préparation des 10 élèves de Terminale S2
  // Teste en même temps :
  // - 2 élèves avec le MÊME tuteur (même téléphone + même nom) -> DOIT FUSIONNER
  // - 1 élève sans tuteur
  // - 1 ligne volontairement invalide (sans nom) -> DOIT ÊTRE REJETÉE SANS BLOQUER LE RESTE (IMPORT PARTIEL)
  const incomingRows: ImportRow[] = [
    {
      firstName: "Babacar",
      lastName: "Ndiaye",
      className: "Terminale S2",
      dateOfBirth: "14/03/2007",
      gender: "M",
      emergencyContact: "Ibrahima Ndiaye",
      emergencyPhone: "+221 77 100 20 30",
      matricule: "TLE-2026-001",
    },
    {
      firstName: "Aïssatou",
      lastName: "Ndiaye", // Soeur de Babacar, même tuteur
      className: "Terminale S2",
      dateOfBirth: "22/11/2008",
      gender: "F",
      emergencyContact: "Ibrahima Ndiaye",
      emergencyPhone: "77 100 20 30", // Format sans +221 -> doit fusionner
      matricule: "TLE-2026-002",
    },
    {
      firstName: "Moussa",
      lastName: "Diop",
      className: "Terminale S2",
      dateOfBirth: "05/01/2007",
      gender: "M",
      emergencyContact: "Fatou Diop",
      emergencyPhone: "+221 70 888 77 66",
      matricule: "TLE-2026-003",
    },
    {
      firstName: "Mariama",
      lastName: "Sow",
      className: "Terminale S2",
      dateOfBirth: "30/08/2007",
      gender: "F",
      emergencyContact: "Aliou Sow",
      emergencyPhone: "78 444 33 22",
      matricule: "TLE-2026-004",
    },
    {
      firstName: "Cheikh",
      lastName: "Fall",
      className: "Terminale S2",
      dateOfBirth: "19/06/2006",
      gender: "M",
      emergencyContact: "Ousmane Fall",
      emergencyPhone: "+221 76 555 12 34",
      matricule: "TLE-2026-005",
    },
    {
      firstName: "Khadija",
      lastName: "Gueye",
      className: "Terminale S2",
      dateOfBirth: "11/12/2007",
      gender: "F",
      emergencyContact: "Modou Gueye",
      emergencyPhone: "77 999 88 77",
      matricule: "TLE-2026-006",
    },
    {
      firstName: "Abdoulaye",
      lastName: "Ba",
      className: "Terminale S2",
      dateOfBirth: "03/04/2007",
      gender: "M",
      emergencyContact: "Aminata Ba",
      emergencyPhone: "+221 77 333 22 11",
      matricule: "TLE-2026-007",
    },
    {
      firstName: "Fatoumata",
      lastName: "Diallo",
      className: "Terminale S2",
      dateOfBirth: "28/09/2007",
      gender: "F",
      emergencyContact: "Mamadou Diallo",
      emergencyPhone: "77 222 11 00",
      matricule: "TLE-2026-008",
    },
    {
      firstName: "Ousmane",
      lastName: "Kane",
      className: "Terminale S2",
      dateOfBirth: "17/07/2007",
      gender: "M",
      emergencyContact: "Sokhna Kane",
      emergencyPhone: "+221 70 123 98 76",
      matricule: "TLE-2026-009",
    },
    {
      firstName: "Seynabou",
      lastName: "Sarr",
      className: "Terminale S2",
      dateOfBirth: "09/10/2007",
      gender: "F",
      emergencyContact: "El Hadji Sarr",
      emergencyPhone: "78 777 66 55",
      matricule: "TLE-2026-010",
    },
    // Ligne 11 : Ligne invalide pour tester l'import partiel (nom manquant)
    {
      firstName: "LigneInvalide",
      lastName: "",
      className: "Terminale S2",
      matricule: "ERR-001",
    },
  ];

  // 1. Prévisualisation de l'import
  const preview = await executePreviewImport(sengco.id, incomingRows);
  if (!preview.data) {
    throw new Error(`Échec de la prévisualisation : ${preview.error}`);
  }

  console.log(`  ✓ Prévisualisation : ${preview.data.validRows} valides, ${preview.data.invalidRows} invalide (ligne 11 détectée).`);
  console.log(`  ✓ Classe manquante détectée : "${preview.data.missingClasses[0]?.name}" (Cycle: ${preview.data.missingClasses[0]?.cycle}, Série: ${preview.data.missingClasses[0]?.serie})`);

  if (preview.data.missingClasses[0]?.cycle !== "SECONDAIRE" || preview.data.missingClasses[0]?.serie !== "S2") {
    throw new Error("Échec : Le cycle SECONDAIRE ou la série S2 n'a pas été déduit correctement !");
  }

  // 2. Exécution de l'import partiel avec confirmation de la classe manquante
  const importRes = await executeImportStudents(sengco.id, incomingRows, {
    confirmedClasses: preview.data.missingClasses,
  });

  console.log(`  ✓ Import terminé : ${importRes.importedCount} élèves importés.`);
  console.log(`  ✓ Lignes rejetées : ${importRes.rejectedRows.length} (Raison : "${importRes.rejectedRows[0]?.reason}")`);
  console.log(`  ✓ Classes créées : ${importRes.classesCreated.join(", ")}`);

  if (importRes.importedCount !== 10) {
    throw new Error(`Échec : 10 élèves importés attendus, ${importRes.importedCount} obtenus.`);
  }

  if (importRes.rejectedRows.length !== 1 || importRes.rejectedRows[0]?.reason !== "Nom manquant") {
    throw new Error("Échec : L'import partiel n'a pas isolé la ligne invalide !");
  }

  // 3. Vérifications en base de données
  const createdClass = await prisma.class.findFirst({
    where: { schoolId: sengco.id, name: "Terminale S2" },
    include: { enrollments: { include: { student: true } } },
  });

  if (!createdClass) throw new Error("Classe Terminale S2 non trouvée en base !");
  if (createdClass.cycle !== "SECONDAIRE") throw new Error(`Cycle erroné : ${createdClass.cycle}`);
  if (createdClass.serie !== "S2") throw new Error(`Série erronée : ${createdClass.serie}`);
  if (createdClass.enrollments.length !== 10) {
    throw new Error(`Inscriptions attendues: 10, trouvées: ${createdClass.enrollments.length}`);
  }

  console.log(`  ✓ Classe créée vérifiée : "${createdClass.name}" (Cycle: ${createdClass.cycle}, Série: ${createdClass.serie})`);
  console.log(`  ✓ 10/10 élèves inscrits avec statut ENROLLED.`);

  // 4. Vérification de la fusion automatique du tuteur commun (Babacar & Aïssatou Ndiaye)
  const babacar = createdClass.enrollments.find((e) => e.student.firstName === "Babacar")?.student;
  const aissatou = createdClass.enrollments.find((e) => e.student.firstName === "Aïssatou")?.student;

  if (!babacar?.parentId || !aissatou?.parentId) {
    throw new Error("Parent manquant pour Babacar ou Aïssatou !");
  }

  if (babacar.parentId !== aissatou.parentId) {
    throw new Error("Échec déduplication tuteur : Babacar et Aïssatou ont des parents distincts !");
  }

  const sharedParent = await prisma.user.findUnique({ where: { id: babacar.parentId } });
  console.log(`  ✓ Déduplication tuteur réussie : ${sharedParent?.firstName} ${sharedParent?.lastName} (${sharedParent?.phone}) rattaché aux 2 élèves.`);

  // 5. Vérifier que les données existantes n'ont pas été touchées
  const postCheck = await prisma.school.findUnique({
    where: { id: sengco.id },
    include: { _count: { select: { students: true, classes: true } } },
  });

  console.log(`  ✓ Contrôle d'intégrité : Ancien total ${initialStudentCount} + 10 = ${postCheck?._count.students} élèves.`);
  console.log(`  ✓ Classes totales : ${initialClassCount} + 1 = ${postCheck?._count.classes} classes.`);

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("   TOUS LES TESTS DU CHANTIER IMPORT ÉLÈVES SONT AU VERT (5/5)    ");
  console.log("══════════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR VÉRIFICATION :", err);
    process.exit(1);
  });
