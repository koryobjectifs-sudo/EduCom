import { prisma } from "./_env";

const SENGCO_NAME = "SENG.CO";
const TEACHER_EMAIL = "prof.maths.test@sengco.educom.sn";

const SUBJECT_CONFIG = [
  { code: "MATH", coef: 5 },
  { code: "PC", coef: 6 },
  { code: "SVT", coef: 6 },
  { code: "FR", coef: 2 },
  { code: "PHIL", coef: 2 },
  { code: "HG", coef: 2 },
  { code: "ANG", coef: 2 },
];

async function main() {
  const isCleanup = process.env.CLEANUP === "1";
  const school = await prisma.school.findFirst({
    where: { name: { contains: SENGCO_NAME } },
    select: { id: true, name: true },
  });

  if (!school) {
    throw new Error(`Établissement ${SENGCO_NAME} introuvable !`);
  }

  const schoolId = school.id;
  const classe = await prisma.class.findFirst({
    where: { schoolId, name: "Terminale S2" },
    select: { id: true, name: true, serie: true, cycle: true },
  });

  if (!classe) {
    throw new Error("Classe Terminale S2 introuvable dans SENG.CO !");
  }

  if (isCleanup) {
    console.log("══════════════════════════════════════════════════════════════════");
    console.log("   NETTOYAGE DU JEU DE TEST SECONDAIRE (SENG.CO ACADEMY)          ");
    console.log("══════════════════════════════════════════════════════════════════");

    // 1. Supprimer l'enseignant de test et ses affectations
    const teacher = await prisma.user.findFirst({ where: { schoolId, email: TEACHER_EMAIL } });
    if (teacher) {
      await prisma.teachingAssignment.deleteMany({ where: { teacherId: teacher.id } });
      await prisma.user.delete({ where: { id: teacher.id } });
      console.log(`✓ Enseignant de test supprimé (${TEACHER_EMAIL}).`);
    }

    // 2. Nettoyer les notes de test
    const gradesDeleted = await prisma.grade.deleteMany({
      where: { classId: classe.id },
    });
    console.log(`✓ ${gradesDeleted.count} note(s) supprimée(s) dans Terminale S2.`);

    console.log("✓ Nettoyage terminé avec succès.\n");
    return;
  }

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("   INSTALLATION DU JEU DE TEST SECONDAIRE (SENG.CO ACADEMY)       ");
  console.log("══════════════════════════════════════════════════════════════════");

  // 1. Rattacher les 7 matières officielles à Terminale S2 avec leurs coefficients
  console.log(`\n▶ Rattachement des 7 matières à "${classe.name}"...`);
  let attachedCount = 0;
  for (const cfg of SUBJECT_CONFIG) {
    const subject = await prisma.subject.findFirst({
      where: { schoolId, code: cfg.code },
      select: { id: true, name: true, code: true },
    });
    if (!subject) {
      throw new Error(`Matière avec le code "${cfg.code}" introuvable dans SENG.CO !`);
    }

    await prisma.classSubject.upsert({
      where: {
        classId_subjectId: {
          classId: classe.id,
          subjectId: subject.id,
        },
      },
      create: {
        classId: classe.id,
        subjectId: subject.id,
        coefficient: cfg.coef,
      },
      update: {
        coefficient: cfg.coef,
      },
    });
    console.log(`  ✓ ${subject.code?.padEnd(5)} : ${subject.name} (coef: ${cfg.coef}) rattaché`);
    attachedCount++;
  }

  // 2. Créer l'enseignant de test affecté UNIQUEMENT aux Mathématiques
  console.log("\n▶ Création du compte TEACHER de test (Maths uniquement)...");
  const mathSubject = await prisma.subject.findFirst({
    where: { schoolId, code: "MATH" },
    select: { id: true, name: true },
  });

  let teacher = await prisma.user.findFirst({ where: { schoolId, email: TEACHER_EMAIL } });
  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        email: TEACHER_EMAIL,
        firstName: "Amadou",
        lastName: "Fall",
        role: "TEACHER",
        schoolId,
      },
    });
    console.log(`  ✓ Compte enseignant créé : ${teacher.firstName} ${teacher.lastName} (${teacher.email})`);
  } else {
    console.log(`  • Compte enseignant existant : ${teacher.email}`);
  }

  // 3. Affecter l'enseignant UNIQUEMENT à Mathématiques dans Terminale S2
  await prisma.teachingAssignment.deleteMany({ where: { teacherId: teacher.id } });
  await prisma.teachingAssignment.create({
    data: {
      teacherId: teacher.id,
      classId: classe.id,
      subjectId: mathSubject!.id,
      schoolId,
    },
  });
  console.log(`  ✓ Affectation unique : ${teacher.firstName} ${teacher.lastName} → Terminale S2 / Mathématiques.`);

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("   JEU DE TEST SECONDAIRE PRÊT (7 MATIÈRES COEF 25 + TEACHER)    ");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR :", err);
    process.exit(1);
  });
