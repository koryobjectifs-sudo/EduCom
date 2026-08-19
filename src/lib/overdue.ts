import { prisma } from "@/lib/prisma";
import { recordAudit, systemActor } from "@/lib/audit";

/**
 * Bascule des factures échues en `OVERDUE`.
 *
 * ═══ LE PROBLÈME ═══
 *
 * `InvoiceStatus.OVERDUE` existe au schéma depuis l'origine mais **aucun code ne
 * l'écrivait**. Conséquence mesurée au lot 11 : `documents/reminder`, qui
 * cherche `where: { status: "OVERDUE" }`, ne trouvait jamais rien — l'écran de
 * relance était vide par construction, quel que soit le nombre de factures
 * réellement en retard.
 *
 * ═══ POURQUOI UN BALAYAGE, ET PAS UN CALCUL À L'AFFICHAGE ═══
 *
 * On aurait pu ne rien écrire et dériver le retard de `dueDate` à chaque lecture
 * — c'est d'ailleurs ce que font les agrégations financières, et elles
 * continueront : un affichage doit rester juste même si le balayage n'est pas
 * passé.
 *
 * Mais le statut doit exister en base pour trois raisons : les relances le
 * requêtent, un changement de statut est un fait daté qui mérite une trace, et
 * écrire à chaque affichage ferait d'une simple consultation une écriture — donc
 * une page qui modifie la base à chaque rechargement, y compris pour un lecteur
 * sans droit d'écriture.
 *
 * ═══ IDEMPOTENCE ═══
 *
 * Le `where` ne sélectionne QUE des factures `PENDING` réellement échues. Une
 * facture déjà `OVERDUE`, `PAID`, `PARTIAL`, `CANCELLED` ou `DRAFT` n'entre
 * jamais dans l'ensemble :
 *
 *   - `PAID` / `CANCELLED` — états de sortie, jamais reconvertis ;
 *   - `OVERDUE` — déjà traitée, donc aucune seconde écriture, aucun second audit ;
 *   - `DRAFT` — non émise, elle ne peut pas être en retard ;
 *   - `PARTIAL` — un versement a été reçu ; qualifier la facture de « en retard »
 *     effacerait cette nuance. Laissé de côté volontairement, à trancher si le
 *     métier le demande (aucun code n'écrit `PARTIAL` aujourd'hui).
 *
 * Deux exécutions consécutives : la seconde trouve un ensemble vide et n'écrit
 * rien. Vérifié en exécution réelle.
 *
 * ═══ ISOLATION ═══
 *
 * Le balayage traite les écoles **une par une**, et chaque écriture porte le
 * `schoolId` de l'école en cours. Un traitement automatique n'est pas une excuse
 * pour requêter globalement : c'est au contraire le cas où une erreur toucherait
 * tous les établissements d'un coup.
 */

/** Statut de départ. Le seul qui puisse basculer. */
const FROM_STATUS = "PENDING" as const;
const TO_STATUS = "OVERDUE" as const;

export type SweepResult = {
  schoolId: string;
  /** Factures effectivement basculées. `0` si le balayage est déjà passé. */
  changed: number;
  /** Identifiants basculés, pour vérification. */
  ids: string[];
};

/**
 * Bascule les factures échues d'UN établissement.
 *
 * @param at Instant de référence. Injectable pour les tests ; par défaut,
 *   maintenant. Une facture dont l'échéance est **aujourd'hui** n'est pas encore
 *   en retard : la comparaison est stricte (`lt`).
 * @param apply `false` pour un essai à blanc — compte sans écrire, conformément
 *   à la règle du projet sur les opérations de masse.
 */
export async function sweepSchool(
  schoolId: string,
  { at = new Date(), apply = true }: { at?: Date; apply?: boolean } = {},
): Promise<SweepResult> {
  const candidates = await prisma.invoice.findMany({
    where: {
      schoolId,
      status: FROM_STATUS,
      // `lt` et non `lte` : l'échéance du jour laisse la journée pour payer.
      dueDate: { lt: at },
    },
    select: { id: true, title: true, dueDate: true },
  });

  if (candidates.length === 0 || !apply) {
    return { schoolId, changed: 0, ids: candidates.map((c) => c.id) };
  }

  const ids = candidates.map((c) => c.id);

  // ⚠️ Le `where` de l'écriture répète le statut de départ. Sans cela, une
  // facture réglée entre la lecture et l'écriture serait ramenée en `OVERDUE`.
  const res = await prisma.invoice.updateMany({
    where: { id: { in: ids }, schoolId, status: FROM_STATUS },
    data: { status: TO_STATUS },
  });

  // Une trace par facture : l'historique doit pouvoir répondre facture par
  // facture, pas seulement « 12 factures ont basculé cette nuit ».
  const actor = systemActor(schoolId);
  for (const c of candidates) {
    await recordAudit(actor, {
      action: "invoice.overdue",
      entity: "invoice",
      entityId: c.id,
      details: {
        from: FROM_STATUS,
        to: TO_STATUS,
        titre: c.title,
        echeance: c.dueDate.toISOString(),
        declencheur: "balayage automatique",
      },
    });
  }

  return { schoolId, changed: res.count, ids };
}

/**
 * Balaye tous les établissements, un par un.
 *
 * Aucun `schoolId` d'appelant : la fonction les lit elle-même. Elle n'est
 * appelable que depuis un contexte serveur (script ou gestionnaire de route
 * authentifié), jamais depuis une action exposée au client.
 */
export async function sweepAllSchools(
  opts: { at?: Date; apply?: boolean } = {},
): Promise<SweepResult[]> {
  const schools = await prisma.school.findMany({ select: { id: true } });
  const results: SweepResult[] = [];
  for (const s of schools) {
    results.push(await sweepSchool(s.id, opts));
  }
  return results;
}
