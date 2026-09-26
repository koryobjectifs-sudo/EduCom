import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import InboxClient from "./InboxClient";
import { requireActionContext } from "@/lib/actionContext";

export default async function InboxPage() {
  const auth = await requireActionContext("/dashboard/communications/inbox");
  const role = auth.ok ? auth.ctx.role : "TEACHER";
  const { schoolId } = await requireSchoolContext();
  const isAccountant = role === "ACCOUNTANT";

  const rawConversations = await prisma.whatsAppConversation.findMany({
    where: { 
      schoolId,
      ...(isAccountant ? { detectedIntent: { in: ["PAYMENT_QUESTION", "ACTION_REQUEST"] } } : {}) // Accountant inbox filtering
    },
    orderBy: { lastActivityAt: "desc" },
    include: {
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          students: { select: { firstName: true, lastName: true } }
        }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 50
      }
    }
  });

  const chats = rawConversations.map(conv => ({
    id: conv.id,
    parentId: conv.parent.id,
    name: `${conv.parent.firstName} ${conv.parent.lastName}`,
    phone: conv.parent.phone || "Téléphone non renseigné",
    studentNames: conv.parent.students.map(s => `${s.firstName} ${s.lastName}`).join(", "),
    status: conv.status,
    windowExpiresAt: conv.windowExpiresAt ? conv.windowExpiresAt.toISOString() : null,
    detectedIntent: conv.detectedIntent,
    attentionLevel: conv.attentionLevel,
    pendingActionType: conv.pendingActionType,
    pendingActionData: conv.pendingActionData as Record<string, unknown> | null,
    messages: conv.messages.map(m => ({
      id: m.id,
      direction: String(m.direction),
      content: m.content,
      status: String(m.status),
      createdAt: m.createdAt.toISOString()
    })),
    lastMessageText: conv.messages[0]?.content || "",
    time: conv.lastActivityAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  }));

  return (
    <InboxClient chats={chats} />
  );
}
