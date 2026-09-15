/**
 * Smoke test bout-en-bout du lot 18/3 : élémentaire, secondaire, conseil de
 * classe. Rejoue le code RÉEL des écrans (les fonctions `...WithActor`, qui
 * sont exactement ce que les Server Actions appellent après résolution de la
 * session — voir la note en tête de `elementaire/actions.ts`).
 *
 * Fixtures marquées `SAISIE-SMOKE-TAG`, nettoyées dans le `finally`.
 *
 *   npm run script -- scripts/verify-notes-saisie-smoke.ts
 */
import { prisma } from "./_env";
import { getElementaireContextWithActor, saveSubDisciplineGradeWithActor, saveTitulaireAppreciationWithActor } from "../src/app/dashboard/grades/elementaire/actions";
import { getSecondaireContextWithActor, saveDevoirGradeWithActor, saveCompositionGradeWithActor, saveSubjectAppreciationWithActor } from "../src/app/dashboard/grades/secondaire/actions";
const TAG = "SAISIE-SMOKE-TAG";
let ok = true;
const check = (label: string, cond: boolean) => {
  console.log(`  ${cond ? "✅" : "❌"} ${label}`);
  if (!cond) ok = false;
};

async function main() {
  const ecole = await prisma.school.create({ data: { name: `${TAG} École` }, select: { id: true } });

  const [t1, t2, t3] = await Promise.all([
    prisma.term.create({ data: { name: `${TAG} T1`, schoolId: ecole.id, startDate: new Date("2026-10-01") }, select: { id: true } }),
    prisma.term.create({ data: { name: `${TAG} T2`, schoolId: ecole.id, startDate: new Date("2027-01-01") }, select: { id: true } }),
    prisma.term.create({ data: { name: `${TAG} T3`, schoolId: ecole.id, startDate: new Date("2027-04-01") }, select: { id: true } }),
  ]);

  const domaine = await prisma.gradeDomain.create({ data: { name: `${TAG} Mathématiques`, schoolId: ecole.id }, select: { id: true } });
  const sd1 = await prisma.gradeSubDiscipline.create({ data: { name: `${TAG} Activités numériques`, domainId: domaine.id, schoolId: ecole.id, scale: 10 }, select: { id: true } });
  const sd2 = await prisma.gradeSubDiscipline.create({ data: { name: `${TAG} Résolution de problèmes`, domainId: domaine.id, schoolId: ecole.id, scale: 10 }, select: { id: true } });

  const classeElem = await prisma.class.create({ data: { name: `${TAG} CI`, schoolId: ecole.id, cycle: "ELEMENTAIRE" }, select: { id: true } });
  const titulaire = await prisma.user.create({ data: { email: `${TAG.toLowerCase()}-titulaire@test.invalid`, firstName: TAG, lastName: "Titulaire", role: "TEACHER", schoolId: ecole.id, emailVerified: true }, select: { id: true } });
  await prisma.class.update({ where: { id: classeElem.id }, data: { teacherId: titulaire.id } });
  const eleveElem = await prisma.student.create({ data: { firstName: TAG, lastName: "ElevElem", schoolId: ecole.id, status: "ENROLLED" }, select: { id: true } });
  await prisma.enrollment.create({ data: { studentId: eleveElem.id, classId: classeElem.id, academicYear: "TEST" } });

  const matiere = await prisma.subject.create({ data: { name: `${TAG} Maths`, code: `${TAG}-MATH`, schoolId: ecole.id }, select: { id: true } });
  const classeSec = await prisma.class.create({ data: { name: `${TAG} Terminale`, schoolId: ecole.id, cycle: "SECONDAIRE", serie: "S2" }, select: { id: true } });
  const prof = await prisma.user.create({ data: { email: `${TAG.toLowerCase()}-prof@test.invalid`, firstName: TAG, lastName: "Prof", role: "TEACHER", schoolId: ecole.id, emailVerified: true }, select: { id: true } });
  await prisma.teachingAssignment.create({ data: { teacherId: prof.id, classId: classeSec.id, subjectId: matiere.id, schoolId: ecole.id } });
  await prisma.classSubject.create({ data: { classId: classeSec.id, subjectId: matiere.id, coefficient: 3 } });
  const eleveSec = await prisma.student.create({ data: { firstName: TAG, lastName: "ElevSec", schoolId: ecole.id, status: "ENROLLED" }, select: { id: true } });
  await prisma.enrollment.create({ data: { studentId: eleveSec.id, classId: classeSec.id, academicYear: "TEST" } });

  const admin = await prisma.user.create({ data: { email: `${TAG.toLowerCase()}-admin@test.invalid`, firstName: TAG, lastName: "Admin", role: "ADMIN", schoolId: ecole.id, emailVerified: true }, select: { id: true } });

  try {
    // ═══ ÉLÉMENTAIRE ═══
    const actorTitulaire = { userId: titulaire.id, role: "TEACHER", schoolId: ecole.id };
    const write1 = await saveSubDisciplineGradeWithActor(actorTitulaire, { gradeId: null, studentId: eleveElem.id, classId: classeElem.id, subDisciplineId: sd1.id, termId: t1.id, value: 8 });
    check("élémentaire : note créée", write1.ok);
    const write2 = await saveSubDisciplineGradeWithActor(actorTitulaire, { gradeId: null, studentId: eleveElem.id, classId: classeElem.id, subDisciplineId: sd2.id, termId: t1.id, value: 6 });
    check("élémentaire : deuxième note créée", write2.ok);

    const ctxElem = await getElementaireContextWithActor(actorTitulaire, classeElem.id, t1.id);
    check("élémentaire : contexte résolu", ctxElem.ok);
    if (ctxElem.ok) {
      const eleve = ctxElem.eleves.find((e) => e.studentId === eleveElem.id);
      check("élémentaire : les 2 notes reviennent bien (8 et 6)", eleve?.notes[sd1.id] === 8 && eleve?.notes[sd2.id] === 6);
    }

    // Effacement : une case vidée redevient non notée, pas 0.
    if (write1.ok) {
      const erase = await saveSubDisciplineGradeWithActor(actorTitulaire, { gradeId: write1.gradeId, studentId: eleveElem.id, classId: classeElem.id, subDisciplineId: sd1.id, termId: t1.id, value: null });
      check("élémentaire : effacement supprime la note (pas de 0)", erase.ok);
      const remaining = await prisma.grade.count({ where: { studentId: eleveElem.id, subDisciplineId: sd1.id } });
      check("élémentaire : la note effacée n'existe plus en base", remaining === 0);
    }

    const appr = await saveTitulaireAppreciationWithActor(actorTitulaire, { studentId: eleveElem.id, classId: classeElem.id, termId: t1.id, comment: "Bon trimestre." });
    check("élémentaire : appréciation titulaire enregistrée", appr.ok);

    // ═══ SECONDAIRE ═══
    const actorProf = { userId: prof.id, role: "TEACHER", schoolId: ecole.id };
    const d1 = await saveDevoirGradeWithActor(actorProf, { gradeId: null, studentId: eleveSec.id, classId: classeSec.id, subjectId: matiere.id, termId: t1.id, value: 12 });
    check("secondaire : devoir 1 créé", d1.ok);
    const d2 = await saveDevoirGradeWithActor(actorProf, { gradeId: null, studentId: eleveSec.id, classId: classeSec.id, subjectId: matiere.id, termId: t1.id, value: 14 });
    check("secondaire : devoir 2 créé", d2.ok);
    const compo = await saveCompositionGradeWithActor(actorProf, { gradeId: null, studentId: eleveSec.id, classId: classeSec.id, subjectId: matiere.id, termId: t1.id, value: 16 });
    check("secondaire : composition créée", compo.ok);
    const apprSec = await saveSubjectAppreciationWithActor(actorProf, { studentId: eleveSec.id, classId: classeSec.id, subjectId: matiere.id, termId: t1.id, comment: "Bon niveau." });
    check("secondaire : appréciation matière enregistrée", apprSec.ok);

    const ctxSec = await getSecondaireContextWithActor(actorProf, classeSec.id, matiere.id, t1.id);
    check("secondaire : contexte résolu", ctxSec.ok);
    if (ctxSec.ok) {
      const ligne = ctxSec.lignes.find((l) => l.studentId === eleveSec.id);
      // MD = (12+14)/2 = 13 ; MM = (13+16)/2 = 14.5
      check(`secondaire : MD=13 (obtenu ${ligne?.md})`, ligne?.md === 13);
      check(`secondaire : MM=14.5 (obtenu ${ligne?.mm})`, ligne?.mm === 14.5);
      check("secondaire : coefficient référentiel Terminale S2 appliqué (5, pas le 3 de ClassSubject)", ctxSec.coefficient === 5);
      check("secondaire : appréciation revient bien", ligne?.appreciation === "Bon niveau.");
    }

    // Limite : un 4e devoir doit être refusé.
    const d3 = await saveDevoirGradeWithActor(actorProf, { gradeId: null, studentId: eleveSec.id, classId: classeSec.id, subjectId: matiere.id, termId: t1.id, value: 10 });
    check("secondaire : devoir 3 créé", d3.ok);
    const d4 = await saveDevoirGradeWithActor(actorProf, { gradeId: null, studentId: eleveSec.id, classId: classeSec.id, subjectId: matiere.id, termId: t1.id, value: 10 });
    check("secondaire : un 4e devoir est refusé", d4.ok === false);

    // ═══ CONSEIL DE CLASSE ═══
    const orientationHorsT3 = await saveConseilDecisionDirect({ studentId: eleveSec.id, classId: classeSec.id, termId: t1.id, decisionOrientation: "PASSAGE", schoolId: ecole.id, userId: admin.id });
    check("conseil : orientation refusée hors 3e trimestre", orientationHorsT3 === false);

    const orientationT3 = await saveConseilDecisionDirect({ studentId: eleveSec.id, classId: classeSec.id, termId: t3.id, decisionOrientation: "PASSAGE", schoolId: ecole.id, userId: admin.id });
    check("conseil : orientation acceptée au 3e trimestre", orientationT3 === true);

    console.log(`\n  ${ok ? "✅ TOUS LES TESTS PASSENT" : "❌ AU MOINS UN TEST A ÉCHOUÉ"}`);
    if (!ok) process.exitCode = 1;
  } finally {
    await prisma.termReview.deleteMany({ where: { schoolId: ecole.id } });
    await prisma.subjectAppreciation.deleteMany({ where: { schoolId: ecole.id } });
    await prisma.grade.deleteMany({ where: { classId: { in: [classeElem.id, classeSec.id] } } });
    await prisma.enrollment.deleteMany({ where: { classId: { in: [classeElem.id, classeSec.id] } } });
    await prisma.teachingAssignment.deleteMany({ where: { schoolId: ecole.id } });
    await prisma.classSubject.deleteMany({ where: { classId: classeSec.id } });
    await prisma.class.deleteMany({ where: { id: { in: [classeElem.id, classeSec.id] } } });
    await prisma.gradeSubDiscipline.deleteMany({ where: { schoolId: ecole.id } });
    await prisma.gradeDomain.deleteMany({ where: { schoolId: ecole.id } });
    await prisma.subject.deleteMany({ where: { id: matiere.id } });
    await prisma.student.deleteMany({ where: { id: { in: [eleveElem.id, eleveSec.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [titulaire.id, prof.id, admin.id] } } });
    await prisma.term.deleteMany({ where: { schoolId: ecole.id } });
    await prisma.school.delete({ where: { id: ecole.id } });
    console.log("\n  Fixtures nettoyées.");
  }
}

/**
 * `saveConseilDecision`/`getConseilContext` passent par `requireActionContext()`
 * (session HTTP), non rejouable en script. On vérifie ici la RÈGLE
 * elle-même (verrou 3e trimestre) en reproduisant fidèlement — et
 * uniquement — la fonction `estTroisiemeTrimestre` + l'upsert qu'exécute
 * `saveConseilDecision`, sans dupliquer son autorisation (déjà couverte par
 * `verify-notes-saisie-permissions.ts`).
 */
async function saveConseilDecisionDirect(input: {
  studentId: string; classId: string; termId: string; decisionOrientation: string; schoolId: string; userId: string;
}): Promise<boolean> {
  const terms = await prisma.term.findMany({ where: { schoolId: input.schoolId }, select: { id: true, startDate: true, createdAt: true } });
  const dates = terms.filter((t) => t.startDate !== null).sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
  const troisieme = dates.length >= 3 && dates[2].id === input.termId;
  if (!troisieme) return false;
  await prisma.termReview.upsert({
    where: { studentId_termId: { studentId: input.studentId, termId: input.termId } },
    create: { studentId: input.studentId, classId: input.classId, termId: input.termId, schoolId: input.schoolId, decisionOrientation: input.decisionOrientation, updatedById: input.userId },
    update: { decisionOrientation: input.decisionOrientation, updatedById: input.userId },
  });
  return true;
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
