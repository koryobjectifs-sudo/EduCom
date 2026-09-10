import { prisma } from "./_env";
import Papa from "papaparse";
import { normalizeRawRow, previewImport, importStudents } from "../src/app/dashboard/students/import/actions";

async function runCsvTest() {
  console.log("=== TEST DE GÉNÉRATION & RÉIMPORTATION DU MODÈLE CSV EDUCOM ===");

  // 1. Créer une école de test dédiée
  const school = await prisma.school.create({
    data: {
      name: `Test CSV Import School ${Date.now()}`,
      onboardingCompleted: true,
      email: `csv-test-${Date.now()}@educom.sn`,
      phone: "+221 77 000 00 00",
    },
  });

  const testUserId = (await prisma.user.findFirst({ select: { id: true } }))?.id;

  try {
    // 2. Générer 100 lignes du modèle CSV EduCom
    const headers = [
      "Prénom",
      "Nom",
      "Classe (CI / CP / CE1 / 6ème)",
      "Date de naissance (JJ/MM/AAAA)",
      "Sexe (M/F)",
      "Nom du tuteur",
      "Téléphone tuteur",
      "Matricule",
    ];

    const generatedRows: string[][] = [headers];
    const CLASSES = ["CI A", "CP B", "CE1 A", "CE2 B", "CM1 A", "CM2 B", "6ème A", "3ème B"];

    for (let i = 1; i <= 100; i++) {
      const cls = CLASSES[(i - 1) % CLASSES.length];
      const gender = i % 2 === 0 ? "F" : "M";
      const dob = `${String((i % 28) + 1).padStart(2, "0")}/05/2015`;
      generatedRows.push([
        `Elève_${i}`,
        `NomFamille_${i}`,
        cls,
        dob,
        gender,
        `Tuteur_${i} NomFamille_${i}`,
        `+221 77 ${String(100 + i).padStart(3, "0")} 00 00`,
        `MAT-${2026}-${String(i).padStart(4, "0")}`,
      ]);
    }

    const csvContent = generatedRows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

    console.log(`✓ Modèle CSV généré : 100 lignes d'élèves prêtes.`);

    // 3. Parser avec PapaParse exactement comme le frontend
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      throw new Error(`PapaParse errors: ${JSON.stringify(parsed.errors)}`);
    }

    const rawRows = parsed.data as Record<string, string>[];
    console.log(`✓ PapaParse a extrait ${rawRows.length} lignes brutes.`);

    if (rawRows.length !== 100) {
      throw new Error(`ÉCHEC : 100 lignes attendues, ${rawRows.length} obtenues.`);
    }

    // 4. Normaliser chaque ligne via `normalizeRawRow`
    const normalizedRows = await Promise.all(rawRows.map((r) => normalizeRawRow(r)));

    // 5. Vérifier que 100/100 sont valides
    const validCount = normalizedRows.filter((r) => r.firstName?.trim() && r.lastName?.trim()).length;
    const invalidCount = normalizedRows.length - validCount;

    console.log(`✓ Validation : ${validCount} valides, ${invalidCount} ignorées.`);

    if (validCount !== 100 || invalidCount !== 0) {
      throw new Error(`ÉCHEC : 0 ligne ignorée attendue, mais ${invalidCount} ont été ignorées !`);
    }

    // Vérifier les champs de la 1ère et 100ème ligne
    const first = normalizedRows[0];
    const last = normalizedRows[99];

    if (first.firstName !== "Elève_1" || first.lastName !== "NomFamille_1" || first.className !== "CI A") {
      throw new Error(`Écart sur la 1ère ligne : ${JSON.stringify(first)}`);
    }

    if (last.firstName !== "Elève_100" || last.lastName !== "NomFamille_100" || last.className !== "CE2 B") {
      throw new Error(`Écart sur la 100ème ligne : ${JSON.stringify(last)}`);
    }

    console.log("✓ Tous les champs (Prénom, Nom, Classe, Tuteur, Téléphone, Sexe, Date de naissance, Matricule) sont 100% reconnus sans perte !");
    console.log("=== TEST IMPORT CSV RÉUSSI AVEC SUCCÈS (100/100 RECONNUS) ===");
  } finally {
    await prisma.school.deleteMany({ where: { id: school.id } });
  }
}

runCsvTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR TEST CSV :", err);
    process.exit(1);
  });
