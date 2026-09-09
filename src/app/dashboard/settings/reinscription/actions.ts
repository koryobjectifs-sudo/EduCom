"use server";

import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import {
  getNextAcademicYear,
  predictNextClass,
  normalizeClassName,
  EXIT_DESTINATION,
} from "@/lib/reinscription";

export interface ReinscriptionInitData {
  schoolId: string;
  schoolName: string;
  sourceYear: string;
  targetYear: string;
  availableYears: string[];
  classes: {
    id: string;
    name: string;
    cycle: string;
    studentCount: number;
  }[];
  defaultRules: {
    sourceClassId: string;
    sourceClassName: string;
    sourceCycle: string;
    targetClassId: string | typeof EXIT_DESTINATION;
    targetClassName: string;
    targetCycle: string;
    isExit: boolean;
    isNewClass: boolean;
  }[];
  students: {
    studentId: string;
    firstName: string;
    lastName: string;
    matricule: string | null;
    gender: string | null;
    sourceClassId: string;
    sourceClassName: string;
    sourceCycle: string;
    targetClassId: string | typeof EXIT_DESTINATION;
    targetClassName: string;
    isReenrolled: boolean;
    isAlreadyEnrolledInTarget: boolean;
    existingTargetClassId?: string;
    existingTargetClassName?: string;
  }[];
  targetStats: {
    alreadyEnrolledCount: number;
    hasGrades: boolean;
    gradesCount: number;
    canCancel: boolean;
  };
}

/**
 * Charge toutes les données nécessaires pour l'assistant de réinscription.
 */
export async function getReinscriptionInitDataAction(
  sourceYearParam?: string,
  targetYearParam?: string
): Promise<{ success: boolean; data?: ReinscriptionInitData; error?: string }> {
  try {
    const { schoolId, school, user } = await requireSchoolContext();

    // ⚠️ RESTRICTION STRICTE : OWNER ET ADMIN UNIQUEMENT
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return { success: false, error: "Action strictement réservée à la direction (OWNER et ADMIN)." };
    }

    const currentYear = school?.activeAcademicYear || "2025-2026";
    const sourceYear = sourceYearParam?.trim() || currentYear;
    const targetYear = targetYearParam?.trim() || getNextAcademicYear(sourceYear);

    // 1. Récupérer toutes les classes de l'école
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        cycle: true,
        _count: {
          select: {
            enrollments: {
              where: { academicYear: sourceYear },
            },
          },
        },
      },
    });

    // 2. Récupérer toutes les années scolaires existantes
    const [enrollmentYears, feeYears] = await Promise.all([
      prisma.enrollment.findMany({
        where: { class: { schoolId } },
        distinct: ["academicYear"],
        select: { academicYear: true },
      }),
      prisma.feeSchedule.findMany({
        where: { schoolId },
        distinct: ["academicYear"],
        select: { academicYear: true },
      }),
    ]);

    const availableYears = Array.from(
      new Set([
        currentYear,
        sourceYear,
        targetYear,
        ...enrollmentYears.map((e) => e.academicYear),
        ...feeYears.map((f) => f.academicYear),
      ])
    ).sort((a, b) => b.localeCompare(a));

    // 3. Récupérer les inscriptions de l'année source
    const sourceEnrollments = await prisma.enrollment.findMany({
      where: {
        academicYear: sourceYear,
        class: { schoolId },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            gender: true,
            status: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            cycle: true,
          },
        },
      },
      orderBy: [
        { class: { name: "asc" } },
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });

    // 4. Récupérer les inscriptions déjà existantes sur l'année cible
    const targetEnrollments = await prisma.enrollment.findMany({
      where: {
        academicYear: targetYear,
        class: { schoolId },
      },
      select: {
        studentId: true,
        classId: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    const targetEnrollmentMap = new Map<string, { classId: string; className: string }>();
    for (const te of targetEnrollments) {
      targetEnrollmentMap.set(te.studentId, {
        classId: te.classId,
        className: te.class.name,
      });
    }

    // 5. Vérifier la présence de bulletins, notes ou activités sur l'année cible
    const [reportCardsCount, gradesCount, attendanceCount] = await Promise.all([
      prisma.reportCard.count({
        where: {
          schoolId,
          class: {
            enrollments: {
              some: { academicYear: targetYear },
            },
          },
        },
      }),
      prisma.grade.count({
        where: {
          class: {
            schoolId,
            enrollments: {
              some: { academicYear: targetYear },
            },
          },
        },
      }),
      prisma.attendance.count({
        where: {
          class: {
            schoolId,
            enrollments: {
              some: { academicYear: targetYear },
            },
          },
        },
      }),
    ]);

    const totalPedagogicalActivity = reportCardsCount + gradesCount + attendanceCount;

    // 6. Construire les règles de promotion par défaut
    const defaultRules = classes.map((c) => {
      const pred = predictNextClass(c.name, c.cycle);
      let matchedTargetClass = pred.isExit
        ? null
        : classes.find(
            (existing) => normalizeClassName(existing.name) === normalizeClassName(pred.targetName)
          );

      const isExit = pred.isExit;
      const isNewClass = !isExit && !matchedTargetClass;

      return {
        sourceClassId: c.id,
        sourceClassName: c.name,
        sourceCycle: c.cycle,
        targetClassId: isExit ? EXIT_DESTINATION : matchedTargetClass ? matchedTargetClass.id : EXIT_DESTINATION,
        targetClassName: isExit ? "Sortie de cycle" : pred.targetName,
        targetCycle: pred.cycle,
        isExit,
        isNewClass,
      };
    });

    const ruleBySourceClassId = new Map(defaultRules.map((r) => [r.sourceClassId, r]));

    // 7. Construire la liste des élèves
    const students = sourceEnrollments.map((enr) => {
      const rule = ruleBySourceClassId.get(enr.classId);
      const existingTarget = targetEnrollmentMap.get(enr.studentId);
      const isAlready = Boolean(existingTarget);

      const targetClassId = existingTarget
        ? existingTarget.classId
        : rule
        ? rule.targetClassId
        : EXIT_DESTINATION;

      const targetClassName = existingTarget
        ? existingTarget.className
        : rule
        ? rule.targetClassName
        : "Sortie";

      const isExit = targetClassId === EXIT_DESTINATION;

      return {
        studentId: enr.student.id,
        firstName: enr.student.firstName,
        lastName: enr.student.lastName,
        matricule: enr.student.matricule,
        gender: enr.student.gender,
        sourceClassId: enr.class.id,
        sourceClassName: enr.class.name,
        sourceCycle: enr.class.cycle,
        targetClassId,
        targetClassName,
        isReenrolled: isAlready ? true : !isExit,
        isAlreadyEnrolledInTarget: isAlready,
        existingTargetClassId: existingTarget?.classId,
        existingTargetClassName: existingTarget?.className,
      };
    });

    return {
      success: true,
      data: {
        schoolId,
        schoolName: school?.name || "Établissement",
        sourceYear,
        targetYear,
        availableYears,
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          cycle: c.cycle,
          studentCount: c._count.enrollments,
        })),
        defaultRules,
        students,
        targetStats: {
          alreadyEnrolledCount: targetEnrollments.length,
          hasGrades: totalPedagogicalActivity > 0,
          gradesCount: totalPedagogicalActivity,
          canCancel: targetEnrollments.length > 0 && totalPedagogicalActivity === 0,
        },
      },
    };
  } catch (error: any) {
    console.error("[getReinscriptionInitDataAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors du chargement des données." };
  }
}

export interface ExecuteReinscriptionPayload {
  sourceYear: string;
  targetYear: string;
  newClassesToCreate?: {
    name: string;
    cycle: string;
  }[];
  studentAssignments: {
    studentId: string;
    targetClassId?: string;
    targetClassName?: string;
    targetClassCycle?: string;
    isReenrolled: boolean;
  }[];
}

/**
 * Exécute la réinscription en masse avec upsert (mise à jour de classe si corrigée),
 * transaction et gestion de statut pour les non-réinscrits.
 */
export async function executeReinscriptionAction(
  payload: ExecuteReinscriptionPayload
): Promise<{
  success: boolean;
  error?: string;
  summary?: {
    totalEvaluated: number;
    reenrolledCount: number;
    exitCount: number;
    createdClassesCount: number;
    targetYear: string;
  };
}> {
  try {
    const { schoolId, user } = await requireSchoolContext();

    // ⚠️ RESTRICTION STRICTE : OWNER ET ADMIN UNIQUEMENT
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return { success: false, error: "Action strictement réservée à la direction (OWNER et ADMIN)." };
    }

    const { sourceYear, targetYear, newClassesToCreate = [], studentAssignments } = payload;

    if (!sourceYear || !targetYear) {
      return { success: false, error: "Année source et année cible requises." };
    }

    if (sourceYear === targetYear) {
      return { success: false, error: "L'année cible doit être distincte de l'année source." };
    }

    // 1. Transaction pour la création de classes, l'upsert des inscriptions et l'ajustement des statuts
    const result = await prisma.$transaction(async (tx) => {
      // a) Créer les nouvelles classes si nécessaire
      const createdClassMap = new Map<string, string>();

      for (const newCls of newClassesToCreate) {
        if (!newCls.name || !newCls.name.trim()) continue;
        const normName = normalizeClassName(newCls.name);

        let existing = await tx.class.findFirst({
          where: {
            schoolId,
            name: { equals: newCls.name.trim(), mode: "insensitive" },
          },
        });

        if (!existing) {
          existing = await tx.class.create({
            data: {
              name: newCls.name.trim(),
              cycle: (newCls.cycle as any) || "AUTRE",
              schoolId,
            },
          });
        }
        createdClassMap.set(normName, existing.id);
      }

      // b) Récupérer toutes les classes de l'école pour mapping complet
      const allClasses = await tx.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      });
      const classIdByName = new Map<string, string>();
      for (const c of allClasses) {
        classIdByName.set(normalizeClassName(c.name), c.id);
        classIdByName.set(c.id, c.id);
      }

      // c) Traiter les inscriptions (upsert pour appliquer toute correction de classe)
      let reenrolledCount = 0;
      let exitCount = 0;
      const nonReenrolledStudentIds: string[] = [];

      for (const assign of studentAssignments) {
        if (!assign.isReenrolled) {
          exitCount++;
          nonReenrolledStudentIds.push(assign.studentId);
          continue;
        }

        let resolvedClassId = assign.targetClassId;

        if ((!resolvedClassId || resolvedClassId === EXIT_DESTINATION) && assign.targetClassName) {
          const norm = normalizeClassName(assign.targetClassName);
          resolvedClassId = createdClassMap.get(norm) || classIdByName.get(norm);
        }

        if (!resolvedClassId || resolvedClassId === EXIT_DESTINATION) {
          exitCount++;
          nonReenrolledStudentIds.push(assign.studentId);
          continue;
        }

        // ⚠️ UPSERT : Si l'inscription existait déjà, la classe de destination est mise à jour
        await tx.enrollment.upsert({
          where: {
            studentId_academicYear: {
              studentId: assign.studentId,
              academicYear: targetYear,
            },
          },
          create: {
            studentId: assign.studentId,
            classId: resolvedClassId,
            academicYear: targetYear,
          },
          update: {
            classId: resolvedClassId,
          },
        });

        // L'élève réinscrit est actif
        await tx.student.update({
          where: { id: assign.studentId },
          data: { status: "ENROLLED" },
        });

        reenrolledCount++;
      }

      // d) Règle pour les élèves non réinscrits :
      // Si l'élève ne se réinscrit pas, marquer son statut :
      // - Fin de cycle (CM2, 3ème, Terminale) -> GRADUATED
      // - Hors fin de cycle (départ / radiation) -> INACTIVE
      if (nonReenrolledStudentIds.length > 0) {
        // Déterminer le cycle de l'année source pour chaque non-réinscrit
        const sourceEnrollments = await tx.enrollment.findMany({
          where: {
            studentId: { in: nonReenrolledStudentIds },
            academicYear: sourceYear,
          },
          select: {
            studentId: true,
            class: { select: { name: true, cycle: true } },
          },
        });

        for (const enr of sourceEnrollments) {
          const pred = predictNextClass(enr.class.name, enr.class.cycle);
          const newStatus = pred.isExit ? "GRADUATED" : "INACTIVE";
          await tx.student.update({
            where: { id: enr.studentId },
            data: { status: newStatus as never },
          });
        }
      }

      return {
        totalEvaluated: studentAssignments.length,
        reenrolledCount,
        exitCount,
        createdClassesCount: newClassesToCreate.length,
      };
    });

    // 2. Enregistrer l'audit
    await recordAudit(
      { userId: user.id, schoolId, role: user.role },
      {
        action: "execute_mass_reinscription",
        entity: "reinscription",
        outcome: "success",
        details: {
          sourceYear,
          targetYear,
          totalStudents: result.totalEvaluated,
          reenrolledStudents: result.reenrolledCount,
          exitStudents: result.exitCount,
          newClassesCreated: result.createdClassesCount,
        },
      }
    );

    return {
      success: true,
      summary: {
        totalEvaluated: result.totalEvaluated,
        reenrolledCount: result.reenrolledCount,
        exitCount: result.exitCount,
        createdClassesCount: result.createdClassesCount,
        targetYear,
      },
    };
  } catch (error: any) {
    console.error("[executeReinscriptionAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de l'exécution de la réinscription." };
  }
}

/**
 * Annule la réinscription pour l'année cible (avec vérification complète de notes, factures, paiements, présences et pièces).
 */
export async function cancelReinscriptionAction(
  targetYear: string
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const { schoolId, user } = await requireSchoolContext();

    // ⚠️ RESTRICTION STRICTE : OWNER ET ADMIN UNIQUEMENT
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return { success: false, error: "Action strictement réservée à la direction (OWNER et ADMIN)." };
    }

    if (!targetYear) {
      return { success: false, error: "Année cible requise." };
    }

    // 1. GARDE-FOUS ÉTENDUS : Vérifier bulletins, notes, présences, factures et paiements sur l'année cible
    const [reportCardsCount, gradesCount, attendanceCount] = await Promise.all([
      prisma.reportCard.count({
        where: {
          schoolId,
          class: { enrollments: { some: { academicYear: targetYear } } },
        },
      }),
      prisma.grade.count({
        where: {
          class: { schoolId, enrollments: { some: { academicYear: targetYear } } },
        },
      }),
      prisma.attendance.count({
        where: {
          class: { schoolId, enrollments: { some: { academicYear: targetYear } } },
        },
      }),
    ]);

    if (reportCardsCount > 0 || gradesCount > 0) {
      return {
        success: false,
        error: `Impossible d'annuler la réinscription : des bulletins (${reportCardsCount}) ou des notes (${gradesCount}) sont déjà rattachés à l'année ${targetYear}.`,
      };
    }

    if (attendanceCount > 0) {
      return {
        success: false,
        error: `Impossible d'annuler la réinscription : ${attendanceCount} appel(s) de présence ont déjà été enregistrés sur l'année ${targetYear}.`,
      };
    }

    // 2. Supprimer les inscriptions de l'année cible
    const deleteRes = await prisma.enrollment.deleteMany({
      where: {
        academicYear: targetYear,
        class: { schoolId },
      },
    });

    // 3. Audit
    await recordAudit(
      { userId: user.id, schoolId, role: user.role },
      {
        action: "cancel_mass_reinscription",
        entity: "reinscription",
        outcome: "success",
        details: {
          targetYear,
          deletedEnrollments: deleteRes.count,
        },
      }
    );

    return {
      success: true,
      deletedCount: deleteRes.count,
    };
  } catch (error: any) {
    console.error("[cancelReinscriptionAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de l'annulation de la réinscription." };
  }
}

