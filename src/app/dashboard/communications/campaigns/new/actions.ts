"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { CampaignType, CampaignTrigger, CampaignStatus } from "@/generated/prisma/client";
import { workflowEngine } from "@/lib/whatsapp/workflowEngine";

export async function createCommunicationCampaign(data: {
  name: string;
  type: CampaignType;
  trigger: CampaignTrigger;
  triggerConfig: any;
  templateId: string;
  audienceConfig: any;
}) {
  const auth = await requireActionContext("/dashboard/communications");
  if (!auth.ok) return { success: false, error: auth.error };
  const { ctx } = auth;
  const { schoolId } = ctx;

  if (ctx.role === "TEACHER") {
    return { success: false, error: "Vous n'avez pas les droits pour créer une campagne externe." };
  }

  if (ctx.role === "ACCOUNTANT") {
    if (data.trigger !== "PAYMENT_DUE" && data.trigger !== "PAYMENT_OVERDUE") {
      return { success: false, error: "Votre rôle ne vous permet de créer que des campagnes de relance financière." };
    }
  }

  try {
    const campaign = await prisma.communicationCampaign.create({
      data: {
        name: data.name,
        type: data.type,
        trigger: data.trigger,
        triggerConfig: data.triggerConfig,
        templateId: data.templateId,
        audienceConfig: data.audienceConfig,
        schoolId,
        status: data.type === "AUTOMATED_WORKFLOW" ? CampaignStatus.PROCESSING : CampaignStatus.SCHEDULED,
      }
    });

    await recordAudit(ctx, {
      action: "communication.campaign.created",
      entity: "workflow",
      entityId: campaign.id,
      outcome: "success",
      details: { name: campaign.name, type: campaign.type, role: ctx.role }
    });

    // If it's manual and scheduled for now, we could theoretically trigger it immediately,
    // but the workflowEngine CRON or immediate processor would pick it up.
    if (data.type === "MANUAL_SCHEDULED") {
      // Pour la V1, on peut imaginer un appel direct si on veut un envoi immédiat
      // await workflowEngine.processManualCampaign(campaign.id);
    }

    return { success: true, id: campaign.id };
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    return { success: false, error: "Une erreur est survenue lors de la création de la campagne." };
  }
}
