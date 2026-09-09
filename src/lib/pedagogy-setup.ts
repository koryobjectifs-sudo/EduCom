import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { recordAudit } from "@/lib/audit";
import { applyCurriculum } from "@/lib/pedagogy";
import { currentAcademicYear } from "@/lib/studentFile";
import {
  SCHOOL_TYPE_CLASSES,
  type SchoolTypeOption,
  type PedagogySetupPayload,
  type PedagogySetupResult,
} from "@/lib/pedagogy-types";

export {
  SCHOOL_TYPE_CLASSES,
  type SchoolTypeOption,
  type PedagogySetupPayload,
  type PedagogySetupResult,
};

/**
 * Initialisation rapide et silencieuse de la configuration pédagogique pour une école.
 * Idempotente : ne supprime rien, complète ce qui manque avec les standards sénégalais.
 */
export async function setupSchoolPedagogy(
  actor: ActorContext,
  payload: PedagogySetupPayload
): Promise<PedagogySetupResult> {
  const { schoolId } = actor;
  const yearStr = payload.academicYear || currentAcademicYear();
  
  // Extraire l'année de début (ex: "2026-2027" -> 2026)
  const match = yearStr.match(/(\d{4})/);
  const startYear = match ? parseInt(match[1], 10) : new Date().getFullYear();
  const endYear = startYear + 1;

  let classesCreated = 0;
  let classesExisting = 0;

  // 1. Création idempotente des classes
  for (const c of payload.classes) {
    const existing = await prisma.class.findFirst({
      where: { schoolId, name: c.name },
      select: { id: true },
    });

    if (existing) {
      classesExisting++;
    } else {
      await prisma.class.create({
        data: {
          name: c.name,
          cycle: c.cycle,
          schoolId,
        },
      });
      classesCreated++;
    }
  }

  // 2. Application du programme et coefficients standard
  const curriculumResult = await applyCurriculum(actor, { withControls: true });

  // 3. Trimestres et évaluations avec dates par défaut du calendrier sénégalais
  // T1: 5 Octobre au 23 Décembre
  // T2: 5 Janvier au 31 Mars
  // T3: 15 Avril au 30 Juin
  const standardTerms = [
    {
      name: "1er Trimestre",
      startDate: new Date(startYear, 9, 5), // 5 Octobre
      endDate: new Date(startYear, 11, 23), // 23 Décembre
      controlName: "Contrôle du 1er trimestre",
      controlDate: new Date(startYear, 10, 15), // 15 Novembre
      compName: "Composition du 1er trimestre",
      compDate: new Date(startYear, 11, 15), // 15 Décembre
    },
    {
      name: "2ème Trimestre",
      startDate: new Date(endYear, 0, 5), // 5 Janvier
      endDate: new Date(endYear, 2, 31), // 31 Mars
      controlName: "Contrôle du 2e trimestre",
      controlDate: new Date(endYear, 1, 15), // 15 Février
      compName: "Composition du 2e trimestre",
      compDate: new Date(endYear, 2, 20), // 20 Mars
    },
    {
      name: "3ème Trimestre",
      startDate: new Date(endYear, 3, 15), // 15 Avril
      endDate: new Date(endYear, 5, 30), // 30 Juin
      controlName: "Contrôle du 3e trimestre",
      controlDate: new Date(endYear, 4, 15), // 15 Mai
      compName: "Composition du 3e trimestre",
      compDate: new Date(endYear, 5, 15), // 15 Juin
    },
  ];

  let termsCreated = 0;
  let evaluationsCreated = 0;

  for (const st of standardTerms) {
    let term = await prisma.term.findFirst({
      where: { schoolId, name: st.name },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!term) {
      term = await prisma.term.create({
        data: {
          name: st.name,
          startDate: st.startDate,
          endDate: st.endDate,
          schoolId,
        },
        select: { id: true, startDate: true, endDate: true },
      });
      termsCreated++;
    } else if (!term.startDate || !term.endDate) {
      // Compléter les dates si absentes
      await prisma.term.update({
        where: { id: term.id },
        data: {
          startDate: term.startDate || st.startDate,
          endDate: term.endDate || st.endDate,
        },
      });
    }

    // Contrôle
    const existingCtrl = await prisma.evaluation.findFirst({
      where: { schoolId, termId: term.id, name: st.controlName },
      select: { id: true, date: true },
    });
    if (!existingCtrl) {
      await prisma.evaluation.create({
        data: {
          name: st.controlName,
          type: "QUIZ",
          date: st.controlDate,
          termId: term.id,
          schoolId,
        },
      });
      evaluationsCreated++;
    } else if (!existingCtrl.date) {
      await prisma.evaluation.update({
        where: { id: existingCtrl.id },
        data: { date: st.controlDate },
      });
    }

    // Composition
    const existingComp = await prisma.evaluation.findFirst({
      where: { schoolId, termId: term.id, name: st.compName },
      select: { id: true, date: true },
    });
    if (!existingComp) {
      await prisma.evaluation.create({
        data: {
          name: st.compName,
          type: "EXAM",
          date: st.compDate,
          termId: term.id,
          schoolId,
        },
      });
      evaluationsCreated++;
    } else if (!existingComp.date) {
      await prisma.evaluation.update({
        where: { id: existingComp.id },
        data: { date: st.compDate },
      });
    }
  }

  const allClasses = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, cycle: true },
  });

  await recordAudit(actor, {
    action: "setup_quick_pedagogy",
    entity: "curriculum",
    details: {
      classesCreated,
      classesExisting,
      curriculum: curriculumResult,
      termsCreated,
      evaluationsCreated,
    },
  });

  return {
    classesCreated,
    classesExisting,
    subjectsCreated: curriculumResult.subjectsCreated,
    linksCreated: curriculumResult.linksCreated,
    termsCreated,
    evaluationsCreated,
    totalClasses: allClasses.length,
    nonMaternelleClasses: allClasses.filter((c) => c.cycle !== "MATERNELLE").length,
  };
}
