'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireActionContext } from '@/lib/actionContext'
import { applyCurriculum } from '@/lib/pedagogy'
import { LEVELS } from '@/lib/curriculum'
import { OFFICIAL_REQUIREMENTS_BY_CYCLE } from '@/lib/officialRequirements'
import { emailSchema, nameSchema, phoneSchema } from '@/lib/validations'

/**
 * Vérifie si une école au nom similaire existe déjà (détection de doublon).
 */
export async function checkDuplicateSchoolAction(schoolName: string, address?: string) {
  let currentSchoolId: string | undefined = undefined;
  try {
    const auth = await requireActionContext();
    if (auth.ok) currentSchoolId = auth.ctx.schoolId;
  } catch {
    // Mode script ou hors session HTTP
  }

  const query = schoolName.trim().toLowerCase();
  if (query.length < 3) return { duplicateFound: false };

  // Mots génériques à ignorer pour la comparaison
  const stopWords = new Set(["ecole", "école", "complexe", "scolaire", "groupe", "etablissement", "établissement", "cours", "institution", "de", "du", "la", "le", "les", "saint", "sainte"]);
  const tokens = query.split(/[\s'-]+/).filter((t) => t.length > 2 && !stopWords.has(t));

  const existingSchools = await prisma.school.findMany({
    where: {
      ...(currentSchoolId ? { id: { not: currentSchoolId } } : {}),
      onboardingCompleted: true,
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
    },
    take: 50,
  });

  for (const s of existingSchools) {
    const sNameNorm = s.name.toLowerCase();
    const sTokens = sNameNorm.split(/[\s'-]+/).filter((t) => t.length > 2 && !stopWords.has(t));
    
    // Correspondance exacte ou inclusion
    const isSubstring = query.length > 4 && sNameNorm.includes(query);
    const isReverseSubstring = sNameNorm.length > 4 && query.includes(sNameNorm);
    
    // Recouvrement des mots-clés significatifs
    const commonTokens = tokens.filter((t) => sTokens.some((st) => st.includes(t) || t.includes(st)));
    const hasStrongOverlap = tokens.length > 0 && commonTokens.length / tokens.length >= 0.5;

    if (isSubstring || isReverseSubstring || hasStrongOverlap) {
      return {
        duplicateFound: true,
        school: {
          name: s.name,
          city: s.address ? s.address.split(",").pop()?.trim() || s.address : "Sénégal",
          phone: s.phone,
        },
      };
    }
  }

  return { duplicateFound: false };
}

/**
 * Finalise la configuration d'un établissement.
 */
export async function completeOnboarding(data: any) {
  const auth = await requireActionContext()
  if (!auth.ok) return { success: false, classesCreated: 0, error: auth.error }
  const { schoolId, userId } = auth.ctx

  try {
    if (data.schoolName) {
      const nameVal = nameSchema.safeParse(data.schoolName);
      if (!nameVal.success) return { success: false, classesCreated: 0, error: `Nom de l'école : ${nameVal.error.issues[0]?.message || "invalide"}` };
    }
    if (data.phone) {
      const phoneVal = phoneSchema.safeParse(data.phone);
      if (!phoneVal.success) return { success: false, classesCreated: 0, error: `Téléphone : ${phoneVal.error.issues[0]?.message || "invalide"}` };
    }
    if (data.email) {
      const emailVal = emailSchema.safeParse(data.email);
      if (!emailVal.success) return { success: false, classesCreated: 0, error: `Email : ${emailVal.error.issues[0]?.message || "invalide"}` };
    }

    // 1. Mettre à jour l'école avec le nom, les contacts et les drapeaux d'état
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: data.schoolName,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        schoolActivated: true,
        setupProgress: {
          classes: true,
          programme: true,
          calendar: false,
          students: false,
          teachers: false,
          payments: false,
        },
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

    // 3. Générer les classes automatiquement selon les niveaux choisis et les classes sélectionnées.
    const classesToCreate: { name: string; schoolId: string; cycle: any }[] = [];
    const selectedClassSet = Array.isArray(data.selectedClasses) && data.selectedClasses.length > 0
      ? new Set(data.selectedClasses as string[])
      : null;

    for (const level of LEVELS) {
      if (!data.levels?.includes(level.id)) continue;
      for (const name of level.classes) {
        if (!selectedClassSet || selectedClassSet.has(name)) {
          classesToCreate.push({ name, schoolId, cycle: level.cycle });
        }
      }
    }

    let classesCreated = 0;
    if (classesToCreate.length > 0) {
      const res = await prisma.class.createMany({
        data: classesToCreate,
        skipDuplicates: true
      });
      classesCreated = res.count;

      // 4. Seeder le référentiel des pièces exigées pour les cycles sélectionnés
      const activeCycles = Array.from(new Set(classesToCreate.map((c) => c.cycle).filter(Boolean))) as any[];
      const reqsToCreate = activeCycles.flatMap((cycle) => {
        const reqs = (OFFICIAL_REQUIREMENTS_BY_CYCLE as any)[cycle] ?? [];
        return reqs.map((r: any, i: number) => ({
          label: r.label,
          category: r.category,
          cycle,
          source: r.source,
          required: r.required,
          pinned: r.pinned,
          conditional: r.conditional ?? null,
          studentKind: r.studentKind ?? null,
          validityMonths: null,
          position: r.order || i + 1,
          schoolId,
        }));
      });

      if (reqsToCreate.length > 0) {
        await prisma.documentRequirement.createMany({
          data: reqsToCreate,
          skipDuplicates: true,
        });
      }
    }

    revalidatePath("/", "layout");
    return { success: true, classesCreated, programme: null };
  } catch (error) {
    console.error("Erreur lors de l'onboarding:", error);
    return { success: false, classesCreated: 0, programme: null, error: "Une erreur s'est produite lors de la configuration." };
  }
}
