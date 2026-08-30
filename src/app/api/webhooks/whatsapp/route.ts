import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveParentFromWhatsApp } from "@/lib/whatsapp/resolution";
import { calculateWindowExpiration } from "@/lib/whatsapp/window";
import { processIncomingIntent } from "@/lib/whatsapp/routing";

// Meta verification token
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

/**
 * GET Handler for Meta Webhook Verification.
 * Meta sends a GET request to verify the webhook URL.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WhatsApp Webhook verified.");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST Handler for Meta Webhook Events.
 * Receives messages and status updates.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Extraction des promesses pour ne pas bloquer la réponse à Meta
    const tasks: Promise<void>[] = [];

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.value.messages) {
          tasks.push(processMessages(change.value));
        }
        
        if (change.value.statuses) {
          tasks.push(processStatuses(change.value));
        }
      }
    }

    // Exécution asynchrone sans bloquer
    Promise.allSettled(tasks).catch(console.error);

    // Always return 200 OK quickly to acknowledge receipt and prevent Meta from retrying
    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("WhatsApp Webhook Error:", error);
    return new NextResponse("OK", { status: 200 });
  }
}

/**
 * Process incoming messages.
 */
async function processMessages(value: any) {
  const phoneId = value.metadata.phone_number_id;

  for (const message of value.messages) {
    const waMessageId = message.id;
    const waPhone = message.from; // Sender's phone number
    const text = message.text?.body || "";

    // 1. Idempotence Check: Prevent processing the same message twice
    const existingMessage = await prisma.message.findUnique({
      where: { waMessageId }
    });

    if (existingMessage) {
      console.log(`Duplicate message received: ${waMessageId}`);
      continue;
    }

    // 2. Find School by WhatsApp Phone Number ID FIRST (to scope parent search)
    const school = await prisma.school.findFirst({
      where: { whatsappPhoneNumberId: phoneId }
    });

    // 3. Resolve Parent
    const resolved = await resolveParentFromWhatsApp(waPhone, school?.id);

    if (!resolved) {
      // Parent not found or ambiguous. 
      // For V1, we log it. Later, we can create an UNKNOWN conversation.
      console.log(`Unresolved WhatsApp incoming message from: ${waPhone}`);
      continue;
    }

    // Fallback: If not configured per school, use the one from the resolved parent (legacy/dev mode)
    const schoolId = school?.id || resolved.schoolId;

    // 4. Find or Create Conversation
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: { 
        schoolId: schoolId,
        parentId: resolved.parentId,
        waPhoneId: phoneId
      }
    });

    const now = new Date();
    const windowExpiresAt = calculateWindowExpiration(now);

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          schoolId: schoolId,
          parentId: resolved.parentId,
          waPhoneId: phoneId,
          parentWaNumber: waPhone,
          lastActivityAt: now,
          windowExpiresAt,
          status: "OPEN"
        }
      });
    } else {
      conversation = await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          lastActivityAt: now,
          windowExpiresAt,
          status: "OPEN"
        }
      });
    }

    // 4. Record the Message
    const createdMessage = await prisma.message.create({
      data: {
        waMessageId,
        direction: "INBOUND",
        content: text,
        status: "RECEIVED",
        schoolId: schoolId,
        parentId: resolved.parentId,
        conversationId: conversation.id,
      }
    });

    // 4b. Process AI Intent and Routing
    await processIncomingIntent(createdMessage, conversation);

    // 5. Audit Log
    await prisma.auditLog.create({
      data: {
        action: "WHATSAPP_MESSAGE_RECEIVED",
        entity: "WhatsAppConversation",
        entityId: conversation.id,
        userId: resolved.parentId,
        schoolId: schoolId,
        details: JSON.stringify({ waMessageId, textSnippet: text.substring(0, 50) })
      }
    });
  }
}

/**
 * Process outgoing message status updates (sent, delivered, read, failed).
 */
async function processStatuses(value: any) {
  for (const status of value.statuses) {
    const waMessageId = status.id;
    const statusCode = status.status; // 'sent', 'delivered', 'read', 'failed'

    let mappedStatus: "SENT" | "DELIVERED" | "READ" | "FAILED" | null = null;
    if (statusCode === "sent") mappedStatus = "SENT";
    if (statusCode === "delivered") mappedStatus = "DELIVERED";
    if (statusCode === "read") mappedStatus = "READ";
    if (statusCode === "failed") mappedStatus = "FAILED";

    if (mappedStatus) {
      await prisma.message.updateMany({
        where: { waMessageId },
        data: { status: mappedStatus }
      });
    }
  }
}
