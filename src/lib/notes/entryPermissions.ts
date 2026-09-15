/**
 * Verrouillage de la saisie de notes — lot 18/3.
 *
 * ⚠️ **Une Server Action est un point d'entrée HTTP à part entière** (même
 * garde que `grades/saisie/actions.ts`). Ces fonctions sont donc les SEULES
 * qui comptent : masquer un champ côté écran n'empêche jamais un appel direct
 * avec un autre `classId`/`subjectId`/`studentId`.
 *
 * Réutilise `editableSubjectIds()` (`src/lib/gradeEntry.ts`) comme SEULE
 * autorité sur « qui peut saisir quoi » — pas de second calcul du même droit
 * ici, exactement la règle que ce fichier documente lui-même.
 */
import { prisma } from "@/lib/prisma";
import { editableSubjectIds } from "@/lib/gradeEntry";

export type EntryDenial = { ok: false; error: string };

/**
 * Vérifie qu'une classe appartient bien à l'établissement de l'appelant.
 * Un `TEACHER` d'une autre école qui devine un `classId` réel est refusé ici,
 * avant même de savoir s'il enseigne quoi que ce soit.
 */
export async function assertClassInSchool(classId: string, schoolId: string): Promise<{ id: string } | null> {
  return prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } });
}

/**
 * Périmètre CONSEIL DE CLASSE — lot 18/3C.
 *
 * Réservé STRICTEMENT à la direction et l'administration : OWNER et ADMIN.
 * Un TEACHER (même titulaire ou professeur principal), un PARENT ou un
 * ACCOUNTANT ne peuvent ni voir ni modifier ce bloc.
 */
export function assertCanManageConseilDeClasse(
  actor: { role: string }
): { ok: true } | EntryDenial {
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") {
    return {
      ok: false,
      error: "Accès strictement réservé à la direction et l'administration (OWNER ou ADMIN).",
    };
  }
  return { ok: true };
}

/**
 * Périmètre ÉLÉMENTAIRE — titulaire uniquement.
 *
 * ⚠️ L'élémentaire n'a pas de matières séparées à autoriser une par une : le
 * titulaire enseigne TOUS les domaines, ou il n'enseigne pas cette classe.
 * On appelle `editableSubjectIds` avec une liste de matières vide — sa seule
 * question ici est « ALL ou rien », jamais laquelle.
 */
export async function assertCanEditElementaireClass(
  actor: { userId: string; role: string },
  classId: string,
): Promise<{ ok: true } | EntryDenial> {
  const editable = await editableSubjectIds({ id: actor.userId, role: actor.role }, classId, []);
  if (editable !== "ALL") {
    return { ok: false, error: "Vous n'êtes pas le titulaire de cette classe." };
  }
  return { ok: true };
}

/**
 * Périmètre SECONDAIRE — une matière précise, dans une classe précise.
 *
 * Reproduit exactement les contrôles ①②③ de `saveOneGrade`
 * (`grades/saisie/actions.ts`) : matière rattachée à la classe, puis
 * autorisée pour cet utilisateur. Le contrôle ④ (élève inscrit) reste à la
 * charge de l'appelant, qui connaît l'élève concerné.
 */
export async function assertCanEditSecondaireSubject(
  actor: { userId: string; role: string },
  classId: string,
  subjectId: string,
): Promise<{ ok: true } | EntryDenial> {
  const classSubjects = await prisma.classSubject.findMany({ where: { classId }, select: { subjectId: true } });
  const ids = classSubjects.map((c) => c.subjectId);
  if (!ids.includes(subjectId)) {
    return { ok: false, error: "Cette matière n'est pas rattachée à la classe." };
  }

  const editable = await editableSubjectIds({ id: actor.userId, role: actor.role }, classId, ids);
  if (editable !== "ALL" && !editable.has(subjectId)) {
    return { ok: false, error: "Vous ne saisissez pas cette matière." };
  }
  return { ok: true };
}

/** Un élève doit être réellement inscrit dans la classe visée. */
export async function assertStudentEnrolled(studentId: string, classId: string): Promise<boolean> {
  const enrolled = await prisma.enrollment.findFirst({ where: { classId, studentId }, select: { id: true } });
  return !!enrolled;
}
