/**
 * Calcul de l'ÉLÉMENTAIRE pour une classe entière — moyennes et rang.
 *
 * ⚠️ Comme pour le secondaire : la moyenne d'une sous-discipline (Σ notes /
 * nombre notées) est un `AVG` SQL, poussé à la base via `groupBy` sur
 * (élève, sous-discipline). On ne récupère que ce résultat déjà agrégé —
 * au plus effectif × sous-disciplines lignes (15 sous-disciplines officielles
 * au plus) — jamais les notes brutes de toute la classe.
 */
import { prisma } from "@/lib/prisma";
import {
  calculerEleveElementaire,
  classerElementaire,
  type EleveElementaireResultat,
  type SousDisciplineInput,
} from "./elementaire";
import { roundTo2 } from "./round";

export type BulletinClasseElementaire = {
  eleves: (EleveElementaireResultat & { rang: number | null })[];
  moyenneClasseGenerale: number | null;
  effectif: number;
};

export async function calculerClasseElementaire(params: {
  schoolId: string;
  classId: string;
  termId: string;
  bareme?: 10 | 20;
}): Promise<BulletinClasseElementaire> {
  const { schoolId, classId, termId, bareme = 20 } = params;

  const [enrollments, domaines] = await Promise.all([
    prisma.enrollment.findMany({ where: { classId }, select: { studentId: true } }),
    prisma.gradeDomain.findMany({
      where: { schoolId, isActive: true },
      include: { subDisciplines: { where: { isActive: true } } },
    }),
  ]);
  const studentIds = enrollments.map((e) => e.studentId);
  const sousDisciplines = domaines.flatMap((d) => d.subDisciplines.map((sd) => ({ ...sd, domainName: d.name })));

  if (studentIds.length === 0 || sousDisciplines.length === 0) {
    return { eleves: [], moyenneClasseGenerale: null, effectif: 0 };
  }
  const subDisciplineIds = sousDisciplines.map((sd) => sd.id);

  // Le seul agrégat brut : moyenne des notes par (élève, sous-discipline).
  const notesAgg = await prisma.grade.groupBy({
    by: ["studentId", "subDisciplineId"],
    where: {
      classId,
      termId,
      studentId: { in: studentIds },
      subDisciplineId: { in: subDisciplineIds },
    },
    _avg: { value: true },
  });
  const noteParPaire = new Map(notesAgg.map((r) => [`${r.studentId}:${r.subDisciplineId}`, r._avg.value]));

  const eleves = studentIds.map((studentId) => {
    const inputs: SousDisciplineInput[] = sousDisciplines.map((sd) => ({
      subDisciplineId: sd.id,
      name: sd.name,
      domainId: sd.domainId,
      domainName: sd.domainName,
      scale: sd.scale,
      note: noteParPaire.get(`${studentId}:${sd.id}`) ?? null,
    }));
    return calculerEleveElementaire(studentId, inputs, bareme);
  });

  const rangs = classerElementaire(eleves.map((e) => ({ studentId: e.studentId, moyenneGenerale: e.moyenneGenerale })));
  const elevesClasses = eleves.map((e) => ({ ...e, rang: rangs.get(e.studentId) ?? null }));

  const generales = elevesClasses.map((e) => e.moyenneGenerale).filter((v): v is number => v !== null);
  const moyenneClasseGenerale = generales.length
    ? roundTo2(generales.reduce((a, b) => a + b, 0) / generales.length)
    : null;

  return { eleves: elevesClasses, moyenneClasseGenerale, effectif: studentIds.length };
}
