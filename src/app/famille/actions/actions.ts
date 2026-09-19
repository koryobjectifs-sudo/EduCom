"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { resolveSchoolContext } from "@/lib/schoolContext";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit";
import {
  BUCKET,
  storagePathFor,
  sanitizeFileName,
  currentAcademicYear,
} from "@/lib/studentFile";
import {
  checkFile,
  validateMagicBytes,
} from "@/lib/studentFileLimits";

import {
  generateSignedDocumentHtml,
  computeSignatureSha256,
  type SignedDocumentPayload,
} from "@/lib/signedDocumentGenerator";

export interface SubmitSignatureInput {
  studentId: string;
  requirementId: string;
  signatureImageBase64: string;
  signatureType: "DRAWN" | "SCANNED";
  attestationConfirmed: boolean;
  notes?: string;
}

/**
 * Exécute et certifie la signature électronique d'un document par le parent.
 *
 * GARANTIES DE SÉCURITÉ :
 * 1. Contexte d'école actif validé via resolveSchoolContext().
 * 2. L'élève doit STRICTEMENT appartenir au parent connecté (parentId == user.id)
 *    ET à l'école active (Fail-Closed).
 * 3. L'exigence doit être de nature "SIGNATURE", active et liée à l'établissement.
 * 4. Si le document a déjà été validé par l'école, modification refusée.
 * 5. Archivage probatoire scellé par empreinte SHA-256 dans le bucket privé.
 * 6. Résolution automatique des rappels DocumentReminder en cours.
 * 7. Traçabilité complète dans AuditLog et WorkflowTransition.
 */
export async function submitParentSignatureAction(input: SubmitSignatureInput) {
  const authRes = await resolveSchoolContext();
  if (!authRes.ok) {
    return { error: authRes.error || "Non autorisé." };
  }

  const { context } = authRes;
  const { user, schoolId, school } = context;

  if (context.role !== "PARENT") {
    return { error: "Seul un parent d'élève peut effectuer cette signature." };
  }

  // 1. Validation de l'élève rattaché au parent
  const student = await prisma.student.findFirst({
    where: {
      id: input.studentId,
      schoolId,
      parentId: user.id,
    },
    include: {
      enrollments: {
        include: { class: true },
        orderBy: { academicYear: "desc" },
        take: 1,
      },
    },
  });

  if (!student) {
    return { error: "Élève introuvable dans votre espace famille pour cet établissement." };
  }

  // 2. Validation de l'exigence
  const requirement = await prisma.documentRequirement.findFirst({
    where: {
      id: input.requirementId,
      schoolId,
      active: true,
    },
  });

  if (!requirement) {
    return { error: "Document ou démarche introuvable dans cet établissement." };
  }

  if (requirement.nature !== "SIGNATURE") {
    return { error: "Cette démarche ne requiert pas de signature numérique." };
  }

  // 3. Vérifier si un document a déjà été validé
  const existingDoc = await prisma.studentDocument.findFirst({
    where: {
      schoolId,
      studentId: student.id,
      requirementId: requirement.id,
      supersededAt: null,
    },
  });

  if (existingDoc && existingDoc.status === "VALIDATED") {
    return { error: "Ce document a déjà été vérifié et validé par l'établissement. Il ne peut plus être modifié." };
  }

  // 4. Contrôle de validité de la signature
  if (!input.signatureImageBase64 || !input.signatureImageBase64.startsWith("data:image/")) {
    return { error: "La signature est requise pour valider cette démarche." };
  }

  if (!input.attestationConfirmed) {
    return { error: "Vous devez confirmer l'attestation sur l'honneur avant de signer." };
  }

  // 5. Métadonnées probatoires (Dakar / UTC)
  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = reqHeaders.get("user-agent") || "famille-mobile";
  const now = new Date();
  const timestampIso = now.toISOString();
  const timestampFormatted = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Dakar",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(now) + " (Heure de Dakar, GMT)";

  const signerName = `${user.firstName} ${user.lastName}`.trim();

  const payload: SignedDocumentPayload = {
    schoolName: school?.name || "Établissement",
    academicYear: school?.activeAcademicYear || currentAcademicYear(),
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      className: student.enrollments[0]?.class?.name || null,
      cycle: (student.enrollments[0]?.class?.cycle as string) || null,
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
    },
    requirementLabel: requirement.label,
    docVersion: "1.0",
    timestampIso,
    timestampFormatted,
    ip,
    userAgent,
    signer: {
      name: signerName,
      role: "PARENT",
      email: user.email,
      phone: user.phone || null,
    },
    signatureImageBase64: input.signatureImageBase64,
    signatureType: input.signatureType,
    formData: {
      attestationConfirmed: true,
      notes: input.notes?.trim() || undefined,
    },
  };

  const sha256 = computeSignatureSha256({
    ...payload,
    signatureSnippet: input.signatureImageBase64.slice(0, 80) + input.signatureImageBase64.slice(-80),
  });

  const htmlContent = generateSignedDocumentHtml(payload, sha256);
  const docId = crypto.randomUUID();
  const rawFileName = `${requirement.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-signe.html`;
  const fileName = sanitizeFileName(rawFileName);
  const storagePath = storagePathFor(schoolId, student.id, docId, fileName);

  // 6. Sauvegarde dans Supabase Storage privé
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(htmlContent, "utf-8"), {
      contentType: "text/html; charset=utf-8",
      upsert: false,
    });

  if (uploadError) {
    console.error("[submitParentSignatureAction] Erreur upload storage:", uploadError);
    return { error: "Échec du stockage sécurisé du document signé. Veuillez réessayer." };
  }

  // 7. Enregistrement en base dans StudentDocument (TO_VERIFY)
  const newDoc = await prisma.$transaction(async (tx) => {
    if (existingDoc) {
      await tx.studentDocument.update({
        where: { id: existingDoc.id },
        data: { supersededAt: now },
      });
    }

    const created = await tx.studentDocument.create({
      data: {
        id: docId,
        studentId: student.id,
        requirementId: requirement.id,
        label: `${requirement.label} (signé)`,
        category: requirement.category,
        storagePath,
        fileName,
        mimeType: "text/html",
        sizeBytes: Buffer.byteLength(htmlContent, "utf-8"),
        status: "TO_VERIFY",
        uploadedById: user.id,
        uploadedByRole: "PARENT",
        schoolId,
        signatureMetadata: {
          signedAt: timestampIso,
          signerId: user.id,
          signerName,
          signerRole: "PARENT",
          signerEmail: user.email,
          signerPhone: user.phone || null,
          sha256,
          signatureType: input.signatureType,
          ip,
        },
        supersedesId: existingDoc ? existingDoc.id : null,
      },
    });

    // Résolution automatique des relances associées
    await tx.documentReminder.updateMany({
      where: {
        schoolId,
        studentId: student.id,
        requirementId: requirement.id,
        status: "PENDING",
      },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
      },
    });

    return created;
  });

  // 8. Traçabilité (AuditLog & WorkflowTransition)
  await recordAudit(
    { userId: user.id, schoolId, role: "PARENT" },
    {
      action: "studentDocument.parentSigned",
      entity: "studentDocument",
      entityId: newDoc.id,
      details: {
        studentId: student.id,
        requirementId: requirement.id,
        requirementLabel: requirement.label,
        signerName,
        sha256,
      },
    }
  );

  await prisma.workflowTransition.create({
    data: {
      workflow: "studentDocument",
      entity: "studentDocument",
      entityId: newDoc.id,
      fromState: existingDoc?.status || null,
      toState: "TO_VERIFY",
      actorId: user.id,
      actorRole: "PARENT",
      schoolId,
      comment: "Document signé en ligne par le parent via l'Espace Famille",
    },
  });

  // 9. Notification transactionnelle pour le secrétariat
  await prisma.staffNotification.create({
    data: {
      userId: schoolId,
      schoolId,
      kind: "document.signed",
      title: `Document signé — ${student.firstName} ${student.lastName}`,
      body: `Le document « ${requirement.label} » a été signé et transmis par la famille.`,
      link: `/dashboard/students/dossiers/review`,
    },
  });

  revalidatePath("/famille/actions");
  revalidatePath("/famille");
  revalidatePath(`/famille/enfants/${student.id}`);
  revalidatePath("/dashboard/students/dossiers/review");

  return { success: true, documentId: newDoc.id };
}

/**
 * Dépose un document justificatif (UPLOAD) pour le dossier d'un enfant par le parent.
 */
export async function submitParentUploadAction(formData: FormData) {
  const authRes = await resolveSchoolContext();
  if (!authRes.ok) {
    return { error: authRes.error || "Non autorisé." };
  }

  const { context } = authRes;
  const { user, schoolId } = context;

  if (context.role !== "PARENT") {
    return { error: "Seul un parent d'élève peut déposer des pièces dans l'Espace Famille." };
  }

  const studentId = String(formData.get("studentId") || "");
  const requirementId = String(formData.get("requirementId") || "");
  const file = formData.get("file") as File | null;

  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "Veuillez sélectionner un fichier ou prendre une photo nette de votre pièce." };
  }

  // 1. Validation de l'élève
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      schoolId,
      parentId: user.id,
    },
  });

  if (!student) {
    return { error: "Élève introuvable dans votre espace famille pour cet établissement." };
  }

  // 2. Validation de l'exigence
  const requirement = await prisma.documentRequirement.findFirst({
    where: {
      id: requirementId,
      schoolId,
      active: true,
    },
  });

  if (!requirement) {
    return { error: "Demande de document introuvable." };
  }

  // 3. Contrôle de taille et de format de fichier
  const mime = file.type || "application/octet-stream";
  const check = checkFile(mime, file.name, file.size);
  if (!check.ok) {
    return { error: check.error };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const magicValid = validateMagicBytes(buffer, mime);
  if (!magicValid) {
    return { error: "Le contenu du fichier ne correspond pas à son extension ou format déclaré." };
  }


  // 4. Vérifier si un document a déjà été validé
  const existingDoc = await prisma.studentDocument.findFirst({
    where: {
      schoolId,
      studentId: student.id,
      requirementId: requirement.id,
      supersededAt: null,
    },
  });

  if (existingDoc && existingDoc.status === "VALIDATED") {
    return { error: "Ce document a déjà été validé par l'établissement et ne peut plus être modifié." };
  }

  const docId = crypto.randomUUID();
  const sanitizedName = sanitizeFileName(file.name || `${requirement.label}.pdf`);
  const storagePath = storagePathFor(schoolId, student.id, docId, sanitizedName);
  const now = new Date();

  // 5. Sauvegarde dans Supabase Storage privé
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    console.error("[submitParentUploadAction] Erreur upload storage:", uploadError);
    return { error: "Échec du transfert du fichier vers l'espace sécurisé. Veuillez réessayer." };
  }

  // 6. Enregistrement en base (TO_VERIFY)
  const newDoc = await prisma.$transaction(async (tx) => {
    if (existingDoc) {
      await tx.studentDocument.update({
        where: { id: existingDoc.id },
        data: { supersededAt: now },
      });
    }

    const created = await tx.studentDocument.create({
      data: {
        id: docId,
        studentId: student.id,
        requirementId: requirement.id,
        label: requirement.label,
        category: requirement.category,
        storagePath,
        fileName: sanitizedName,
        mimeType: mime,
        sizeBytes: buffer.length,
        status: "TO_VERIFY",
        uploadedById: user.id,
        uploadedByRole: "PARENT",
        schoolId,
        supersedesId: existingDoc ? existingDoc.id : null,
      },
    });

    // Résolution automatique de la relance
    await tx.documentReminder.updateMany({
      where: {
        schoolId,
        studentId: student.id,
        requirementId: requirement.id,
        status: "PENDING",
      },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
      },
    });

    return created;
  });

  // 7. Traçabilité (AuditLog & WorkflowTransition)
  await recordAudit(
    { userId: user.id, schoolId, role: "PARENT" },
    {
      action: "studentDocument.parentUploaded",
      entity: "studentDocument",
      entityId: newDoc.id,
      details: {
        studentId: student.id,
        requirementId: requirement.id,
        fileName: sanitizedName,
        sizeBytes: buffer.length,
      },
    }
  );

  await prisma.workflowTransition.create({
    data: {
      workflow: "studentDocument",
      entity: "studentDocument",
      entityId: newDoc.id,
      fromState: existingDoc?.status || null,
      toState: "TO_VERIFY",
      actorId: user.id,
      actorRole: "PARENT",
      schoolId,
      comment: "Pièce justificative déposée par le parent via l'Espace Famille",
    },
  });

  // 8. Notification transactionnelle au secrétariat
  await prisma.staffNotification.create({
    data: {
      userId: schoolId,
      schoolId,
      kind: "document.uploaded",
      title: `Pièce déposée — ${student.firstName} ${student.lastName}`,
      body: `Le document « ${requirement.label} » a été déposé et attend vérification.`,
      link: `/dashboard/students/dossiers/review`,
    },
  });

  revalidatePath("/famille/actions");
  revalidatePath("/famille");
  revalidatePath(`/famille/enfants/${student.id}`);
  revalidatePath("/dashboard/students/dossiers/review");

  return { success: true, documentId: newDoc.id };
}
