import { prisma } from "@/lib/prisma";
import { recordAudit, type ActorContext } from "@/lib/audit";
import { WhatsAppClient } from "@/lib/whatsapp/client";

export interface CanRemindResult {
  allowed: boolean;
  reason?: "NO_PARENT_ACCOUNT" | "TOO_FREQUENT" | "AUTO_DOCUMENT" | "ALREADY_PROVIDED" | "NOT_APPLICABLE";
  message?: string;
  lastSentAt?: Date | null;
  parent?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string;
  } | null;
}

/**
 * Vérifie si une relance peut être envoyée pour une pièce et un élève donnés.
 *
 * Garde-fous stricts :
 * 1. L'élève doit avoir un tuteur avec un compte utilisateur EduCom actif.
 * 2. La pièce ne doit PAS être AUTO (produite par l'école, jamais demandée au parent).
 * 3. Délai de 48 heures minimum entre deux relances pour la même pièce et le même élève.
 * 4. La pièce ne doit pas être déjà acquise/validée.
 */
export async function checkCanRemindParent(
  schoolId: string,
  studentId: string,
  requirementId: string
): Promise<CanRemindResult> {
  // 1. Récupérer l'élève et son parent
  const student = await prisma.student.findUnique({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!student) {
    return {
      allowed: false,
      reason: "NOT_APPLICABLE",
      message: "Élève introuvable.",
    };
  }

  if (!student.parentId || !student.parent) {
    return {
      allowed: false,
      reason: "NO_PARENT_ACCOUNT",
      message: "Cet élève n'a pas de tuteur avec un compte EduCom rattaché.",
    };
  }

  // 2. Vérifier l'exigence
  const req = await prisma.documentRequirement.findUnique({
    where: { id: requirementId, schoolId },
    select: { id: true, label: true, nature: true },
  });

  if (!req) {
    return {
      allowed: false,
      reason: "NOT_APPLICABLE",
      message: "Exigence introuvable.",
    };
  }

  if (req.nature === "AUTO") {
    return {
      allowed: false,
      reason: "AUTO_DOCUMENT",
      message: "Cette pièce est fournie automatiquement par l'établissement : elle ne doit pas être demandée au parent.",
    };
  }

  // 3. Vérifier si un document valide ou en cours de vérification existe déjà
  const existingDoc = await prisma.studentDocument.findFirst({
    where: {
      studentId,
      requirementId,
      supersededAt: null,
      status: { in: ["VALIDATED", "TO_VERIFY"] },
    },
  });

  if (existingDoc) {
    return {
      allowed: false,
      reason: "ALREADY_PROVIDED",
      message: "Une pièce est déjà déposée pour cette exigence.",
    };
  }

  // 4. Garde-fou 48h : max une relance toutes les 48 heures par pièce et par élève
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentReminder = await prisma.documentReminder.findFirst({
    where: {
      studentId,
      requirementId,
      createdAt: { gte: fortyEightHoursAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentReminder) {
    const formattedDate = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(recentReminder.createdAt);

    return {
      allowed: false,
      reason: "TOO_FREQUENT",
      lastSentAt: recentReminder.createdAt,
      message: `Une relance a déjà été envoyée le ${formattedDate}. Un délai minimum de 48h est obligatoire pour ne pas saturer le parent.`,
      parent: student.parent,
    };
  }

  // Chercher la dernière relance historique (si > 48h)
  const lastHistoricalReminder = await prisma.documentReminder.findFirst({
    where: { studentId, requirementId },
    orderBy: { createdAt: "desc" },
  });

  return {
    allowed: true,
    lastSentAt: lastHistoricalReminder?.createdAt ?? null,
    parent: student.parent,
  };
}

/**
 * Envoie une relance ciblée pour une pièce manquante d'un élève.
 */
export async function sendDocumentReminder(
  actor: ActorContext,
  params: {
    studentId: string;
    requirementId: string;
  }
) {
  const check = await checkCanRemindParent(actor.schoolId, params.studentId, params.requirementId);
  if (!check.allowed || !check.parent) {
    return { success: false, error: check.message, reason: check.reason };
  }

  const [student, req, school] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.studentId, schoolId: actor.schoolId },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.documentRequirement.findUnique({
      where: { id: params.requirementId, schoolId: actor.schoolId },
      select: { id: true, label: true, nature: true },
    }),
    prisma.school.findUnique({
      where: { id: actor.schoolId },
      select: { id: true, name: true, whatsappAccessToken: true, whatsappPhoneNumberId: true },
    }),
  ]);

  if (!student || !req) {
    return { success: false, error: "Élève ou document introuvable." };
  }

  // Action directe sur l'Espace Famille : aucun écran intermédiaire
  const actionUrl = `/famille/actions?studentId=${student.id}&reqId=${req.id}`;

  const actionText = req.nature === "SIGNATURE" ? "Lisez et signez-le en quelques secondes." : "Déposez-le en quelques secondes.";
  const message = `Le dossier de ${student.firstName} est incomplet. Il manque ${req.label.toLowerCase()}. ${actionText}`;

  let channelUsed = "IN_APP";

  // Tentative canal externe (WhatsApp) si configuré sur l'école
  if (school?.whatsappAccessToken && school?.whatsappPhoneNumberId && check.parent.phone) {
    try {
      const wa = await WhatsAppClient.forSchool(actor.schoolId);
      const cleanPhone = check.parent.phone.replace(/\D/g, "");
      if (cleanPhone) {
        await wa.sendTextMessage(cleanPhone, `${message}\nLien direct : ${process.env.NEXT_PUBLIC_SITE_URL || ""}${actionUrl}`);
        channelUsed = "WHATSAPP";
      }
    } catch (err) {
      console.warn("[sendDocumentReminder] Envoi WhatsApp externe ignoré ou échoué, notification In-App créée :", err);
    }
  }

  // Création du rappel en base
  const reminder = await prisma.documentReminder.create({
    data: {
      schoolId: actor.schoolId,
      studentId: student.id,
      requirementId: req.id,
      parentId: check.parent.id,
      channel: channelUsed,
      status: "PENDING",
      message,
      actionUrl,
      sentById: actor.userId,
    },
  });

  // Journalisation de l'acte
  await recordAudit(actor, {
    action: "documentReminder.send",
    entity: "documentRequirement",
    entityId: req.id,
    details: {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      requirementId: req.id,
      requirementLabel: req.label,
      parentId: check.parent.id,
      channel: channelUsed,
    },
  });

  return {
    success: true,
    reminderId: reminder.id,
    channel: channelUsed,
    sentAt: reminder.createdAt,
    message,
    actionUrl,
  };
}

/**
 * Envoie une relance groupée depuis la revue des admissions.
 * Chaque parent ne reçoit un message que pour SON enfant et SES pièces réellement manquantes.
 */
export async function sendBulkDocumentReminders(
  actor: ActorContext,
  studentIds: string[]
) {
  if (!studentIds.length) {
    return { success: false, error: "Aucun élève sélectionné." };
  }

  const results = {
    totalRequested: studentIds.length,
    sentCount: 0,
    skippedNoParent: 0,
    skippedRecentlyReminded: 0,
    skippedNothingMissing: 0,
    details: [] as { studentId: string; studentName: string; status: string; count?: number }[],
  };

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Charger les données de tous les élèves sélectionnés en batch
  const [students, allReqs, school] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId: actor.schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        enrollments: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { class: { select: { id: true, cycle: true, name: true } } },
        },
        documents: {
          where: { supersededAt: null, status: { in: ["VALIDATED", "TO_VERIFY"] } },
          select: { requirementId: true },
        },
        documentReminders: {
          where: { createdAt: { gte: fortyEightHoursAgo } },
          select: { requirementId: true, createdAt: true },
        },
      },
    }),
    prisma.documentRequirement.findMany({
      where: { schoolId: actor.schoolId, active: true },
      select: { id: true, label: true, nature: true, cycle: true, classId: true, required: true },
    }),
    prisma.school.findUnique({
      where: { id: actor.schoolId },
      select: { id: true, name: true, whatsappAccessToken: true, whatsappPhoneNumberId: true },
    }),
  ]);

  for (const s of students) {
    const studentName = `${s.firstName} ${s.lastName}`;
    if (!s.parentId || !s.parent) {
      results.skippedNoParent++;
      results.details.push({ studentId: s.id, studentName, status: "SANS_TUTEUR_COMPTE" });
      continue;
    }

    const currentClass = s.enrollments[0]?.class ?? null;
    const cycle = currentClass?.cycle ?? null;

    // Pièces applicables requises et non AUTO
    const applicableReqs = allReqs.filter((r) => {
      if (r.nature === "AUTO") return false; // Ne jamais demander AUTO
      if (r.cycle && r.cycle !== cycle) return false;
      if (r.classId && r.classId !== currentClass?.id) return false;
      return true;
    });

    const receivedReqIds = new Set(s.documents.map((d) => d.requirementId).filter(Boolean));
    const recentReminderReqIds = new Set(s.documentReminders.map((r) => r.requirementId));

    const missingReqs = applicableReqs.filter((r) => !receivedReqIds.has(r.id));
    if (missingReqs.length === 0) {
      results.skippedNothingMissing++;
      results.details.push({ studentId: s.id, studentName, status: "DOSSIER_COMPLET" });
      continue;
    }

    const actionableReqs = missingReqs.filter((r) => !recentReminderReqIds.has(r.id));
    if (actionableReqs.length === 0) {
      results.skippedRecentlyReminded++;
      results.details.push({ studentId: s.id, studentName, status: "DEJA_RELANCE_48H" });
      continue;
    }

    // Créer les rappels pour les pièces ciblées
    const piecesLabels = actionableReqs.map((r) => r.label).join(", ");
    const primaryReq = actionableReqs[0];
    const actionUrl = `/famille/actions?studentId=${s.id}&reqId=${primaryReq.id}`;
    const message = `Le dossier de ${s.firstName} est incomplet. Pièce(s) manquante(s) : ${piecesLabels}. Déposez-les en quelques secondes.`;

    let channelUsed = "IN_APP";
    if (school?.whatsappAccessToken && school?.whatsappPhoneNumberId && s.parent.phone) {
      try {
        const wa = await WhatsAppClient.forSchool(actor.schoolId);
        const cleanPhone = s.parent.phone.replace(/\D/g, "");
        if (cleanPhone) {
          await wa.sendTextMessage(cleanPhone, `${message}\nLien direct : ${process.env.NEXT_PUBLIC_SITE_URL || ""}${actionUrl}`);
          channelUsed = "WHATSAPP";
        }
      } catch (err) {
        console.warn("[sendBulkDocumentReminders] Envoi WhatsApp externe ignoré ou échoué, notification In-App créée :", err);
      }
    }

    await prisma.$transaction(
      actionableReqs.map((r) =>
        prisma.documentReminder.create({
          data: {
            schoolId: actor.schoolId,
            studentId: s.id,
            requirementId: r.id,
            parentId: s.parent!.id,
            channel: channelUsed,
            status: "PENDING",
            message: `Le dossier de ${s.firstName} est incomplet. Il manque ${r.label}. ${r.nature === "SIGNATURE" ? "Lisez et signez-le en quelques secondes." : "Déposez-le en quelques secondes."}`,
            actionUrl: `/famille/actions?studentId=${s.id}&reqId=${r.id}`,
            sentById: actor.userId,
          },
        })
      )
    );

    // Journalisation groupée
    await recordAudit(actor, {
      action: "documentReminder.bulkSend",
      entity: "student",
      entityId: s.id,
      details: {
        studentName,
        parentId: s.parent.id,
        piecesCount: actionableReqs.length,
        pieces: actionableReqs.map((r) => r.label),
        channel: channelUsed,
      },
    });

    results.sentCount++;
    results.details.push({ studentId: s.id, studentName, status: "ENVOYE", count: actionableReqs.length });
  }

  return { success: true, results };
}

/**
 * Résout les rappels d'un élève pour une pièce dès que celle-ci est déposée ou signée.
 * Le rappel disparaît immédiatement de l'espace parent.
 */
export async function resolveDocumentReminders(studentId: string, requirementId: string) {
  try {
    await prisma.documentReminder.updateMany({
      where: {
        studentId,
        requirementId,
        status: "PENDING",
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[resolveDocumentReminders] Erreur lors de la résolution du rappel :", err);
  }
}

/**
 * Récupère les rappels actifs d'un parent pour son espace famille.
 */
export async function getActiveParentReminders(parentId: string) {
  return prisma.documentReminder.findMany({
    where: {
      parentId,
      status: "PENDING",
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      requirement: { select: { id: true, label: true, nature: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
