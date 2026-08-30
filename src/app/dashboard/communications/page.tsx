import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import CommunicationCenterClient from "./CommunicationCenterClient";
import { requireActionContext } from "@/lib/actionContext";

export default async function CommunicationCenterPage() {
  // Use requireSchoolContext to ensure school isolation
  const { schoolId } = await requireSchoolContext();
  
  // We can also check role, but the layout usually handles basic access.
  // We will pass the role to the client for UI filtering.
  const auth = await requireActionContext("/dashboard/communications");
  const role = auth.ok ? auth.ctx.role : "TEACHER";
  const isAccountant = role === "ACCOUNTANT";

  // 1. Fetch Message Statistics
  const statsRaw = await prisma.message.groupBy({
    by: ["status"],
    _count: true,
    where: { 
      schoolId,
      // For accountant, we might not be able to easily filter messages by intent at this level,
      // but in a real system we'd filter messages by campaign type or conversation intent.
      // For now, we'll let them see general message volume or we could filter if needed.
    }
  });
  
  const stats = {
    SENT: 0,
    DELIVERED: 0,
    READ: 0,
    RECEIVED: 0,
    FAILED: 0
  };
  
  statsRaw.forEach((s) => {
    if (s.status === "SENT") stats.SENT = s._count;
    if (s.status === "DELIVERED") stats.DELIVERED = s._count;
    if (s.status === "READ") stats.READ = s._count;
    if (s.status === "RECEIVED") stats.RECEIVED = s._count;
    if (s.status === "FAILED") stats.FAILED = s._count;
  });

  const conversations = await prisma.whatsAppConversation.findMany({
    where: { 
      schoolId,
      ...(isAccountant ? { detectedIntent: { in: ["PAYMENT_QUESTION", "ACTION_REQUEST"] } } : {}) // Just an example of restricting the inbox view
    },
    orderBy: { lastActivityAt: "desc" },
    take: 5,
    include: {
      parent: {
        select: { firstName: true, lastName: true, phone: true }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, status: true, direction: true, createdAt: true }
      }
    }
  });

  const surveys = isAccountant ? [] : await prisma.survey.findMany({
    where: { schoolId, isActive: true },
    include: {
      _count: {
        select: { responses: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  // 4. Fetch total parents for potential campaigns count
  const totalParents = await prisma.user.count({
    where: { schoolId, role: "PARENT" }
  });

  const campaigns = await prisma.communicationCampaign.findMany({
    where: { 
      schoolId,
      ...(isAccountant ? { trigger: { in: ["PAYMENT_DUE", "PAYMENT_OVERDUE"] } } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      whatsappConnectionStatus: true,
      whatsappName: true,
      whatsappPhone: true,
      whatsappConnectedAt: true
    }
  });

  return (
    <CommunicationCenterClient 
      stats={stats} 
      conversations={conversations} 
      surveys={surveys}
      campaigns={campaigns}
      totalParents={totalParents}
      role={role}
      school={school || {
        whatsappConnectionStatus: null,
        whatsappName: null,
        whatsappPhone: null,
        whatsappConnectedAt: null
      }}
    />
  );
}
