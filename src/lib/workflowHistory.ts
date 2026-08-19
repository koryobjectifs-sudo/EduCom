import { prisma } from "@/lib/prisma";
import { auditData, recordAudit, type ActorContext } from "@/lib/audit";
import { canTransition, type Transition, type WorkflowDefinition } from "@/lib/workflow";

/**
 * Exécution et traçage des transitions de workflow.
 *
 * ═══ POURQUOI CE FICHIER EST SÉPARÉ DE `workflow.ts` ═══
 *
 * `workflow.ts` ne connaît pas Prisma, volontairement : `availableTransitions()`
 * et `labels` servent à l'affichage, donc doivent rester importables depuis un
 * composant client. Importer Prisma là-bas rendrait ce fichier serveur-only et
 * casserait cet usage. Toute écriture vit donc ici.
 *
 * ═══ CE QUE CE MODULE NE PEUT PAS VÉRIFIER — À LIRE AVANT DE L'UTILISER ═══
 *
 * `WorkflowTransition` est générique (`entity` + `entityId`) : ce module ne sait
 * pas quel modèle Prisma interroger, donc **il ne peut pas vérifier que l'objet
 * appartient bien à l'établissement de l'acteur**.
 *
 * L'appelant DOIT avoir chargé l'objet avec son `schoolId` dans le `where` avant
 * d'appeler ces fonctions :
 *
 *   const card = await prisma.reportCard.findFirst({
 *     where: { id, schoolId: ctx.schoolId },   // ← indispensable
 *     select: { status: true },
 *   });
 *   if (!card) return { error: "Bulletin introuvable." };
 *   const res = await runTransition(ctx, reportCardWorkflow,
 *     { entityId: id, from: card.status, to: "SUBMITTED" },
 *     () => prisma.reportCard.update({ where: { id }, data: { status: "SUBMITTED" } }),
 *   );
 *
 * `from` doit venir de cette lecture, jamais du client : c'est ce qui empêche de
 * rejouer une transition à partir d'un état périmé. Quatre fuites d'isolation
 * ont déjà été trouvées dans ce projet parce qu'un `schoolId` manquait dans un
 * `where` ; le vérificateur `verify-foundations.ts` contrôle qu'aucune fonction
 * exportée d'ici n'accepte de `schoolId` en argument, mais il ne peut pas
 * contrôler le `where` de l'appelant.
 */

export type TransitionRequest<S extends string> = {
  entityId: string;
  /** État actuel, lu en base avec le `schoolId` de la session. */
  from: S;
  to: S;
  comment?: string | null;
};

export type TransitionResult<S extends string> =
  | { ok: true; transition: Transition<S> }
  | { ok: false; error: string };

/* ──────────────────────────── 1. autorisation ──────────────────────────── */

/**
 * La transition est-elle permise, et la charge est-elle complète ?
 *
 * Enchaîne deux contrôles de nature différente :
 *  1. `canTransition()` — l'état et le rôle (via `hasAccess()`, seule matrice de
 *     permissions du projet) ;
 *  2. la présence du commentaire quand la transition l'exige. Ce contrôle est
 *     ici et pas dans `workflow.ts` parce qu'il porte sur la charge fournie,
 *     pas sur la machine.
 *
 * Un refus est **journalisé** avec `outcome: "denied"` : savoir qui a tenté quoi
 * sans y avoir droit fait partie de « avec quel résultat ? ».
 */
export async function authorizeTransition<S extends string>(
  actor: ActorContext,
  wf: WorkflowDefinition<S>,
  req: TransitionRequest<S>,
): Promise<TransitionResult<S>> {
  const check = canTransition(wf, req.from, req.to, actor.role);
  if (!check.allowed) {
    await recordAudit(actor, {
      action: `${wf.name}.${req.to.toLowerCase()}`,
      entity: wf.entity,
      entityId: req.entityId,
      outcome: "denied",
      details: { from: req.from, to: req.to, reason: check.reason },
    });
    return { ok: false, error: check.reason };
  }

  if (check.transition.commentRequired && !req.comment?.trim()) {
    // Pas journalisé : c'est une saisie incomplète, pas une tentative d'accès.
    return { ok: false, error: "Un commentaire est obligatoire pour cette action." };
  }

  return { ok: true, transition: check.transition };
}

/* ───────────────────────────── 2. traçage ───────────────────────────── */

/**
 * Inscrit la transition dans l'historique **et** dans le journal d'activité.
 *
 * Les deux lignes sont écrites dans une seule transaction Prisma : elles
 * décrivent le même acte, et une seule des deux donnerait un historique
 * incohérent.
 *
 * Ne lève jamais, et renvoie `false` en cas d'échec — comme `recordAudit()`, et
 * pour la même raison : à ce stade l'écriture métier a déjà réussi, l'annuler
 * parce que sa trace n'a pas pu être écrite ferait plus de dégâts que la trace
 * manquante. L'échec est journalisé en console.
 */
export async function recordTransition<S extends string>(
  actor: ActorContext,
  wf: WorkflowDefinition<S>,
  req: TransitionRequest<S>,
): Promise<boolean> {
  const comment = req.comment?.trim() || null;
  try {
    await prisma.$transaction([
      prisma.workflowTransition.create({
        data: {
          workflow: wf.name,
          entity: wf.entity,
          entityId: req.entityId,
          fromState: req.from,
          toState: req.to,
          comment,
          actorId: actor.userId,
          actorRole: String(actor.role),
          schoolId: actor.schoolId,
        },
      }),
      prisma.auditLog.create({
        data: auditData(actor, {
          action: `${wf.name}.${req.to.toLowerCase()}`,
          entity: wf.entity,
          entityId: req.entityId,
          outcome: "success",
          details: { from: req.from, to: req.to, ...(comment ? { comment } : {}) },
        }),
      }),
    ]);
    return true;
  } catch (error) {
    console.error("[workflow] historique non écrit :", error);
    return false;
  }
}

/* ───────────────────────── 3. autorisation + acte ───────────────────────── */

/**
 * Point d'entrée recommandé : autorise, applique, trace — dans cet ordre.
 *
 * `apply` porte l'écriture métier propre au module (ce fichier ne connaît pas
 * `reportCard`, `expense`… et ne doit pas les connaître). Il n'est appelé
 * qu'après autorisation, et l'historique n'est écrit qu'après son succès : un
 * historique ne doit jamais affirmer un changement qui n'a pas eu lieu.
 *
 * Si `apply` lève, l'erreur est tracée avec `outcome: "failure"` puis renvoyée
 * proprement — une server action doit répondre `{ error }`, pas exploser.
 */
export async function runTransition<S extends string, T>(
  actor: ActorContext,
  wf: WorkflowDefinition<S>,
  req: TransitionRequest<S>,
  apply: (transition: Transition<S>) => Promise<T>,
): Promise<{ ok: true; result: T; transition: Transition<S> } | { ok: false; error: string }> {
  const auth = await authorizeTransition(actor, wf, req);
  if (!auth.ok) return auth;

  let result: T;
  try {
    result = await apply(auth.transition);
  } catch (error) {
    console.error(`[workflow] ${wf.name} ${req.from}→${req.to} a échoué :`, error);
    await recordAudit(actor, {
      action: `${wf.name}.${req.to.toLowerCase()}`,
      entity: wf.entity,
      entityId: req.entityId,
      outcome: "failure",
      details: { from: req.from, to: req.to },
    });
    return { ok: false, error: "L'enregistrement a échoué. Réessayez." };
  }

  await recordTransition(actor, wf, req);
  return { ok: true, result, transition: auth.transition };
}

/* ─────────────────────────────── 4. lecture ─────────────────────────────── */

export type TransitionRecord = {
  id: string;
  workflow: string;
  entity: string;
  entityId: string;
  fromState: string | null;
  toState: string;
  comment: string | null;
  actorId: string;
  actorRole: string;
  createdAt: Date;
};

/**
 * Historique d'un objet, du plus récent au plus ancien.
 *
 * ⚠️ `schoolId` toujours dans le `where`, même si `entityId` est unique : sans
 * lui, connaître un identifiant suffirait à lire l'historique d'un autre
 * établissement.
 */
export async function transitionHistory(
  actor: ActorContext,
  entity: string,
  entityId: string,
  take = 50,
): Promise<TransitionRecord[]> {
  return prisma.workflowTransition.findMany({
    where: { schoolId: actor.schoolId, entity, entityId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Dernières transitions d'un workflow, tous objets confondus. */
export async function recentTransitions(
  actor: ActorContext,
  workflow: string,
  take = 50,
): Promise<TransitionRecord[]> {
  return prisma.workflowTransition.findMany({
    where: { schoolId: actor.schoolId, workflow },
    orderBy: { createdAt: "desc" },
    take,
  });
}
