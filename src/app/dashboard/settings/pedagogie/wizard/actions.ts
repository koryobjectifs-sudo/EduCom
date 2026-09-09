"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { currentAcademicYear } from "@/lib/studentFile";
import { parseFlexibleDate } from "@/lib/dateUtils";
import { setupSchoolPedagogy } from "@/lib/pedagogy-setup";
import { type PedagogySetupPayload, type PedagogySetupResult } from "@/lib/pedagogy-types";

/**
 * 1. Initialise l'école avec les classes, le programme officiel et les trimestres datés.
 */
export async function initSchoolPedagogyAction(
  payload: PedagogySetupPayload
): Promise<{ success?: boolean; data?: PedagogySetupResult; error?: string }> {
  const auth = await requireActionContext("/dashboard/settings/pedagogie");
  if (!auth.ok) return { error: auth.error };

  try {
    const result = await setupSchoolPedagogy(auth.ctx, payload);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings/pedagogie");
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/grades");
    return { success: true, data: result };
  } catch (err: any) {
    console.error("Erreur initSchoolPedagogyAction:", err);
    return { error: err?.message || "Impossible d'initialiser la configuration." };
  }
}

/**
 * 2. Récupère les classes réelles de l'école pour le modèle Excel et l'attribution.
 */
export async function getSchoolClassesAction(): Promise<{ classes: { id: string; name: string; cycle: string }[]; error?: string }> {
  const auth = await requireActionContext("/dashboard/settings/pedagogie");
  if (!auth.ok) return { classes: [], error: auth.error };

  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: auth.ctx.schoolId },
      select: { id: true, name: true, cycle: true },
      orderBy: { name: "asc" },
    });
    return { classes };
  } catch (err: any) {
    return { classes: [], error: "Impossible de récupérer les classes." };
  }
}

export type WizardStudentRow = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  className?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
};

export type WizardImportResult = {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  duplicatesCount: number;
  parentsCreated: number;
  errors: { row: number; name: string; reason: string; raw: WizardStudentRow }[];
};

/**
 * 3. Import partiel avec déduplication des tuteurs par numéro de téléphone.
 */
export async function importStudentsWizardAction(
  rows: WizardStudentRow[]
): Promise<{ success?: boolean; data?: WizardImportResult; error?: string }> {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  if (!rows || rows.length === 0) {
    return { error: "Aucune donnée à importer." };
  }

  const year = currentAcademicYear();
  const errors: WizardImportResult["errors"] = [];
  const validRows: { index: number; row: WizardStudentRow }[] = [];

  // 1. Validation de premier niveau
  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // Index Excel (1-based + 1 pour l'en-tête)
    const fName = row.firstName?.trim();
    const lName = row.lastName?.trim();

    if (!fName || !lName) {
      errors.push({
        row: rowNum,
        name: `${fName || ""} ${lName || ""}`.trim() || "Ligne incomplète",
        reason: "Nom ou prénom manquant.",
        raw: row,
      });
      return;
    }

    validRows.push({ index: rowNum, row });
  });

  if (validRows.length === 0) {
    return {
      success: true,
      data: {
        totalRows: rows.length,
        importedCount: 0,
        failedCount: errors.length,
        duplicatesCount: 0,
        parentsCreated: 0,
        errors,
      },
    };
  }

  try {
    let importedCount = 0;
    let duplicatesCount = 0;
    let parentsCreated = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Résolution des classes
      const existingClasses = await tx.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      });
      const classMap = new Map(existingClasses.map((c) => [c.name.toLowerCase().trim(), c.id]));

      // 2. Gestion des parents par déduplication sur le numéro de téléphone normalisé
      const phoneToParentId = new Map<string, string>();
      const existingParents = await tx.user.findMany({
        where: { schoolId, role: "PARENT" },
        select: { id: true, phone: true },
      });
      for (const p of existingParents) {
        if (p.phone) {
          const norm = p.phone.replace(/\s+/g, "").replace(/^\+221/, "");
          phoneToParentId.set(norm, p.id);
        }
      }

      // 3. Détection des doublons élèves déjà existants
      const existingStudents = await tx.student.findMany({
        where: { schoolId },
        select: { firstName: true, lastName: true },
      });
      const existingSet = new Set(
        existingStudents.map((s) => `${s.firstName.toLowerCase().trim()}|${s.lastName.toLowerCase().trim()}`)
      );

      // Traiter les élèves valides
      for (const { index, row } of validRows) {
        const studentKey = `${row.firstName.toLowerCase().trim()}|${row.lastName.toLowerCase().trim()}`;
        if (existingSet.has(studentKey)) {
          duplicatesCount++;
        }

        // Tuteur / Parent
        let parentId: string | null = null;
        if (row.guardianPhone || row.guardianName) {
          const rawPhone = row.guardianPhone ? String(row.guardianPhone).trim() : "";
          const normPhone = rawPhone.replace(/\s+/g, "").replace(/^\+221/, "");

          if (normPhone && phoneToParentId.has(normPhone)) {
            parentId = phoneToParentId.get(normPhone)!;
          } else {
            // Créer le compte tuteur (User avec rôle PARENT)
            const names = (row.guardianName || "Parent").trim().split(" ");
            const pFirst = names.length > 1 ? names.slice(0, -1).join(" ") : names[0] || "Tuteur";
            const pLast = names.length > 1 ? names[names.length - 1] : "Famille";
            const cleanPhone = rawPhone.replace(/\s+/g, "");
            const placeholderEmail = `${cleanPhone || `parent_${Date.now()}_${Math.floor(Math.random() * 10000)}`}@parent.educom.local`;

            const newParent = await tx.user.create({
              data: {
                firstName: pFirst,
                lastName: pLast,
                phone: rawPhone || null,
                email: placeholderEmail,
                role: "PARENT",
                schoolId,
              },
              select: { id: true },
            });
            parentId = newParent.id;
            if (normPhone) phoneToParentId.set(normPhone, newParent.id);
            parentsCreated++;
          }
        }

        // Date de naissance
        const dob = parseFlexibleDate(row.dateOfBirth);

        // Créer l'élève
        const createdStudent = await tx.student.create({
          data: {
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            gender: row.gender?.trim() || null,
            dateOfBirth: dob,
            status: "ENROLLED",
            parentId,
            schoolId,
          },
          select: { id: true },
        });

        // Inscription dans la classe
        if (row.className) {
          const cId = classMap.get(row.className.toLowerCase().trim());
          if (cId) {
            await tx.enrollment.create({
              data: {
                studentId: createdStudent.id,
                classId: cId,
                academicYear: year,
              },
            });
          }
        }

        importedCount++;
      }

      await tx.auditLog.create({
        data: {
          action: "BULK_IMPORT",
          entity: "Student",
          entityId: schoolId,
          userId,
          schoolId,
          details: JSON.stringify({ imported: importedCount, parents: parentsCreated }),
        },
      });
    });

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        totalRows: rows.length,
        importedCount,
        failedCount: errors.length,
        duplicatesCount,
        parentsCreated,
        errors,
      },
    };
  } catch (err: any) {
    console.error("Erreur importStudentsWizardAction:", err);
    return { error: "Échec de l'enregistrement des données. Veuillez vérifier le fichier." };
  }
}

export type TeacherInviteInput = {
  identifier: string; // phone or email
  classIds?: string[];
};

/**
 * 4. Invitation rapide multi-saisie d'enseignants.
 */
export async function inviteTeachersWizardAction(
  invites: TeacherInviteInput[]
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const auth = await requireActionContext("/dashboard/settings/pedagogie");
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  if (!invites || invites.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    let createdCount = 0;

    for (const item of invites) {
      const trimmed = item.identifier.trim();
      if (!trimmed) continue;

      const isEmail = trimmed.includes("@");
      const phone = isEmail ? null : trimmed;
      const email = isEmail ? trimmed.toLowerCase() : null;

      // Vérifier si un compte existe déjà
      const existing = await prisma.user.findFirst({
        where: {
          schoolId,
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      let teacherId = existing?.id;

      if (!existing) {
        const cleanId = trimmed.replace(/\s+/g, "");
        const fallbackEmail = email || `${cleanId}@teacher.educom.local`;

        const created = await prisma.user.create({
          data: {
            firstName: "Enseignant",
            lastName: trimmed.replace(/[@.+]/g, " ").slice(0, 15),
            email: fallbackEmail,
            phone,
            role: "TEACHER",
            schoolId,
          },
          select: { id: true },
        });
        teacherId = created.id;
        createdCount++;
      }

      // Affecter aux classes sélectionnées
      if (teacherId && item.classIds && item.classIds.length > 0) {
        for (const classId of item.classIds) {
          // Définir comme titulaire si pas encore de titulaire
          await prisma.class.updateMany({
            where: { id: classId, schoolId, teacherId: null },
            data: { teacherId },
          });

          // Créer affectation globale
          const existingAssign = await prisma.teachingAssignment.findFirst({
            where: { schoolId, teacherId, classId, subjectId: null },
          });
          if (!existingAssign) {
            await prisma.teachingAssignment.create({
              data: {
                teacherId,
                classId,
                subjectId: null,
                schoolId,
              },
            });
          }
        }
      }
    }

    revalidatePath("/dashboard/settings/pedagogie");
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard");

    return { success: true, count: createdCount };
  } catch (err: any) {
    console.error("Erreur inviteTeachersWizardAction:", err);
    return { error: "Erreur lors de l'invitation des enseignants." };
  }
}
