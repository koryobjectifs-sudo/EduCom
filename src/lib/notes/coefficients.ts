import { prisma } from "@/lib/prisma";
import { deriverNiveau } from "./secondaire-classe";

/**
 * Résout le coefficient d'une matière dans une classe :
 * Priorité 1 : coefficient saisi par l'école pour cette classe (ClassSubject)
 * Priorité 2 : référentiel officiel SubjectCoefficient (par schoolId + niveau + serie + subject.code)
 * Priorité 3 : signale l'absence (null, ne devine jamais)
 */
export async function resoudreCoefficient(
  schoolId: string,
  classId: string,
  subjectId: string,
): Promise<number | null> {
  // 1. Saisi par l'école pour cette classe (ClassSubject)
  const classSubject = await prisma.classSubject.findFirst({
    where: { classId, subjectId },
    select: { coefficient: true },
  });
  if (classSubject && classSubject.coefficient != null && classSubject.coefficient > 0) {
    return classSubject.coefficient;
  }

  // 2. Sinon, référentiel officiel par (niveau, série)
  const classe = await prisma.class.findUnique({
    where: { id: classId },
    select: { name: true, serie: true },
  });
  if (classe && classe.serie) {
    const niveau = deriverNiveau(classe.name);
    if (niveau) {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { code: true },
      });
      if (subject?.code) {
        const referentiel = await prisma.subjectCoefficient.findFirst({
          where: { schoolId, niveau, serie: classe.serie, subject: { code: subject.code } },
          select: { coefficient: true },
        });
        if (referentiel && referentiel.coefficient != null && referentiel.coefficient > 0) {
          return referentiel.coefficient;
        }
      }
    }
  }

  // 3. Sinon, signale l'absence, ne devine pas
  return null;
}
