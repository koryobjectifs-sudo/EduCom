"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { CampaignType, CampaignTrigger, CampaignStatus } from "@/generated/prisma/client";

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
        // ⚠️ `DRAFT`, et surtout PAS `SCHEDULED`/`PROCESSING`. Ces deux statuts
        // affirment qu'un envoi va partir ; or aucun envoi n'existe sur ce
        // chemin (voir `src/lib/campaignDispatch.ts`). Écrire une promesse en
        // base la propage ensuite partout — écrans, exports, statistiques.
        // Le statut redeviendra conditionnel le jour où l'envoi sera branché.
        status: CampaignStatus.DRAFT,
      }
    });

    await recordAudit(ctx, {
      action: "communication.campaign.created",
      entity: "workflow",
      entityId: campaign.id,
      outcome: "success",
      details: { name: campaign.name, type: campaign.type, role: ctx.role }
    });

    // ⚠️ AUCUN ENVOI N'EST DÉCLENCHÉ ICI, ET CE N'EST PAS UN OUBLI.
    // `workflowEngine.processManualCampaign` existe et fonctionne, mais rien ne
    // l'appelle et aucune tâche planifiée ne réveille `processAutomatedWorkflows`.
    // Le brancher est un lot à part entière : il suppose une école réellement
    // connectée à Meta et un opt-in valide pour chaque destinataire.
    // Tant que ce n'est pas fait, `CAMPAIGN_DISPATCH_AVAILABLE` reste `false` et
    // l'interface ne promet rien.

    return { success: true, id: campaign.id, dispatched: false };
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    return { success: false, error: "Une erreur est survenue lors de la création de la campagne." };
  }
}
