import { prisma } from "@/lib/prisma";
import { 
  CampaignTrigger, 
  CampaignType, 
  CampaignStatus, 
  MessageDirection, 
  MessageStatus, 
  WhatsAppOptInStatus 
} from "@/generated/prisma/client";
import { buildMetaComponents, TemplateMapping, VariableContext } from "./variables";
import { WhatsAppClient } from "./client";
import { actionLinks } from "../actionLinks";
import { createHash } from "crypto";

function generateIdempotencyKey(campaignId: string, parentId: string, entityId: string): string {
  return createHash("sha256").update(`${campaignId}_${parentId}_${entityId}`).digest("hex");
}

export const workflowEngine = {
  /**
   * Point d'entrée pour les tâches planifiées (CRON).
   * Parcourt toutes les campagnes automatisées actives et déclenche la logique appropriée.
   */
  async processAutomatedWorkflows() {
    const campaigns = await prisma.communicationCampaign.findMany({
      where: {
        type: CampaignType.AUTOMATED_WORKFLOW,
        status: CampaignStatus.PROCESSING,
      },
      include: {
        template: true,
      },
    });

    for (const campaign of campaigns) {
      try {
        if (
          campaign.trigger === CampaignTrigger.PAYMENT_DUE ||
          campaign.trigger === CampaignTrigger.PAYMENT_OVERDUE
        ) {
          await this.processPaymentWorkflow(campaign);
        }
      } catch (err) {
        console.error(`WorkflowEngine Error (Campaign ${campaign.id}):`, err);
      }
    }
  },

  /**
   * Traitement des factures. 
   * Pour chaque facture correspondante, vérifie l'opt-in et envoie le message.
   */
  async processPaymentWorkflow(campaign: any) {
    const config = (campaign.triggerConfig as { daysOffset?: number }) || {};
    const daysOffset = config.daysOffset || 0;

    // Date cible = aujourd'hui + daysOffset jours
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Récupérer les factures PENDING dont la dueDate correspond
    const invoices = await prisma.invoice.findMany({
      where: {
        schoolId: campaign.schoolId,
        status: "PENDING",
        dueDate: {
          gte: targetDate,
          lt: nextDate,
        },
      },
      include: {
        student: true,
        parent: true,
      },
    });

    if (invoices.length === 0) return;

    const waClient = await WhatsAppClient.forSchool(campaign.schoolId);
    const templateMapping = (campaign.template.components as any)?.mapping || {}; 
    // Fallback simple if mapping isn't set, we assume standard position mapping is stored in UI config or we use a default
    // We will assume `campaign.audienceConfig` might contain the mapping, or template has it.
    // Let's assume audienceConfig has `templateMapping`.
    const mapping = (campaign.audienceConfig as any)?.templateMapping as TemplateMapping || {};

    let sent = 0;
    let failed = 0;

    for (const invoice of invoices) {
      const parentId = invoice.parentId;
      if (!parentId) continue; // Si la facture n'est pas liée à un parent directement, on ignore (simplification V1)

      const idempotencyKey = generateIdempotencyKey(campaign.id, parentId, invoice.id);

      // Vérifier si déjà traité
      const existing = await prisma.message.findUnique({
        where: { idempotencyKey },
      });
      if (existing) continue;

      // Récupérer le parent
      const parent = invoice.parent;
      if (!parent || parent.whatsappOptIn !== WhatsAppOptInStatus.OPTED_IN || !parent.phone) {
        // Enregistrer un échec ou ignorer (ici on ignore pour ne pas spammer la base de failed si non opt-in)
        continue;
      }

      // Générer le lien d'action
      const actionLinkToken = await actionLinks.create({
        action: "view_invoice",
        entityId: invoice.id,
        parentId: parent.id,
        studentId: invoice.studentId || undefined,
        schoolId: campaign.schoolId,
        expiresInDays: 7,
      });

      // Construire le contexte
      const context: VariableContext = {
        parent: { firstName: parent.firstName, lastName: parent.lastName },
        student: invoice.student ? { firstName: invoice.student.firstName, lastName: invoice.student.lastName } : undefined,
        invoice: { amount: invoice.totalAmount, dueDate: invoice.dueDate },
        actionLinkToken, // Le lien complet sera construit par le client s'il injecte le domaine, ou on injecte juste le token
      };

      const metaComponents = buildMetaComponents(mapping, context);

      try {
        const res = await waClient.sendTemplateMessage(
          parent.phone,
          campaign.template.name,
          campaign.template.language,
          metaComponents
        ) as any;

        const waMessageId = res?.messages?.[0]?.id;

        // Persister le succès
        await prisma.message.create({
          data: {
            direction: MessageDirection.OUTBOUND,
            content: `Template: ${campaign.template.name}`,
            status: MessageStatus.SENT,
            schoolId: campaign.schoolId,
            parentId: parent.id,
            templateId: campaign.template.id,
            campaignId: campaign.id,
            waMessageId,
            idempotencyKey,
          },
        });
        sent++;
      } catch (err) {
        // Persister l'échec
        await prisma.message.create({
          data: {
            direction: MessageDirection.OUTBOUND,
            content: `Template: ${campaign.template.name} (Échec)`,
            status: MessageStatus.FAILED,
            schoolId: campaign.schoolId,
            parentId: parent.id,
            templateId: campaign.template.id,
            campaignId: campaign.id,
            idempotencyKey,
          },
        });
        failed++;
      }
    }

    // Mettre à jour les stats
    if (sent > 0 || failed > 0) {
      await prisma.communicationCampaign.update({
        where: { id: campaign.id },
        data: {
          sentCount: { increment: sent },
          failedCount: { increment: failed },
        },
      });
    }
  },

  /**
   * Événement asynchrone (ex: Publication de bulletin).
   */
  async triggerEvent(schoolId: string, event: CampaignTrigger, entityId: string, contextData: any) {
    const campaigns = await prisma.communicationCampaign.findMany({
      where: {
        schoolId,
        trigger: event,
        status: CampaignStatus.PROCESSING,
      },
      include: { template: true },
    });

    if (campaigns.length === 0) return;

    // Logique d'envoi immédiat par événement (à implémenter en fonction de l'entité)
    // Par exemple, pour REPORT_CARD_PUBLISHED, entityId est le reportCardId.
  },
};
