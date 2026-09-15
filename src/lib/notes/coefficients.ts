import { prisma } from "@/lib/prisma";
import { deriverNiveau } from "./secondaire-classe";

/**
 * Résout le coefficient d'une matière dans une classe :
 * Priorité 1 : référentiel officiel SubjectCoefficient (par schoolId + niveau + serie + subject.code)
 * Priorité 2 : ClassSubject.coefficient
 * Fallback : 1
 */
export async function resoudreCoefficient(
  schoolId: string,
  classId: string,
  subjectId: string,
): Promise<number> {
  const [classe, classSubject] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId }, select: { name: true, serie: true } }),
    prisma.classSubject.findFirst({ where: { classId, subjectId }, select: { coefficient: true } }),
  ]);
  const fallback = classSubject && classSubject.coefficient > 0 ? classSubject.coefficient : 1;
  if (!classe) return fallback;

  const niveau = deriverNiveau(classe.name);
  if (!niveau || !classe.serie) return fallback;

  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { code: true } });
  if (!subject?.code) return fallback;

  const referentiel = await prisma.subjectCoefficient.findFirst({
    where: { schoolId, niveau, serie: classe.serie, subject: { code: subject.code } },
    select: { coefficient: true },
  });
  return referentiel?.coefficient ?? fallback;
}
