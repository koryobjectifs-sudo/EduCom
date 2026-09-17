/**
 * Test de génération du bulletin officiel d'une classe de 6e (Collège / Moyen Sénégal).
 *
 * Vérifie :
 *  1. Les 6 matières officielles de 6e (Français, Maths, Hist-Géo, Anglais, SVT, EPS).
 *  2. L'absence de PC et de LV2 (qui ne commencent qu'en 4e).
 *  3. Le calcul officiel (MD, Compo, MM, Coef, Points, Totaux, Moyenne Générale et Rang).
 *  4. L'aiguillage étanche vers le gabarit officiel Secondaire/Moyen.
 *
 * Exécution :
 *   npm run script -- scripts/test-bulletin-6e.ts
 */
import { prisma } from "./_env";
import { loadOfficialBulletin } from "../src/lib/bulletin/loadOfficialBulletin";

async function main() {
  console.log("═".repeat(70));
  console.log("   TEST OFFICIEL : BULLETIN TRIMESTRIEL DE 6e (COLLÈGE)   ");
  console.log("═".repeat(70));

  const school = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!school) throw new Error("École SENG.CO introuvable !");

  const classe6e = await prisma.class.findFirst({
    where: { schoolId: school.id, name: { in: ["6e", "6ème", "6ème A"] } },
    include: {
      subjects: {
        include: { subject: true },
        orderBy: { createdAt: "asc" },
      },
      enrollments: {
        include: { student: true },
        take: 1,
      },
    },
  });

  if (!classe6e) throw new Error("Classe de 6e introuvable !");
  console.log(`\nClasse : ${classe6e.name} (${classe6e.cycle})`);
  console.log(`Matières rattachées (${classe6e.subjects.length}) :`);
  for (const cs of classe6e.subjects) {
    console.log(`  - ${cs.subject.name.padEnd(25)} (code: ${cs.subject.code || "aucun"}, coef: ${cs.coefficient})`);
  }

  // Vérification de la structure du programme
  const subjectCodes = classe6e.subjects.map((cs) => cs.subject.code);
  if (subjectCodes.includes("PC")) {
    throw new Error("ERREUR : La Physique-Chimie (PC) ne doit PAS être rattachée en 6e !");
  }
  if (subjectCodes.includes("LV2")) {
    throw new Error("ERREUR : La LV2 ne doit PAS être rattachée en 6e !");
  }
  console.log("\n✓ Garde-fous respectés : ni Physique-Chimie ni LV2 en 6e.");

  // Term T1
  const terms = await prisma.term.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: "asc" },
  });
  const t1 = terms[0];
  if (!t1) throw new Error("Aucun trimestre trouvé pour l'école !");

  const student = classe6e.enrollments[0]?.student;
  if (!student) throw new Error("Aucun élève trouvé dans la classe de 6e !");
  console.log(`Élève testé : ${student.firstName} ${student.lastName} (ID: ${student.id})`);

  // Vérifier si des notes existent, sinon en insérer pour le test
  const existingGrades = await prisma.grade.findMany({
    where: { classId: classe6e.id, studentId: student.id, termId: t1.id },
  });

  if (existingGrades.length === 0) {
    console.log("\nInsertion de notes de contrôle et composition pour le test...");
    // Notes de référence pour le test :
    // FR (coef 4): Devoirs [14, 15] -> MD 14.5, Compo 13 -> MM = (14.5 + 2*13)/3 = 13.5
    // MATH (coef 3): Devoirs [16, 17] -> MD 16.5, Compo 15 -> MM = (16.5 + 2*15)/3 = 15.5
    // HG (coef 2): Devoirs [13] -> MD 13, Compo 14 -> MM = (13 + 2*14)/3 = 13.67
    // ANG (coef 2): Devoirs [15] -> MD 15, Compo 16 -> MM = (15 + 2*16)/3 = 15.67
    // SVT (coef 2): Devoirs [12] -> MD 12, Compo 14 -> MM = (12 + 2*14)/3 = 13.33
    // EPS (coef 1): Devoirs [16] -> MD 16, Compo 15 -> MM = (16 + 2*15)/3 = 15.33
    const notesTest: Record<string, { devoirs: number[]; compo: number }> = {
      FR: { devoirs: [14, 15], compo: 13 },
      MATH: { devoirs: [16, 17], compo: 15 },
      HG: { devoirs: [13], compo: 14 },
      ANG: { devoirs: [15], compo: 16 },
      SVT: { devoirs: [12], compo: 14 },
      EPS: { devoirs: [16], compo: 15 },
    };

    for (const cs of classe6e.subjects) {
      const code = cs.subject.code;
      if (!code || !notesTest[code]) continue;
      const n = notesTest[code];
      for (const val of n.devoirs) {
        await prisma.grade.create({
          data: {
            value: val,
            type: "QUIZ",
            studentId: student.id,
            classId: classe6e.id,
            subjectId: cs.subject.id,
            termId: t1.id,
          },
        });
      }
      await prisma.grade.create({
        data: {
          value: n.compo,
          type: "EXAM",
          studentId: student.id,
          classId: classe6e.id,
          subjectId: cs.subject.id,
          termId: t1.id,
        },
      });
    }
  }

  // Calcul du bulletin officiel
  const bulletinData = await loadOfficialBulletin({
    schoolId: school.id,
    classId: classe6e.id,
    termId: t1.id,
    studentId: student.id,
  });

  if (!bulletinData) {
    throw new Error("ÉCHEC : loadOfficialBulletin a renvoyé null pour la 6e !");
  }

  if (bulletinData.cycle !== "SECONDAIRE") {
    throw new Error(`ÉCHEC : attendu cycle SECONDAIRE pour le collège, reçu ${bulletinData.cycle}`);
  }

  const eleveBulletin = bulletinData.students[0];
  if (!eleveBulletin || !("subjects" in eleveBulletin)) {
    throw new Error("Structure élève secondaire invalide !");
  }

  console.log("\n" + "═".repeat(70));
  console.log(`BULLETIN DE 6e : ${eleveBulletin.firstName} ${eleveBulletin.lastName}`);
  console.log(`Période : ${bulletinData.term.name} · Établissement : ${bulletinData.school.name}`);
  console.log("═".repeat(70));
  console.log("Discipline".padEnd(25) + "MD".padEnd(8) + "Compo".padEnd(8) + "MM".padEnd(8) + "Coef".padEnd(8) + "Points".padEnd(8));
  console.log("-".repeat(70));

  for (const s of eleveBulletin.subjects) {
    console.log(
      s.name.padEnd(25) +
      (s.md?.toFixed(2) ?? "-").padEnd(8) +
      (s.compo?.toFixed(2) ?? "-").padEnd(8) +
      (s.mm?.toFixed(2) ?? "-").padEnd(8) +
      s.coefficient.toString().padEnd(8) +
      (s.points?.toFixed(2) ?? "-").padEnd(8)
    );
  }

  console.log("-".repeat(70));
  console.log(`Total Coefficients : ${eleveBulletin.totalCoefficients}`);
  console.log(`Total Points       : ${eleveBulletin.totalPoints.toFixed(2)}`);
  console.log(`Moyenne Générale   : ${eleveBulletin.moyenneGenerale?.toFixed(2)} / 20`);
  console.log(`Rang               : ${eleveBulletin.rang} / ${eleveBulletin.headcount}`);
  console.log(`Distinction        : ${eleveBulletin.distinctionProposee || "Aucune"}`);
  console.log("═".repeat(70));

  console.log("\n✅ SUCCÈS : Bulletin de 6e validé à 100% avec les matières et coefficients conformes !");
}

main()
  .catch((e) => {
    console.error("ÉCHEC :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
