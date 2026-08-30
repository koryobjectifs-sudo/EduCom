'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireActionContext } from '@/lib/actionContext'
import { applyCurriculum } from '@/lib/pedagogy'
import { LEVELS } from '@/lib/curriculum'

/**
 * Finalise la configuration d'un établissement.
 *
 * ⚠️ L'action recevait `schoolId` **depuis le client** sans authentifier
 * l'appelant : n'importe qui pouvait marquer une école tierce comme
 * « onboardée », réécrire son téléphone et son adresse, et lui injecter des
 * classes. Le `schoolId` vient désormais de la session et le paramètre a été
 * retiré de la signature.
 *
 * Aucun chemin n'est exigé en second argument : l'onboarding précède l'accès au
 * tableau de bord et concerne tout utilisateur authentifié rattaché à une
 * école. La seule garantie nécessaire est qu'il écrive dans *sa* propre école.
 */
export async function completeOnboarding(data: any) {
  const auth = await requireActionContext()
  if (!auth.ok) return { success: false, classesCreated: 0, error: auth.error }
  const { schoolId, userId } = auth.ctx

  try {
    // 1. Mettre à jour l'école avec le nom et les contacts
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: data.schoolName,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        onboardingCompleted: true,
      }
    });

    // 2. Mettre à jour le responsable (Prénom et Nom)
    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      }
    });

    // 3. Générer les classes automatiquement selon les niveaux choisis.
    const classesToCreate: { name: string; schoolId: string; cycle: any }[] = [];
    for (const level of LEVELS) {
      if (!data.levels?.includes(level.id)) continue;
      for (const name of level.classes) {
        classesToCreate.push({ name, schoolId, cycle: level.cycle });
      }
    }

    let classesCreated = 0;
    if (classesToCreate.length > 0) {
      const res = await prisma.class.createMany({
        data: classesToCreate,
        skipDuplicates: true
      });
      classesCreated = res.count;
    }

    return { success: true, classesCreated, programme: null };
  } catch (error) {
    console.error("Erreur lors de l'onboarding:", error);
    return { success: false, classesCreated: 0, programme: null, error: "Une erreur s'est produite lors de la configuration." };
  }
}
