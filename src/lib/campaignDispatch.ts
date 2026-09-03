/**
 * Une campagne peut-elle RÉELLEMENT partir ? — LOT 17.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * Le parcours des campagnes créait une campagne `SCHEDULED` / `PROCESSING`, et
 * l'écran affichait « Campagne créée avec succès ». Or **aucun message n'a
 * jamais quitté EduCom par ce chemin** : l'appel au moteur d'envoi est resté en
 * commentaire, et aucune tâche planifiée ne le réveille.
 *
 * Une directrice qui prépare une relance voyait donc « planifiée » et repartait
 * convaincue que trois cents familles étaient prévenues. **C'est le seul défaut
 * du produit qui ment sans laisser de trace** — plus grave qu'un canal absent,
 * parce qu'un canal absent se voit.
 *
 * ═══ UNE SEULE LIGNE DÉCIDE ═══
 *
 * Même discipline que `src/lib/channels.ts` : aucun écran ne juge par lui-même
 * s'il a le droit d'écrire « planifiée » ou « envoyée ». Il demande ici. Sans ce
 * point unique, il suffirait qu'un écran sur cinq se trompe pour que le mensonge
 * revienne.
 *
 * ⚠️ **Ce module reste pur** — pas de Prisma, pas de `process.env`. Il est donc
 * importable depuis un composant `"use client"`, ce qui est le cas.
 */

/**
 * ⚠️ **NE PASSER À `true` QUE QUAND LES TROIS CONDITIONS SONT VRAIES**, et
 * qu'un envoi réel a été observé — pas seulement écrit :
 *
 *   1. `workflowEngine.processManualCampaign` est appelé pour de bon depuis
 *      `campaigns/new/actions.ts` (aujourd'hui : en commentaire) ;
 *   2. une tâche planifiée appelle `processAutomatedWorkflows`
 *      (aujourd'hui : `vercel.json` ne déclare que `/api/cron/overdue`) ;
 *   3. une école est réellement connectée à Meta ET les destinataires ont un
 *      opt-in valide (aujourd'hui : 0 école connectée, 0 `OPTED_IN`).
 *
 * Basculer ce drapeau sans cela ferait mentir tout le produit d'un coup.
 */
export const CAMPAIGN_DISPATCH_AVAILABLE = false as boolean;

/** Statuts qui, en temps normal, annoncent qu'un envoi va partir ou est parti. */
const STATUTS_QUI_PROMETTENT = new Set(["SCHEDULED", "PROCESSING", "SENT", "COMPLETED"]);

/**
 * Ce que l'écran doit afficher pour une campagne.
 *
 * ⚠️ L'override couvre AUSSI les campagnes déjà en base : deux d'entre elles
 * portent `SCHEDULED`/`PROCESSING` depuis avant ce correctif. Corriger seulement
 * les nouvelles laisserait le mensonge à l'écran pour les anciennes — et on ne
 * réécrit pas des données métier pour rattraper un défaut d'affichage.
 */
export function campaignStateLabel(status: string | null | undefined): {
  label: string;
  hint: string;
} {
  if (!status) return { label: "—", hint: "" };

  if (!CAMPAIGN_DISPATCH_AVAILABLE && STATUTS_QUI_PROMETTENT.has(status)) {
    return {
      label: "Préparée",
      hint: "Envoi non disponible — aucun message n'a été transmis aux familles.",
    };
  }

  switch (status) {
    case "DRAFT":     return { label: "Préparée",  hint: "Envoi non disponible — aucun message n'a été transmis aux familles." };
    case "PAUSED":    return { label: "En pause",  hint: "Reprise possible depuis la campagne." };
    case "CANCELLED": return { label: "Annulée",   hint: "Ne partira pas." };
    case "FAILED":    return { label: "Échouée",   hint: "L'envoi a été tenté et a échoué." };
    default:          return { label: status,      hint: "" };
  }
}
