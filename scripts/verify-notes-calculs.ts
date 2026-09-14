/**
 * Preuve empirique du lot 18/2 : la moyenne de classe d'une matière est la
 * moyenne des moyennes de TOUS les élèves de la classe, jamais la note d'un
 * seul — le bug signalé par Kory sur le bulletin de référence (extrêmes
 * identiques à une seule note sur 40 élèves).
 *
 * Crée deux élèves fictifs dans une classe fictive (Terminale S2) avec des
 * notes de Maths délibérément ÉCARTÉES (MM 10 et MM 20) : si le calcul de
 * classe était bogué comme le bulletin de référence, la moyenne de classe
 * vaudrait 10 ou 20. Elle doit valoir 15 — la moyenne des deux, pas l'une
 * des deux notes.
 *
 * Fixtures marquées `NOTESCALCS-TAG`, nettoyées dans le `finally` — jamais
 * de données réelles touchées.
 *
 *   npm run script -- scripts/verify-notes-calculs.ts
 */
import { prisma } from "./_env";
import { resoudreCible } from "./_cible";
import { calculerClasseSecondaire } from "../src/lib/notes/secondaire-classe";

const TAG = "NOTESCALCS-TAG";

async function main() {
  const cible = await resoudreCible("une classe et deux élèves FICTIFS, nettoyés en fin de script", prisma as never);
  if (!cible) return;
  const schoolId = cible.id;

  const maths = await prisma.subject.findFirst({ where: { schoolId, code: "MATH" }, select: { id: true, name: true } });
  if (!maths) {
    console.log("⚠ Aucune matière codée MATH dans cette école — lancez d'abord seed-secondary-subjects.ts. Abandon, rien créé.");
    return;
  }

  const term = await prisma.term.findFirst({ where: { schoolId }, select: { id: true } });
  if (!term) {
    console.log("⚠ Aucun trimestre dans cette école. Abandon, rien créé.");
    return;
  }

  let classId: string | null = null;
  let studentIds: string[] = [];

  try {
    const classe = await prisma.class.create({
      data: { name: `${TAG} Terminale S2`, schoolId, cycle: "SECONDAIRE", serie: "S2" },
      select: { id: true },
    });
    classId = classe.id;

    await prisma.classSubject.create({ data: { classId, subjectId: maths.id, coefficient: 5 } });

    const eleveA = await prisma.student.create({ data: { firstName: TAG, lastName: "Bas", schoolId, status: "ENROLLED" }, select: { id: true } });
    const eleveB = await prisma.student.create({ data: { firstName: TAG, lastName: "Haut", schoolId, status: "ENROLLED" }, select: { id: true } });
    studentIds = [eleveA.id, eleveB.id];

    await prisma.enrollment.createMany({
      data: studentIds.map((studentId) => ({ studentId, classId: classId as string, academicYear: "TEST" })),
    });

    // A : devoir 10, composition 10 → MM 10. B : devoir 20, composition 20 → MM 20.
    await prisma.grade.createMany({
      data: [
        { studentId: eleveA.id, classId, subjectId: maths.id, termId: term.id, value: 10, max: 20, type: "QUIZ" },
        { studentId: eleveA.id, classId, subjectId: maths.id, termId: term.id, value: 10, max: 20, type: "EXAM" },
        { studentId: eleveB.id, classId, subjectId: maths.id, termId: term.id, value: 20, max: 20, type: "QUIZ" },
        { studentId: eleveB.id, classId, subjectId: maths.id, termId: term.id, value: 20, max: 20, type: "EXAM" },
      ],
    });

    const resultat = await calculerClasseSecondaire({ schoolId, classId, termId: term.id });

    console.log(`\n  Effectif : ${resultat.effectif}`);
    for (const e of resultat.eleves) {
      const m = e.matieres.find((x) => x.subjectId === maths.id);
      console.log(`  Élève ${e.studentId === eleveA.id ? "A (bas)" : "B (haut)"} — MM Maths = ${m?.mm}, MG = ${e.moyenneGenerale}, rang = ${e.rang}`);
    }
    const statsMaths = resultat.moyennesParMatiere.find((m) => m.subjectId === maths.id);
    console.log(`\n  Moyenne de CLASSE en Maths : ${statsMaths?.moyenneClasse} (effectif noté : ${statsMaths?.effectifNote})`);

    const ok = statsMaths?.moyenneClasse === 15;
    console.log(`\n  ${ok ? "✅ Moyenne de classe = 15 (moyenne des deux élèves, ni 10 ni 20) — le bug ne se reproduit pas." : "❌ ANOMALIE : la moyenne de classe ne vaut pas 15."}`);
    if (!ok) process.exitCode = 1;
  } finally {
    if (classId) {
      await prisma.grade.deleteMany({ where: { classId } });
      await prisma.enrollment.deleteMany({ where: { classId } });
      await prisma.classSubject.deleteMany({ where: { classId } });
      await prisma.class.delete({ where: { id: classId } });
    }
    if (studentIds.length) await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    console.log("\n  Fixtures nettoyées.");
  }
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
