"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { channels, normalizePhone } from "@/lib/channels";
import { MessageDirection, MessageStatus } from "@/generated/prisma/client";

/**
 * Campagne de messages aux parents.
 *
 * ═══ LOT 01 — CE QUI AVAIT DÉJÀ ÉTÉ VERROUILLÉ ═══
 *
 * Cette action était la plus exposée du projet : aucune authentification,
 * `schoolId` reçu du client, et **le numéro de chaque destinataire fourni par
 * l'appelant**. Elle permettait d'émettre des messages facturés au compte de
 * l'école vers n'importe quel numéro, et d'écrire les traces dans
 * l'établissement de son choix. Trois verrous ont été posés : appelant
 * authentifié avec accès à `/dashboard/communications`, `schoolId` pris dans la
 * session, et **numéros relus en base** après vérification d'appartenance.
 *
 * ═══ LOT 17 — CE QUI ÉTAIT ENCORE FAUX, ET QUI NE L'EST PLUS ═══
 *
 * ⚠️ **Le module écrivait `status: SENT` pour des messages qui ne partaient
 * jamais.** Deux chemins y menaient : l'absence d'identifiants Twilio
 * (« simulation mode », qui enregistrait quand même la campagne comme envoyée),
 * et l'échec d'un appel Twilio (le `catch` journalisait dans la console puis
 * laissait écrire `SENT`).
 *
 * Ce n'était pas théorique. Au 19 août 2026, la table `Message` comptait six
 * lignes `SENT` — et le journal du compte Twilio, interrogé par son API,
 * comptait **zéro message depuis la création du compte**. Le compte est en
 * essai, ne détient **aucun numéro**, et l'expéditeur configuré ne lui
 * appartient pas. Aucun de ces six messages n'a jamais existé.
 *
 * La règle est désormais celle du lot 17 : **`src/lib/channels.ts` est seul juge
 * de ce qui peut partir**, et rien ne s'écrit `SENT` sans qu'un service ait
 * réellement accepté le message.
 */
export async function sendBulkWhatsAppMessages(
  messages: { parentId: string; content: string }[]
) {
  const auth = await requireActionContext("/dashboard/communications");
  if (!auth.ok) return { success: false, error: auth.error };
  const { ctx } = auth;
  const { schoolId } = ctx;

  if (messages.length === 0) return { success: true, sent: 0, failed: 0, rejected: 0 };

  // Résolution serveur des destinataires : appartenance à l'école + téléphone.
  const parents = await prisma.user.findMany({
    where: { id: { in: messages.map((m) => m.parentId) }, schoolId, role: "PARENT" },
    select: { id: true, phone: true },
  });
  const phoneById = new Map(parents.map((p) => [p.id, normalizePhone(p.phone)]));

  const recipients = messages
    .map((m) => ({ parentId: m.parentId, content: m.content, phone: phoneById.get(m.parentId) ?? null }))
    .filter((r): r is { parentId: string; content: string; phone: string } => Boolean(r.phone));

  const rejected = messages.length - recipients.length;
  if (recipients.length === 0) {
    return { success: false, error: "Aucun destinataire joignable dans votre établissement.", sent: 0, failed: 0, rejected };
  }

  // ⚠️ Le seul juge. Ni `.env`, ni un booléen local, ni l'optimisme.
  const usable = channels().filter((c) => (c.id === "whatsapp" || c.id === "sms") && c.canSend);

  if (usable.length === 0) {
    const why = channels().find((c) => c.id === "sms")!.reason;

    // ⚠️ **Rien n'est écrit.** Enregistrer ces messages, sous quelque statut que
    // ce soit, laisserait croire qu'une campagne a eu lieu. Le texte et les
    // numéros restent à l'écran, prêts à être copiés dans le téléphone de
    // l'établissement : c'est ce que le module sait réellement faire.
    await recordAudit(ctx, {
      action: "communication.campaign.blocked",
      entity: "user",
      outcome: "failure",
      details: { recipients: recipients.length, rejected, reason: why, sentByEduCom: false },
    });

    return {
      success: false,
      sent: 0,
      failed: 0,
      rejected,
      prepared: recipients.length,
      error:
        `Aucun message n'a été envoyé : ${why} ` +
        `Les ${recipients.length} destinataire(s) et le texte restent prêts à être copiés.`,
    };
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Chemin d'envoi réel — inatteignable aujourd'hui (aucun canal
   * `OPERATIONNEL`). Il ne doit s'écrire qu'avec le fournisseur sous la main :
   * un envoi jamais exécuté qui prétendrait fonctionner reproduirait exactement
   * le défaut que ce lot vient de corriger.
   * ───────────────────────────────────────────────────────────────────── */
  return {
    success: false,
    sent: 0,
    failed: 0,
    rejected,
    error:
      "Un canal est déclaré opérationnel mais aucun envoi n'est implémenté. " +
      "Vérifiez `SEND_IMPLEMENTATIONS` dans src/lib/channels.ts.",
  };
}

/** Statut réel d'un message enregistré. Réexporté pour l'écran d'historique. */
export const MESSAGE_STATES = { SENT: MessageStatus.SENT, FAILED: MessageStatus.FAILED, OUT: MessageDirection.OUTBOUND };
