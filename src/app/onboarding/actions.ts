'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireActionContext } from '@/lib/actionContext'

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
  const { schoolId } = auth.ctx

  try {
    // 1. Mettre à jour l'école avec les nouvelles informations (téléphone, adresse)
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        phone: data.phone || null,
        address: data.address || null,
        onboardingCompleted: true,
      }
    });

    // 2. Générer les classes automatiquement selon les niveaux choisis.
    //
    // ⚠️ CORRECTIF LOT 12.2 — le `cycle` n'était PAS renseigné.
    //
    // Toutes les classes créées à l'onboarding tombaient sur le défaut `AUTRE`,
    // alors que le niveau choisi le donne exactement. Conséquence concrète : la
    // portée « par cycle » de la grille tarifaire (lot 12.1) était **inerte** sur
    // toute école créée par le parcours — une scolarité déclarée sur ÉLÉMENTAIRE
    // ne correspondait à aucune classe, et le forecast comptait ces élèves comme
    // « hors grille ». Le classement par cycle de `classOrder.ts` en souffrait
    // de la même façon.
    const CYCLE_BY_LEVEL = {
      'Maternelle': 'MATERNELLE',
      'Primaire': 'ELEMENTAIRE',
      'Collège': 'COLLEGE',
      'Lycée': 'LYCEE',
    } as const;

    const CLASSES_BY_LEVEL = {
      'Maternelle': ['Petite Section', 'Moyenne Section', 'Grande Section'],
      'Primaire': ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
      'Collège': ['6ème', '5ème', '4ème', '3ème'],
      'Lycée': ['Seconde', 'Première', 'Terminale'],
    } as const;

    const classesToCreate: { name: string; schoolId: string; cycle: any }[] = [];
    for (const level of Object.keys(CLASSES_BY_LEVEL) as (keyof typeof CLASSES_BY_LEVEL)[]) {
      if (!data.levels?.includes(level)) continue;
      for (const name of CLASSES_BY_LEVEL[level]) {
        classesToCreate.push({ name, schoolId, cycle: CYCLE_BY_LEVEL[level] });
      }
    }

    // ⚠️ Le nombre RÉELLEMENT créé est renvoyé, pas le nombre demandé :
    // `skipDuplicates` peut en écarter, et l'écran de fin annonce un résultat —
    // annoncer « 13 classes créées » quand il y en a 9 serait une fiction.
    let classesCreated = 0;
    if (classesToCreate.length > 0) {
      const res = await prisma.class.createMany({
        data: classesToCreate,
        skipDuplicates: true
      });
      classesCreated = res.count;
    }

    return { success: true, classesCreated };
  } catch (error) {
    console.error("Erreur lors de l'onboarding:", error);
    return { success: false, classesCreated: 0, error: "Une erreur s'est produite lors de la configuration." };
  }
}
