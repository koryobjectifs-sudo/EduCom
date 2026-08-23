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
    /**
     * ⚠️ Niveaux, cycles et noms de classes viennent de `src/lib/curriculum.ts`.
     * Ils étaient écrits ici ET dans `Wizard.tsx` : l'écran annonçait un nombre
     * de classes tenu à la main, cette action en créait un autre. Une seule
     * table, donc une seule vérité — et l'annonce ne peut plus mentir.
     */
    const classesToCreate: { name: string; schoolId: string; cycle: any }[] = [];
    for (const level of LEVELS) {
      if (!data.levels?.includes(level.id)) continue;
      for (const name of level.classes) {
        classesToCreate.push({ name, schoolId, cycle: level.cycle });
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

    /**
     * 3. Le programme sénégalais — **proposé à l'étape 2, appliqué ici.**
     *
     * ═══ POURQUOI L'APPLICATION VIT DANS CETTE ACTION, ET PAS DANS LE CLIENT ═══
     *
     * Les classes viennent d'être créées, ligne 2 : leurs identifiants
     * n'existent que côté serveur, à cet instant. Faire un second aller-retour
     * pour les redemander depuis le navigateur ajouterait une latence et une
     * fenêtre où l'école existe avec des classes vides. Surtout, la logique
     * elle-même n'est pas ici : `applyCurriculum()` vit dans
     * `src/lib/pedagogy.ts` et c'est le MÊME code que le bouton « appliquer le
     * programme » de l'écran de configuration. Une seule implémentation, deux
     * portes d'entrée.
     *
     * ⚠️ **Un échec du programme n'annule PAS l'installation.** L'école existe,
     * ses classes existent, elle est utilisable. Le programme se rattrape en un
     * clic dans Réglages › Configuration pédagogique — exactement le traitement
     * déjà réservé à la grille tarifaire.
     */
    let programme: { subjects: number; links: number; terms: number; evaluations: number } | null = null;
    if (data.programme?.apply) {
      try {
        const report = await applyCurriculum(auth.ctx, {
          withControls: Boolean(data.programme.withControls),
        });
        programme = {
          subjects: report.subjectsCreated,
          links: report.linksCreated,
          terms: report.termsCreated,
          evaluations: report.evaluationsCreated,
        };
      } catch (e) {
        console.error("Programme non appliqué à l'installation :", e);
      }
    }

    return { success: true, classesCreated, programme };
  } catch (error) {
    console.error("Erreur lors de l'onboarding:", error);
    return { success: false, classesCreated: 0, programme: null, error: "Une erreur s'est produite lors de la configuration." };
  }
}
