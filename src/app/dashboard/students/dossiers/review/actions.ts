"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { currentAcademicYear, BUCKET, storagePathFor, signedUrlFor, sanitizeFileName } from "@/lib/studentFile";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_MIME, MAX_BYTES, checkFile } from "@/lib/studentFileLimits";
import type { DocCategory } from "../../../../../generated/prisma/client";

const READ_PATH = "/dashboard/students";

function done() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/students/dossiers/review");
}

/**
 * 1. Valide l'admission d'un élève (passage de PENDING à ENROLLED)
 */
export async function approveStudentAdmissionAction(studentId: string, classId?: string) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { enrollments: true },
    });
    if (!student) return { error: "Élève introuvable." };

    const year = currentAcademicYear();

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data: { status: "ENROLLED" },
      });

      if (classId) {
        const existingEnrollment = student.enrollments.find((e) => e.academicYear === year);
        if (existingEnrollment) {
          await tx.enrollment.update({
            where: { id: existingEnrollment.id },
            data: { classId },
          });
        } else {
          await tx.enrollment.create({
            data: {
              studentId,
              classId,
              academicYear: year,
            },
          });
        }
      }
    });

    await recordAudit(auth.ctx, {
      action: "STUDENT_ENROLLED",
      entity: "student",
      entityId: studentId,
      details: {
        message: `Admission validée pour ${student.firstName} ${student.lastName}`,
        classId: classId || null,
      },
    });

    done();
    return { success: true };
  } catch (err: any) {
    console.error("Erreur approveStudentAdmissionAction:", err);
    return { error: "Erreur lors de la validation de l'admission." };
  }
}

/**
 * 2. Validation en masse de plusieurs dossiers d'admission
 */
export async function bulkApproveStudentAdmissionsAction(studentIds: string[]) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  if (!studentIds || studentIds.length === 0) {
    return { error: "Aucun élève sélectionné." };
  }

  try {
    const res = await prisma.student.updateMany({
      where: { id: { in: studentIds }, schoolId },
      data: { status: "ENROLLED" },
    });

    await recordAudit(auth.ctx, {
      action: "STUDENTS_BULK_ENROLLED",
      entity: "student",
      entityId: schoolId,
      details: {
        message: `${res.count} admissions validées en masse`,
        studentIds,
      },
    });

    done();
    return { success: true, count: res.count };
  } catch (err: any) {
    console.error("Erreur bulkApproveStudentAdmissionsAction:", err);
    return { error: "Erreur lors de la validation groupée." };
  }
}

/**
 * 3. Rejette l'admission d'un élève (passage en INACTIVE)
 */
export async function rejectStudentAdmissionAction(studentId: string, reason?: string) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) return { error: "Élève introuvable." };

    await prisma.student.update({
      where: { id: studentId },
      data: { status: "INACTIVE" },
    });

    await recordAudit(auth.ctx, {
      action: "STUDENT_REJECTED",
      entity: "student",
      entityId: studentId,
      details: {
        message: `Admission refusée pour ${student.firstName} ${student.lastName}`,
        reason: reason || "Non spécifié",
      },
    });

    done();
    return { success: true };
  } catch (err: any) {
    console.error("Erreur rejectStudentAdmissionAction:", err);
    return { error: "Erreur lors du rejet du dossier." };
  }
}

/**
 * 4. Valide une pièce (statut CONFORME / VALIDATED)
 */
export async function validateStudentDocumentAction(input: {
  documentId?: string;
  studentId: string;
  requirementId: string;
  note?: string;
}) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  try {
    let doc = input.documentId
      ? await prisma.studentDocument.findFirst({
          where: { id: input.documentId, schoolId, studentId: input.studentId },
          include: { student: true, requirement: true },
        })
      : await prisma.studentDocument.findFirst({
          where: { studentId: input.studentId, requirementId: input.requirementId, supersededAt: null, schoolId },
          include: { student: true, requirement: true },
        });

    if (!doc) {
      // Si aucune pièce n'existe encore, on crée une pièce marquée conforme (ex: contrôle visuel direct du secrétariat)
      const req = await prisma.documentRequirement.findFirst({
        where: { id: input.requirementId, schoolId },
      });
      if (!req) return { error: "Exigence introuvable." };

      doc = await prisma.studentDocument.create({
        data: {
          studentId: input.studentId,
          requirementId: input.requirementId,
          label: req.label,
          category: req.category,
          storagePath: `validated-inline/${input.studentId}/${input.requirementId}`,
          fileName: "Controle_physique.txt",
          mimeType: "text/plain",
          sizeBytes: 0,
          status: "VALIDATED",
          reviewNote: input.note?.trim() || "Vérifié et accepté en présentiel",
          uploadedById: userId,
          uploadedByRole: auth.ctx.role,
          reviewedById: userId,
          reviewedAt: new Date(),
          schoolId,
        },
        include: { student: true, requirement: true },
      });
    } else {
      await prisma.studentDocument.update({
        where: { id: doc.id },
        data: {
          status: "VALIDATED",
          reviewNote: input.note?.trim() || null,
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });
    }

    // Traçabilité audit
    await recordAudit(auth.ctx, {
      action: "DOCUMENT_VALIDATED",
      entity: "studentDocument",
      entityId: doc.id,
      details: {
        studentId: input.studentId,
        requirementId: input.requirementId,
        fileName: doc.fileName,
      },
    });

    // Notification transactionnelle vers le parent si présent
    if (doc.student?.parentId) {
      const docLabel = doc.requirement?.label || doc.label || "pièce";
      await prisma.message.create({
        data: {
          direction: "OUTBOUND",
          status: "SENT",
          content: `Le document « ${docLabel} » de ${doc.student.firstName} a été validé par l'établissement.`,
          schoolId,
          parentId: doc.student.parentId,
        },
      }).catch((e) => console.warn("Notice message skipped:", e));
    }

    done();
    return { success: true };
  } catch (err: any) {
    console.error("Erreur validateStudentDocumentAction:", err);
    return { error: "Erreur lors de la validation de la pièce." };
  }
}

/**
 * 5. Rejette une pièce (statut NON_CONFORME / REJECTED avec motif obligatoire)
 */
export async function rejectStudentDocumentAction(input: {
  documentId?: string;
  studentId: string;
  requirementId: string;
  reason: string;
}) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  if (!input.reason || input.reason.trim().length === 0) {
    return { error: "Le motif du refus est obligatoire pour orienter la famille." };
  }

  try {
    let doc = input.documentId
      ? await prisma.studentDocument.findFirst({
          where: { id: input.documentId, schoolId, studentId: input.studentId },
          include: { student: true, requirement: true },
        })
      : await prisma.studentDocument.findFirst({
          where: { studentId: input.studentId, requirementId: input.requirementId, supersededAt: null, schoolId },
          include: { student: true, requirement: true },
        });

    if (!doc) {
      const req = await prisma.documentRequirement.findFirst({
        where: { id: input.requirementId, schoolId },
      });
      if (!req) return { error: "Exigence introuvable." };

      doc = await prisma.studentDocument.create({
        data: {
          studentId: input.studentId,
          requirementId: input.requirementId,
          label: req.label,
          category: req.category,
          storagePath: `rejected/${input.studentId}/${input.requirementId}`,
          fileName: "Rejet.txt",
          mimeType: "text/plain",
          sizeBytes: 0,
          status: "REJECTED",
          reviewNote: input.reason.trim(),
          uploadedById: userId,
          uploadedByRole: auth.ctx.role,
          reviewedById: userId,
          reviewedAt: new Date(),
          schoolId,
        },
        include: { student: true, requirement: true },
      });
    } else {
      await prisma.studentDocument.update({
        where: { id: doc.id },
        data: {
          status: "REJECTED",
          reviewNote: input.reason.trim(),
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });
    }

    await recordAudit(auth.ctx, {
      action: "DOCUMENT_REJECTED",
      entity: "studentDocument",
      entityId: doc.id,
      details: {
        studentId: input.studentId,
        requirementId: input.requirementId,
        reason: input.reason.trim(),
      },
    });

    // Notification transactionnelle au parent
    if (doc.student?.parentId) {
      const docLabel = doc.requirement?.label || doc.label || "pièce";
      await prisma.message.create({
        data: {
          direction: "OUTBOUND",
          status: "SENT",
          content: `Le document « ${docLabel} » de ${doc.student.firstName} doit être renvoyé. Motif : ${input.reason.trim()}`,
          schoolId,
          parentId: doc.student.parentId,
        },
      }).catch((e) => console.warn("Notice message skipped:", e));
    }

    done();
    return { success: true };
  } catch (err: any) {
    console.error("Erreur rejectStudentDocumentAction:", err);
    return { error: "Erreur lors du rejet du document." };
  }
}

/**
 * 6. Marque une pièce en "EN_REGULARISATION" (démarche en cours)
 */
export async function markDocumentRegularisationAction(input: {
  studentId: string;
  requirementId: string;
  note?: string;
}) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  try {
    const req = await prisma.documentRequirement.findFirst({
      where: { id: input.requirementId, schoolId },
    });
    if (!req) return { error: "Exigence introuvable." };

    const existing = await prisma.studentDocument.findFirst({
      where: {
        studentId: input.studentId,
        requirementId: input.requirementId,
        supersededAt: null,
      },
    });

    if (existing) {
      await prisma.studentDocument.update({
        where: { id: existing.id },
        data: {
          status: "EN_REGULARISATION",
          reviewNote: input.note?.trim() || "Démarche en cours auprès de l'état civil",
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });
    } else {
      await prisma.studentDocument.create({
        data: {
          studentId: input.studentId,
          requirementId: input.requirementId,
          label: req.label,
          category: req.category,
          storagePath: `regularisation/${input.studentId}/${input.requirementId}`,
          fileName: "Demarche_en_cours.txt",
          mimeType: "text/plain",
          sizeBytes: 0,
          status: "EN_REGULARISATION",
          reviewNote: input.note?.trim() || "Démarche en cours auprès de l'état civil",
          uploadedById: userId,
          uploadedByRole: auth.ctx.role,
          reviewedById: userId,
          reviewedAt: new Date(),
          schoolId,
        },
      });
    }

    done();
    return { success: true };
  } catch (err: any) {
    console.error("Erreur markDocumentRegularisationAction:", err);
    return { error: "Erreur lors de la mise en régularisation." };
  }
}

/**
 * 7. Marque une pièce en "EN_REGULARISATION" pour plusieurs élèves sélectionnés
 */
export async function bulkMarkRegularisationAction(studentIds: string[], requirementId: string, note?: string) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  if (!studentIds || studentIds.length === 0) return { error: "Aucun élève sélectionné." };

  try {
    const req = await prisma.documentRequirement.findFirst({
      where: { id: requirementId, schoolId },
    });
    if (!req) return { error: "Exigence introuvable." };

    for (const studentId of studentIds) {
      const existing = await prisma.studentDocument.findFirst({
        where: { studentId, requirementId, supersededAt: null },
      });

      if (existing) {
        await prisma.studentDocument.update({
          where: { id: existing.id },
          data: {
            status: "EN_REGULARISATION",
            reviewNote: note?.trim() || "Démarche en cours",
            reviewedById: userId,
            reviewedAt: new Date(),
          },
        });
      } else {
        await prisma.studentDocument.create({
          data: {
            studentId,
            requirementId,
            label: req.label,
            category: req.category,
            storagePath: `regularisation/${studentId}/${requirementId}`,
            fileName: "Demarche_en_cours.txt",
            mimeType: "text/plain",
            sizeBytes: 0,
            status: "EN_REGULARISATION",
            reviewNote: note?.trim() || "Démarche en cours",
            uploadedById: userId,
            uploadedByRole: auth.ctx.role,
            reviewedById: userId,
            reviewedAt: new Date(),
            schoolId,
          },
        });
      }
    }

    done();
    return { success: true, count: studentIds.length };
  } catch (err: any) {
    console.error("Erreur bulkMarkRegularisationAction:", err);
    return { error: "Erreur lors de la mise en régularisation groupée." };
  }
}

/**
 * 8. Obtient l'URL signée temporaire (15 min) pour l'aperçu du document dans le panneau latéral
 */
export async function getSignedDocumentUrlAction(documentId: string) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };

  return await signedUrlFor(auth.ctx, documentId, 900); // 15 minutes TTL
}

/**
 * 9. Dépôt ou remplacement direct de document depuis la cellule ou le panneau latéral
 */
export async function uploadStudentDocumentDirectAction(formData: FormData) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  const file = formData.get("file") as File | null;
  const studentId = formData.get("studentId") as string | null;
  const requirementId = formData.get("requirementId") as string | null;

  if (!file || !studentId || !requirementId) {
    return { error: "Fichier, élève ou exigence manquant." };
  }

  // Contrôle de sécurité fichier (format, taille)
  const check = checkFile(file.type, file.name, file.size);
  if (!check.ok) {
    return { error: check.error };
  }

  try {
    const [student, req] = await Promise.all([
      prisma.student.findFirst({ where: { id: studentId, schoolId } }),
      prisma.documentRequirement.findFirst({ where: { id: requirementId, schoolId } }),
    ]);
    if (!student || !req) return { error: "Élève ou exigence introuvable." };

    const cleanName = sanitizeFileName(file.name);
    const newDocId = crypto.randomUUID();
    const storagePath = storagePathFor(schoolId, studentId, newDocId, cleanName);

    // Upload Supabase Storage
    const supabase = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage Error:", uploadError);
      return { error: `Erreur lors de l'enregistrement du fichier (${uploadError.message}).` };
    }

    // Gestion du chaînage de remplacement
    const existing = await prisma.studentDocument.findFirst({
      where: { studentId, requirementId, supersededAt: null, schoolId },
    });

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.studentDocument.update({
          where: { id: existing.id },
          data: { supersededAt: now },
        });
      }

      await tx.studentDocument.create({
        data: {
          id: newDocId,
          studentId,
          requirementId,
          label: req.label,
          category: req.category,
          storagePath,
          fileName: cleanName,
          mimeType: file.type,
          sizeBytes: file.size,
          status: "TO_VERIFY", // État "FOURNI / À vérifier"
          uploadedById: userId,
          uploadedByRole: auth.ctx.role,
          supersedesId: existing ? existing.id : null,
          schoolId,
        },
      });
    });

    await recordAudit(auth.ctx, {
      action: "DOCUMENT_UPLOADED",
      entity: "studentDocument",
      entityId: newDocId,
      details: {
        studentId,
        requirementId,
        fileName: cleanName,
        sizeBytes: file.size,
      },
    });

    done();
    return { success: true, documentId: newDocId };
  } catch (err: any) {
    console.error("Erreur uploadStudentDocumentDirectAction:", err);
    return { error: "Erreur lors du téléversement du document." };
  }
}

/**
 * 10. Dépôt en masse d'un même document pour plusieurs élèves sélectionnés
 */
export async function bulkUploadStudentDocumentAction(formData: FormData) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  const file = formData.get("file") as File | null;
  const requirementId = formData.get("requirementId") as string | null;
  const rawStudentIds = formData.get("studentIds") as string | null;

  if (!file || !requirementId || !rawStudentIds) {
    return { error: "Fichier, exigence ou élèves manquants." };
  }

  const studentIds = JSON.parse(rawStudentIds) as string[];
  if (!studentIds || studentIds.length === 0) return { error: "Aucun élève sélectionné." };

  const check = checkFile(file.type, file.name, file.size);
  if (!check.ok) return { error: check.error };

  try {
    const req = await prisma.documentRequirement.findFirst({
      where: { id: requirementId, schoolId },
    });
    if (!req) return { error: "Exigence introuvable." };

    const cleanName = sanitizeFileName(file.name);
    const supabase = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();

    let uploadedCount = 0;
    for (const studentId of studentIds) {
      const docId = crypto.randomUUID();
      const storagePath = storagePathFor(schoolId, studentId, docId, cleanName);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, arrayBuffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!uploadError) {
        const existing = await prisma.studentDocument.findFirst({
          where: { studentId, requirementId, supersededAt: null, schoolId },
        });

        const now = new Date();
        if (existing) {
          await prisma.studentDocument.update({
            where: { id: existing.id },
            data: { supersededAt: now },
          });
        }

        await prisma.studentDocument.create({
          data: {
            id: docId,
            studentId,
            requirementId,
            label: req.label,
            category: req.category,
            storagePath,
            fileName: cleanName,
            mimeType: file.type,
            sizeBytes: file.size,
            status: "TO_VERIFY",
            uploadedById: userId,
            uploadedByRole: auth.ctx.role,
            supersedesId: existing ? existing.id : null,
            schoolId,
          },
        });
        uploadedCount++;
      }
    }

    done();
    return { success: true, count: uploadedCount };
  } catch (err: any) {
    console.error("Erreur bulkUploadStudentDocumentAction:", err);
    return { error: "Erreur lors du dépôt en masse." };
  }
}

/**
 * 11. Met à jour les coordonnées du tuteur directement depuis la vue d'examen
 */
export async function updateStudentParentDirectAction(input: {
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  const auth = await requireActionContext(READ_PATH);
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  try {
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, schoolId },
      include: { parent: true },
    });
    if (!student) return { error: "Élève introuvable." };

    const normPhone = input.phone.replace(/[^0-9]/g, "");

    if (student.parentId) {
      await prisma.user.update({
        where: { id: student.parentId },
        data: {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone.trim() || null,
        },
      });
    } else {
      let parentUser = normPhone
        ? await prisma.user.findFirst({
            where: { schoolId, role: "PARENT", phone: input.phone.trim() },
          })
        : null;

      if (!parentUser) {
        const placeholderEmail = `${normPhone || `parent_${Date.now()}`}@parent.educom.local`;
        parentUser = await prisma.user.create({
          data: {
            firstName: input.firstName.trim() || "Tuteur",
            lastName: input.lastName.trim() || "Famille",
            phone: input.phone.trim() || null,
            email: placeholderEmail,
            role: "PARENT",
            schoolId,
          },
        });
      }

      await prisma.student.update({
        where: { id: input.studentId },
        data: { parentId: parentUser.id },
      });
    }

    done();
    return { success: true };
  } catch (err: any) {
    console.error("Erreur updateStudentParentDirectAction:", err);
    return { error: "Erreur lors de la mise à jour du tuteur." };
  }
}

