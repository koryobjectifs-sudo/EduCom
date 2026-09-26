"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireSchoolContext } from "@/lib/documentContext";
import { requireActionContext } from "@/lib/actionContext";
import { revalidatePath } from "next/cache";

export async function approvePendingAction(conversationId: string) {
  const { schoolId, user } = await requireSchoolContext();
  const auth = await requireActionContext("/dashboard/communications/inbox");
  const role = auth.ok ? auth.ctx.role : "TEACHER";

  if (role === "TEACHER") {
    throw new Error("Vous n'avez pas les droits pour traiter ces demandes.");
  }

  const conversation = await prisma.whatsAppConversation.findFirst({
    where: { id: conversationId, schoolId }
  });

  if (!conversation || !conversation.pendingActionType) {
    throw new Error("Action introuvable ou déjà traitée.");
  }

  if (role === "ACCOUNTANT" && conversation.pendingActionType !== "PAYMENT_REMINDER") {
    throw new Error("Votre rôle ne permet que d'approuver les relances financières.");
  }

  // 1. Audit Log
  await prisma.auditLog.create({
    data: {
      action: "WHATSAPP_ACTION_APPROVED",
      entity: "WhatsAppConversation",
      entityId: conversation.id,
      userId: user.id,
      schoolId,
      details: JSON.stringify({ actionType: conversation.pendingActionType })
    }
  });

  // 2. Clear action & Update status
  await prisma.whatsAppConversation.update({
    where: { id: conversation.id },
    data: {
      pendingActionType: null,
      pendingActionData: Prisma.DbNull,
      status: "OPEN" // Ou CLOSED selon le flow
    }
  });

  // 3. Envoyer confirmation au parent
  await prisma.message.create({
    data: {
      direction: "OUTBOUND",
      content: "L'école a bien validé votre demande. Merci !",
      status: "SENT",
      schoolId: conversation.schoolId,
      parentId: conversation.parentId,
      conversationId: conversation.id
    }
  });

  revalidatePath("/dashboard/communications/inbox");
}

export async function rejectPendingAction(conversationId: string) {
  const { schoolId, user } = await requireSchoolContext();
  const auth = await requireActionContext("/dashboard/communications/inbox");
  const role = auth.ok ? auth.ctx.role : "TEACHER";

  if (role === "TEACHER") {
    throw new Error("Vous n'avez pas les droits pour traiter ces demandes.");
  }

  const conversation = await prisma.whatsAppConversation.findFirst({
    where: { id: conversationId, schoolId }
  });

  if (!conversation || !conversation.pendingActionType) {
    throw new Error("Action introuvable ou déjà traitée.");
  }

  if (role === "ACCOUNTANT" && conversation.pendingActionType !== "PAYMENT_REMINDER") {
    throw new Error("Votre rôle ne permet que de rejeter les relances financières.");
  }

  // 1. Audit Log
  await prisma.auditLog.create({
    data: {
      action: "WHATSAPP_ACTION_REJECTED",
      entity: "WhatsAppConversation",
      entityId: conversation.id,
      userId: user.id,
      schoolId,
      details: JSON.stringify({ actionType: conversation.pendingActionType })
    }
  });

  // 2. Clear action & Update status
  await prisma.whatsAppConversation.update({
    where: { id: conversation.id },
    data: {
      pendingActionType: null,
      pendingActionData: Prisma.DbNull,
      status: "OPEN" 
    }
  });

  // 3. Envoyer notification au parent
  await prisma.message.create({
    data: {
      direction: "OUTBOUND",
      content: "L'école a refusé votre demande. Veuillez contacter le secrétariat pour plus de détails.",
      status: "SENT",
      schoolId: conversation.schoolId,
      parentId: conversation.parentId,
      conversationId: conversation.id
    }
  });

  revalidatePath("/dashboard/communications/inbox");
}

export async function sendManualReply(conversationId: string, text: string) {
  const { schoolId, user } = await requireSchoolContext();
  const auth = await requireActionContext("/dashboard/communications/inbox");
  const role = auth.ok ? auth.ctx.role : "TEACHER";

  if (role === "TEACHER") {
    throw new Error("Vous n'avez pas les droits pour envoyer des messages manuels.");
  }

  const conversation = await prisma.whatsAppConversation.findFirst({
    where: { id: conversationId, schoolId }
  });

  if (!conversation) {
    throw new Error("Conversation introuvable.");
  }

  // Vérification de la fenêtre de 24h
  if (!conversation.windowExpiresAt || conversation.windowExpiresAt < new Date()) {
    throw new Error("La fenêtre de service de 24h est expirée. Meta n'autorise plus l'envoi de texte libre. Veuillez utiliser un template de campagne.");
  }

  // 1. Envoyer via WhatsApp Client
  const { WhatsAppClient } = await import("@/lib/whatsapp/client");
  const waClient = await WhatsAppClient.forSchool(schoolId);
  
  const response = await waClient.sendTextMessage(conversation.parentWaNumber, text);
  const waMessageId = response?.messages?.[0]?.id;

  // 2. Enregistrer le message
  await prisma.message.create({
    data: {
      waMessageId: waMessageId || undefined,
      direction: "OUTBOUND",
      content: text,
      status: "SENT",
      schoolId: conversation.schoolId,
      parentId: conversation.parentId,
      conversationId: conversation.id
    }
  });

  // 3. Update conversation last activity
  await prisma.whatsAppConversation.update({
    where: { id: conversation.id },
    data: { lastActivityAt: new Date(), status: "OPEN" }
  });

  revalidatePath("/dashboard/communications/inbox");
}
