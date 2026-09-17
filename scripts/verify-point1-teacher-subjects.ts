import { prisma } from "./_env";
import {
  getSecondaireContextWithActor,
  saveDevoirGradeWithActor,
  saveCompositionGradeWithActor,
  saveSubjectAppreciationWithActor,
} from "../src/app/dashboard/grades/secondaire/actions";

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("   VÉRIFICATION POINT 1 : FILTRAGE MATIÈRES & SÉCURITÉ SERVEUR   ");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const school = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO" } },
    select: { id: true, name: true },
  });
  if (!school) throw new Error("École SENG.CO introuvable !");

  const classe4e = await prisma.class.findFirst({
    where: { schoolId: school.id, name: { in: ["4e", "4ème"] } },
    include: { subjects: { include: { subject: true } } },
  });
  if (!classe4e) throw new Error("Classe 4e introuvable !");
  console.log(`• Classe testée : "${classe4e.name}" (${classe4e.subjects.length} matières rattachées)`);

  const teacher = await prisma.user.findFirst({
    where: { schoolId: school.id, email: "prof.maths.test@sengco.educom.sn" },
  });
  if (!teacher) throw new Error("Compte prof.maths.test@sengco.educom.sn introuvable !");

  const mathSubject = classe4e.subjects.find((s) => s.subject.name.toLowerCase().includes("math"))?.subject;
  const anglaisSubject = classe4e.subjects.find((s) => s.subject.name.toLowerCase().includes("anglais"))?.subject;
  if (!mathSubject || !anglaisSubject) throw new Error("Matières Mathématiques ou Anglais introuvables sur 4e !");

  // Assurer l'affectation réelle : prof.maths.test -> 4e / Mathématiques
  await prisma.teachingAssignment.deleteMany({
    where: { teacherId: teacher.id, classId: classe4e.id },
  });
  await prisma.teachingAssignment.create({
    data: {
      teacherId: teacher.id,
      classId: classe4e.id,
      subjectId: mathSubject.id,
      schoolId: school.id,
    },
  });
  console.log(`• Affectation réelle établie : ${teacher.email} -> 4e / ${mathSubject.name}`);

  const teacherActor = {
    userId: teacher.id,
    schoolId: school.id,
    role: teacher.role,
  };

  const adminActor = {
    userId: "admin-verification-id",
    schoolId: school.id,
    role: "ADMIN",
  };

  // 1. Test de getSecondaireContext pour TEACHER
  console.log("\n▶ [1/4] Test des matières proposées à prof.maths.test@ sur 4e...");
  const teacherCtx = await getSecondaireContextWithActor(teacherActor, classe4e.id);
  if (!teacherCtx.ok) {
    throw new Error(`Échec getSecondaireContext: ${teacherCtx.error}`);
  }

  console.log(`  • Matières visibles : [${teacherCtx.allSubjects.map((s) => s.name).join(", ")}]`);
  if (teacherCtx.allSubjects.length !== 1 || teacherCtx.allSubjects[0].id !== mathSubject.id) {
    throw new Error(`FAILLE : Le professeur de maths voit d'autres matières que Mathématiques ! Vu : ${JSON.stringify(teacherCtx.allSubjects)}`);
  }
  console.log("  ✅ SUCCÈS : prof.maths.test@ ne voit QUE Mathématiques (1 seule matière proposée).");

  // 2. Test refus Server Action saveDevoirGrade sur Anglais (non affecté)
  console.log("\n▶ [2/4] Test de refus Server Action : Devoir sur matière non affectée (Anglais)...");
  const term = await prisma.term.findFirst({ where: { schoolId: school.id } });
  const student = await prisma.enrollment.findFirst({ where: { classId: classe4e.id } });
  if (!term || !student) throw new Error("Trimestre ou élève introuvable pour test d'enregistrement");

  const devoirRes = await saveDevoirGradeWithActor(teacherActor, {
    gradeId: null,
    studentId: student.studentId,
    classId: classe4e.id,
    subjectId: anglaisSubject.id,
    termId: term.id,
    value: 15,
  });
  if (devoirRes.ok) {
    throw new Error("FAILLE : Le professeur a pu enregistrer un devoir sur Anglais sans affectation !");
  }
  console.log(`  ✅ SUCCÈS : saveDevoirGrade a refusé avec l'erreur : "${devoirRes.error}"`);

  // 3. Test refus Server Action saveCompositionGrade sur Anglais (non affecté)
  console.log("\n▶ [3/4] Test de refus Server Action : Composition sur matière non affectée (Anglais)...");
  const compoRes = await saveCompositionGradeWithActor(teacherActor, {
    gradeId: null,
    studentId: student.studentId,
    classId: classe4e.id,
    subjectId: anglaisSubject.id,
    termId: term.id,
    value: 15,
  });
  if (compoRes.ok) {
    throw new Error("FAILLE : Le professeur a pu enregistrer une composition sur Anglais sans affectation !");
  }
  console.log(`  ✅ SUCCÈS : saveCompositionGrade a refusé avec l'erreur : "${compoRes.error}"`);

  // 4. Test refus Server Action saveSubjectAppreciation sur Anglais (non affecté)
  console.log("\n▶ [4/4] Test de refus Server Action : Appréciation sur matière non affectée (Anglais)...");
  const apprRes = await saveSubjectAppreciationWithActor(teacherActor, {
    studentId: student.studentId,
    classId: classe4e.id,
    subjectId: anglaisSubject.id,
    termId: term.id,
    comment: "Tentative non autorisée",
  });
  if (apprRes.ok) {
    throw new Error("FAILLE : Le professeur a pu enregistrer une appréciation sur Anglais sans affectation !");
  }
  console.log(`  ✅ SUCCÈS : saveSubjectAppreciation a refusé avec l'erreur : "${apprRes.error}"`);

  // 5. Cas ADMIN/OWNER : voit TOUTES les matières
  console.log("\n▶ [5/5] Test ADMIN/OWNER sur 4e...");
  const adminCtx = await getSecondaireContextWithActor(adminActor, classe4e.id);
  if (!adminCtx.ok) throw new Error(`Échec getSecondaireContext pour admin: ${adminCtx.error}`);
  console.log(`  • Matières visibles par ${adminActor.role} : ${adminCtx.allSubjects.length} matières (${adminCtx.allSubjects.map((s) => s.name).join(", ")})`);
  if (adminCtx.allSubjects.length !== classe4e.subjects.length) {
    throw new Error(`L'admin devrait voir les ${classe4e.subjects.length} matières de la classe, vu : ${adminCtx.allSubjects.length}`);
  }
  console.log(`  ✅ SUCCÈS : ${adminActor.role} voit bien l'intégralité des ${classe4e.subjects.length} matières de la classe.`);

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("   TOUS LES CONTRÔLES DU POINT 1 SONT CONFORMES ET VÉRIFIÉS      ");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR :", err);
    process.exit(1);
  });
