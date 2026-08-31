import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { resolveParentFromWhatsApp } from "@/lib/whatsapp/resolution";
import { calculateWindowExpiration } from "@/lib/whatsapp/window";
import { processIncomingIntent } from "@/lib/whatsapp/routing";

// Meta verification token
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

// Meta app secret, used to authenticate incoming webhook payloads.
// Backend only — it must never reach a client bundle.
const APP_SECRET = process.env.META_APP_SECRET;

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the raw request body.
 *
 * ⚠️ The signature is computed over the EXACT bytes Meta sent. Re-serialising a
 * parsed object (`JSON.stringify(await req.json())`) produces different bytes —
 * key order, spacing, unicode escaping — and the signature would never match.
 * That is why the handler reads `req.text()` first and parses afterwards.
 *
 * Fails closed: no secret configured, no header, or any mismatch is a rejection.
 */
function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  if (!APP_SECRET || !header) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex");

  const received = Buffer.from(header);
  const computed = Buffer.from(expected);

  // timingSafeEqual throws on length mismatch, so compare lengths first.
  if (received.length !== computed.length) return false;
  return crypto.timingSafeEqual(received, computed);
}

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

/** Minimal shape of a Meta webhook envelope — only what this handler reads. */
interface MetaWebhookBody {
  object?: string;
  entry?: { changes?: { value: { messages?: unknown[]; statuses?: unknown[] } }[] }[];
}

/**
 * POST Handler for Meta Webhook Events.
 * Receives messages and status updates.
 */
export async function POST(req: NextRequest) {
  try {
    // Raw body first — the signature is computed over these exact bytes.
    const rawBody = await req.text();

    if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
      // Never log the header, the secret, or the payload.
      console.error("WhatsApp webhook rejected: invalid or missing signature.");
      return new NextResponse("Forbidden", { status: 403 });
    }

    let body: MetaWebhookBody;
    try {
      body = JSON.parse(rawBody) as MetaWebhookBody;
    } catch {
      return new NextResponse("Bad Request", { status: 400 });
    }

    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Extraction des promesses pour ne pas bloquer la réponse à Meta
    const tasks: Promise<void>[] = [];

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
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

    // 2. Resolve the school from the WhatsApp Phone Number ID.
    //
    // ⚠️ This MUST be unambiguous. `findFirst` was used here and silently picked
    // an arbitrary row: a mass injection had written the same phone_number_id
    // into 94 schools, so incoming parent messages could land in the wrong
    // tenant. We now read two rows and refuse to route when more than one
    // matches, rather than guessing.
    const candidates = await prisma.school.findMany({
      where: { whatsappPhoneNumberId: phoneId },
      select: { id: true },
      take: 2,
    });

    if (candidates.length > 1) {
      // Never arbitrate between tenants. A retry cannot fix a configuration
      // collision, so we acknowledge to Meta and drop the message instead of
      // letting it be delivered to the wrong school.
      console.error(
        "WhatsApp routing refused: phone_number_id maps to multiple schools. " +
        "Message dropped; fix the duplicate configuration."
      );
      continue;
    }

    const school = candidates[0] ?? null;

    if (!school) {
      // No school owns this number. Falling back to the parent's own school was
      // the previous behaviour — that is arbitration by another name, since a
      // phone number can match parents across several tenants. Refuse instead.
      console.error("WhatsApp routing refused: no school owns this phone_number_id.");
      continue;
    }

    // 3. Resolve Parent, always scoped to the single owning school.
    const resolved = await resolveParentFromWhatsApp(waPhone, school.id);

    if (!resolved) {
      // Parent not found or ambiguous.
      // For V1, we log it. Later, we can create an UNKNOWN conversation.
      console.log(`Unresolved WhatsApp incoming message from: ${waPhone}`);
      continue;
    }

    const schoolId = school.id;

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

    if (!mappedStatus) continue;

    // ⚠️ Meta does not guarantee delivery order: a `sent` callback can arrive
    // after `read` was already recorded. A plain overwrite let a late webhook
    // walk the status backwards (READ -> SENT), so a message shown as read in
    // the Inbox could silently regress. The status may only ever move forward.
    //
    // The guard lives in the WHERE clause rather than in a read-then-write, so
    // two callbacks landing at the same moment cannot race each other.
    if (mappedStatus === "FAILED") {
      await prisma.message.updateMany({
        where: { waMessageId, status: { not: "FAILED" } },
        data: { status: "FAILED" },
      });
      continue;
    }

    const RANK = { SENT: 1, DELIVERED: 2, READ: 3 } as const;
    const alreadyAtLeastAsFar = (Object.keys(RANK) as (keyof typeof RANK)[])
      .filter((s) => RANK[s] >= RANK[mappedStatus as keyof typeof RANK]);

    await prisma.message.updateMany({
      // FAILED is terminal: a later status must not resurrect the message.
      where: { waMessageId, status: { notIn: [...alreadyAtLeastAsFar, "FAILED"] } },
      data: { status: mappedStatus },
    });
  }
}
