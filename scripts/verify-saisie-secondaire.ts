import { prisma } from "./_env";
import {
  getSecondaireContextWithActor,
  saveDevoirGradeWithActor,
  saveCompositionGradeWithActor,
  saveSubjectAppreciationWithActor,
} from "../src/app/dashboard/grades/secondaire/actions";
import { calculerEleveSecondaire } from "../src/lib/notes/secondaire";

const SENGCO_NAME = "SENG.CO";
const TEACHER_EMAIL = "prof.maths.test@sengco.educom.sn";

const REFERENCE_DATA = [
  { code: "MATH", coef: 5, d1: 13.0, compo: 11.0 },
  { code: "PC", coef: 6, d1: 14.5, compo: 13.0 },
  { code: "SVT", coef: 6, d1: 12.0, compo: 14.0 },
  { code: "FR", coef: 2, d1: 11.0, compo: 10.5 },
  { code: "PHIL", coef: 2, d1: 10.0, compo: 12.0 },
  { code: "HG", coef: 2, d1: 15.0, compo: 14.0 },
  { code: "ANG", coef: 2, d1: 13.5, compo: 15.0 },
];

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("   VÉRIFICATION LOT 3B : SAISIE SECONDAIRE & VERROUILLAGE        ");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const school = await prisma.school.findFirst({
    where: { name: { contains: SENGCO_NAME } },
    select: { id: true, name: true },
  });
  if (!school) throw new Error("École SENG.CO introuvable !");
  const schoolId = school.id;

  const classe = await prisma.class.findFirst({
    where: { schoolId, name: "Terminale S2" },
    select: { id: true, name: true, serie: true },
  });
  if (!classe) throw new Error("Terminale S2 introuvable !");

  const terms = await prisma.term.findMany({
    where: { schoolId },
    orderBy: { startDate: "asc" },
  });
  if (terms.length === 0) throw new Error("Aucun trimestre trouvé !");
  const term1 = terms[0];

  const teacher = await prisma.user.findFirst({
    where: { schoolId, email: TEACHER_EMAIL },
  });
  if (!teacher) throw new Error(`Compte enseignant ${TEACHER_EMAIL} introuvable !`);

  const admin = await prisma.user.findFirst({
    where: { schoolId, role: { in: ["ADMIN", "OWNER"] } },
  });
  if (!admin) throw new Error("Compte ADMIN ou OWNER introuvable dans SENG.CO !");

  const teacherActor = {
    userId: teacher.id,
    schoolId,
    role: teacher.role,
  };

  const adminActor = {
    userId: admin.id,
    schoolId,
    role: admin.role,
  };

  // ─────────────────────────────────────────────────────────────
  // 1. TEST VERROUILLAGE TEACHER
  // ─────────────────────────────────────────────────────────────
  console.log("▶ [1/4] Test du compte TEACHER (professeur de Maths)...");
  const teacherCtx = await getSecondaireContextWithActor(teacherActor, classe.id, undefined, term1.id);
  if (!teacherCtx.ok) {
    throw new Error(`Échec getSecondaireContext pour TEACHER: ${teacherCtx.error}`);
  }

  console.log(`  • Matières visibles : ${teacherCtx.allSubjects.map((s) => s.name).join(", ")}`);
  if (teacherCtx.allSubjects.length !== 1 || !teacherCtx.allSubjects[0].name.toLowerCase().includes("math")) {
    throw new Error(`Le TEACHER devrait voir UNIQUEMENT Mathématiques, vu : ${JSON.stringify(teacherCtx.allSubjects)}`);
  }
  console.log("  ✓ TEACHER ne voit QUE Mathématiques dans le sélecteur.");

  console.log(`  • Classes visibles : ${teacherCtx.allClasses.map((c) => c.name).join(", ")}`);
  if (teacherCtx.allClasses.length !== 1 || teacherCtx.allClasses[0].id !== classe.id) {
    throw new Error(`Le TEACHER devrait voir UNIQUEMENT Terminale S2, vu : ${JSON.stringify(teacherCtx.allClasses)}`);
  }
  console.log("  ✓ TEACHER ne voit QUE Terminale S2 dans le sélecteur de classe.");

  // Test de refus serveur : tentative de saisie sur Physique-Chimie par le TEACHER
  const pcSubject = await prisma.subject.findFirst({
    where: { schoolId, code: "PC" },
  });
  if (!pcSubject) throw new Error("Matière PC introuvable !");

  const student = await prisma.enrollment.findFirst({
    where: { classId: classe.id },
    include: { student: true },
  });
  if (!student) throw new Error("Aucun élève trouvé dans Terminale S2 !");
  const targetStudentId = student.studentId;

  console.log("  • Tentative de saisie illicite par TEACHER sur Physique-Chimie...");
  const unauthorizedAttempt = await saveDevoirGradeWithActor(teacherActor, {
    gradeId: null,
    studentId: targetStudentId,
    classId: classe.id,
    subjectId: pcSubject.id,
    termId: term1.id,
    value: 15,
  });

  if (unauthorizedAttempt.ok) {
    throw new Error("FAILLE DE SÉCURITÉ : Le professeur de maths a pu saisir une note de Physique-Chimie !");
  }
  console.log(`  ✓ Rejet serveur strict confirmé : "${unauthorizedAttempt.error}"`);

  // ─────────────────────────────────────────────────────────────
  // 2. TEST ACCÈS ADMIN
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [2/4] Test du compte ADMIN...");
  const adminCtx = await getSecondaireContextWithActor(adminActor, classe.id, undefined, term1.id);
  if (!adminCtx.ok) {
    throw new Error(`Échec getSecondaireContext pour ADMIN: ${adminCtx.error}`);
  }

  console.log(`  • Matières visibles (${adminCtx.allSubjects.length}) : ${adminCtx.allSubjects.map((s) => s.name).join(", ")}`);
  if (adminCtx.allSubjects.length !== 7) {
    throw new Error(`L'ADMIN devrait voir les 7 matières, vu : ${adminCtx.allSubjects.length}`);
  }
  console.log("  ✓ ADMIN accède aux 7 matières officielles.");

  // ─────────────────────────────────────────────────────────────
  // 3. SAISIE DU CAS DE RÉFÉRENCE SUR L'ÉLÈVE
  // ─────────────────────────────────────────────────────────────
  console.log(`\n▶ [3/4] Saisie des notes du cas de référence sur l'élève ${student.student.lastName} ${student.student.firstName}...`);

  // Nettoyage préalable des notes de cet élève sur ce trimestre
  await prisma.grade.deleteMany({
    where: { classId: classe.id, studentId: targetStudentId, termId: term1.id },
  });

  for (const ref of REFERENCE_DATA) {
    const subj = await prisma.subject.findFirst({ where: { schoolId, code: ref.code } });
    if (!subj) throw new Error(`Matière ${ref.code} introuvable !`);

    // Saisie Devoir 1
    const resD1 = await saveDevoirGradeWithActor(adminActor, {
      gradeId: null,
      studentId: targetStudentId,
      classId: classe.id,
      subjectId: subj.id,
      termId: term1.id,
      value: ref.d1,
    });
    if (!resD1.ok) throw new Error(`Erreur saisie D1 pour ${ref.code}: ${resD1.error}`);

    // Saisie Composition
    const resCompo = await saveCompositionGradeWithActor(adminActor, {
      gradeId: null,
      studentId: targetStudentId,
      classId: classe.id,
      subjectId: subj.id,
      termId: term1.id,
      value: ref.compo,
    });
    if (!resCompo.ok) throw new Error(`Erreur saisie Compo pour ${ref.code}: ${resCompo.error}`);

    // Saisie Appréciation
    await saveSubjectAppreciationWithActor(adminActor, {
      studentId: targetStudentId,
      classId: classe.id,
      subjectId: subj.id,
      termId: term1.id,
      comment: `Très bon travail en ${subj.name}.`,
    });

    console.log(`  ✓ ${subj.code?.padEnd(5)} : D1=${ref.d1.toFixed(2)}, Compo=${ref.compo.toFixed(2)} (coef ${ref.coef})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. CALCUL DE LA MOYENNE GÉNÉRALE CONTRE LE LOT 2
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [4/4] Validation du calcul de la moyenne générale...");

  // Préparation des inputs pour le calcul officiel du lot 2
  const matieresInput = [];
  for (const ref of REFERENCE_DATA) {
    const subj = await prisma.subject.findFirst({ where: { schoolId, code: ref.code } });
    matieresInput.push({
      subjectId: subj!.id,
      name: subj!.name,
      coefficient: ref.coef,
      devoirs: [ref.d1],
      composition: ref.compo,
    });
  }

  const bilan = calculerEleveSecondaire(targetStudentId, matieresInput);

  console.log("\n  DÉTAIL PAR MATIÈRE :");
  for (const m of bilan.matieres) {
    console.log(`    • ${m.name.padEnd(16)} : MD=${m.md?.toFixed(2)} | Compo | MM=${m.mm?.toFixed(2)} × Coef ${m.coefficient} = ${m.points?.toFixed(2)} pts`);
  }

  console.log("\n  RÉSULTAT GLOBAL :");
  console.log(`    • Total points       : ${bilan.totalPoints} pts (attendu : 321.50)`);
  console.log(`    • Total coefficients : ${bilan.totalCoefficients} (attendu : 25)`);
  console.log(`    • Moyenne générale   : ${bilan.moyenneGenerale} / 20 (attendu : 12.86)`);

  if (bilan.totalPoints !== 321.5) {
    throw new Error(`Total points incorrect : ${bilan.totalPoints} au lieu de 321.50`);
  }
  if (bilan.totalCoefficients !== 25) {
    throw new Error(`Total coefficients incorrect : ${bilan.totalCoefficients} au lieu de 25`);
  }
  if (bilan.moyenneGenerale !== 12.86) {
    throw new Error(`Moyenne générale incorrecte : ${bilan.moyenneGenerale} au lieu de 12.86`);
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("   TOUTES LES VALIDATIONS PASSENT AVEC SUCCÈS !                   ");
  console.log("   - TEACHER verrouillé sur Maths & Terminale S2                  ");
  console.log("   - Saisie illicite refusée par le serveur                       ");
  console.log("   - ADMIN accède aux 7 matières                                  ");
  console.log("   - Cas de référence : 321.50 pts / 25 coefs = 12.86 / 20        ");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR :", err);
    process.exit(1);
  });
