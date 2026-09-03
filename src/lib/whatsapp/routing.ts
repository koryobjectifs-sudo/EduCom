import { prisma } from "@/lib/prisma";
import type { WhatsAppConversation, Message, WhatsAppConversationStatus } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export type DetectedIntent = 
  | "FAQ" 
  | "POLL_RESPONSE" 
  | "ABSENCE_RESPONSE" 
  | "JUSTIFICATION_REQUEST" 
  | "SECRETARIAT_REQUEST" 
  | "ACTION_REQUEST" 
  | "UNKNOWN";

export type AttentionLevel = "NORMAL" | "URGENT" | "ESCALATED";

export interface IntentResult {
  intent: DetectedIntent;
  attentionLevel: AttentionLevel;
  extractedData?: Record<string, unknown>;
  replyText?: string;
}

/**
 * Moteur déterministe simulant une IA pour router les intentions.
 * Une vraie IA (OpenAI/Gemini) remplacerait le cœur de cette fonction.
 */
export async function analyzeIntent(text: string, _conversation: WhatsAppConversation): Promise<IntentResult> {
  const normalized = text.toLowerCase().trim();

  // 1. Demande de parler à un humain (Escalade)
  if (
    normalized.includes("parler à un humain") ||
    normalized.includes("secrétariat") ||
    normalized.includes("directeur") ||
    normalized.includes("humain") ||
    normalized.includes("urgent")
  ) {
    return {
      intent: "SECRETARIAT_REQUEST",
      attentionLevel: "ESCALATED",
      replyText: "Votre demande a été transférée au secrétariat. Nous vous répondrons dans les plus brefs délais."
    };
  }

  // 2. Justification d'absence
  if (
    normalized.includes("malade") ||
    normalized.includes("docteur") ||
    normalized.includes("hôpital") ||
    normalized.includes("absence") ||
    normalized.includes("retard")
  ) {
    return {
      intent: "ABSENCE_RESPONSE",
      attentionLevel: "NORMAL",
      extractedData: { reason: text }
    };
  }

  // 3. Sondage (ex: répondre 1, 2, oui, non)
  if (normalized === "oui" || normalized === "non" || /^[1-5]$/.test(normalized)) {
    return {
      intent: "POLL_RESPONSE",
      attentionLevel: "NORMAL",
      extractedData: { answer: text }
    };
  }

  // 4. Questions simples (FAQ)
  if (
    normalized.includes("horaire") ||
    normalized.includes("heure") ||
    normalized.includes("cantine") ||
    normalized.includes("menu")
  ) {
    return {
      intent: "FAQ",
      attentionLevel: "NORMAL",
      replyText: "Pour les informations générales (horaires, cantine), veuillez consulter notre livret d'accueil ou contacter le secrétariat."
    };
  }

  // 5. Inconnu -> Fallback vers l'humain
  return {
    intent: "UNKNOWN",
    attentionLevel: "NORMAL"
  };
}

/**
 * Process incoming message, update conversation state.
 */
export async function processIncomingIntent(message: Message, conversation: WhatsAppConversation) {
  // 1. Si la conversation est déjà fermée, on la rouvre.
  if (conversation.status === "CLOSED") {
    conversation = await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { status: "OPEN", detectedIntent: null, pendingActionType: null, pendingActionData: Prisma.DbNull }
    });
  }

  // 2. Si la conversation requiert déjà l'attention humaine, on ne fait rien automatiquement, on ajoute juste le log.
  if (conversation.status === "REQUIRES_ATTENTION" || conversation.status === "PAUSED") {
    return;
  }

  // Fetch children for multi-child logic
  const parent = await prisma.user.findUnique({
    where: { id: conversation.parentId },
    include: { students: { select: { id: true, firstName: true } } }
  });
  const children = parent?.students || [];

  // 3. Gestion de l'état SELECT_CHILD (Attente du choix de l'enfant)
  if (conversation.pendingActionType === "SELECT_CHILD") {
    const choiceIndex = parseInt(message.content.trim()) - 1;
    
    // Check expiration (e.g., if last activity was more than 1 hour ago)
    const now = new Date();
    const isExpired = (now.getTime() - conversation.lastActivityAt.getTime()) > 60 * 60 * 1000;
    
    if (isExpired) {
      // Expiré, on efface le contexte et on continue comme un nouveau message
      conversation = await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { pendingActionType: null, pendingActionData: Prisma.DbNull }
      });
      await sendAutoReply(conversation, "Délai dépassé pour la sélection. Veuillez reformuler votre demande.");
      return;
    }

    if (isNaN(choiceIndex) || !children[choiceIndex]) {
      // Choix invalide
      await sendAutoReply(conversation, "Choix invalide. Veuillez répondre avec le numéro correspondant à l'enfant.");
      return;
    }

    // Choix valide !
    const selectedChild = children[choiceIndex];
    const contextData = conversation.pendingActionData as Record<string, unknown>;
    
    // Restauration de l'intention initiale
    const result = contextData.originalResult as unknown as IntentResult;
    
    // On met à jour l'enfant sélectionné et on traite l'intention
    conversation = await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { resolvedStudentId: selectedChild.id }
    });
    
    await applyIntentResult(conversation, result);
    return;
  }

  // 4. Analyse de l'intention initiale
  const result = await analyzeIntent(message.content, conversation);

  // 5. Interception Multi-Enfants : si l'intention nécessite un enfant (ex: ABSENCE_RESPONSE)
  const requiresChild = result.intent === "ABSENCE_RESPONSE" || result.intent === "POLL_RESPONSE" || result.intent === "JUSTIFICATION_REQUEST";
  
  if (requiresChild && !conversation.resolvedStudentId) {
    if (children.length === 1) {
      // 1 enfant : Auto-sélection
      conversation = await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { resolvedStudentId: children[0].id }
      });
      // On continue
    } else if (children.length > 1) {
      // > 1 enfant : Mise en attente et demande
      let menu = "Pour quel enfant souhaitez-vous faire cette demande ?\n";
      children.forEach((child, index) => {
        menu += `${index + 1}. ${child.firstName}\n`;
      });
      
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          pendingActionType: "SELECT_CHILD",
          pendingActionData: JSON.stringify({ originalResult: result })
        }
      });
      
      await sendAutoReply(conversation, menu.trim());
      return;
    }
  }

  // Application normale du résultat
  await applyIntentResult(conversation, result);
}

/**
 * Applique le résultat d'une intention et met à jour la conversation.
 */
async function applyIntentResult(conversation: WhatsAppConversation, result: IntentResult) {
  let newStatus: WhatsAppConversationStatus = conversation.status;
  let pendingActionType: string | null = null;
  let pendingActionData: Record<string, unknown> | null = null;

  if (result.intent === "SECRETARIAT_REQUEST" || result.intent === "UNKNOWN") {
    newStatus = "REQUIRES_ATTENTION";
  }

  if (result.intent === "ABSENCE_RESPONSE") {
    newStatus = "REQUIRES_ATTENTION";
    pendingActionType = "VALIDATE_ABSENCE";
    pendingActionData = result.extractedData ?? null;
  }

  if (result.intent === "POLL_RESPONSE") {
    newStatus = "REQUIRES_ATTENTION";
    pendingActionType = "VALIDATE_POLL";
    pendingActionData = result.extractedData ?? null;
  }

  await prisma.whatsAppConversation.update({
    where: { id: conversation.id },
    data: {
      status: newStatus,
      detectedIntent: result.intent,
      attentionLevel: result.attentionLevel,
      pendingActionType,
      pendingActionData: pendingActionData ? JSON.stringify(pendingActionData) : Prisma.DbNull
    }
  });

  if (result.replyText && newStatus !== "REQUIRES_ATTENTION") {
    await sendAutoReply(conversation, result.replyText);
  }
}

/**
 * Helper function to send an automated reply via Meta API and log the message.
 */
async function sendAutoReply(conversation: WhatsAppConversation, text: string) {
  const { WhatsAppClient } = await import("@/lib/whatsapp/client");
  
  let waMessageId: string | undefined;
  try {
    const waClient = await WhatsAppClient.forSchool(conversation.schoolId);
    const response = await waClient.sendTextMessage(conversation.parentWaNumber, text);
    waMessageId = response?.messages?.[0]?.id;
  } catch (err) {
    console.error("Failed to send auto-reply to Meta API:", err);
  }

  await prisma.message.create({
    data: {
      waMessageId,
      direction: "OUTBOUND",
      content: text,
      status: "SENT",
      schoolId: conversation.schoolId,
      parentId: conversation.parentId,
      conversationId: conversation.id
    }
  });
}
