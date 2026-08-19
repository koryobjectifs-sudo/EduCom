import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { roleLabel } from "@/lib/permissions";
import { isSystemActor } from "@/lib/audit";
import { statusLabel, type StatusDomain } from "@/lib/status";

/**
 * « Qui a fait quoi, quand ? » — rendu de `WorkflowTransition`.
 *
 * Exigence métier explicite de la direction. Les six informations demandées sont
 * toutes affichées : acteur, rôle **au moment de l'acte**, état précédent, nouvel
 * état, date, commentaire.
 *
 * ⚠️ Le rôle vient de la ligne d'historique (`actorRole`), jamais du rôle actuel
 * de la personne : un comptable devenu administrateur a agi comme comptable, et
 * l'historique doit continuer à le dire.
 *
 * ⚠️ Un acteur absent du répertoire s'affiche « Compte supprimé » et non « — » :
 * la trace subsiste volontairement au-delà du compte (aucune relation sur
 * `WorkflowTransition.actorId`), donc le vide a un sens qu'il faut nommer.
 *
 * Composant serveur : aucune interaction, donc aucune raison d'expédier du
 * JavaScript au navigateur pour l'afficher.
 */

export type TransitionRow = {
  id: string;
  fromState: string | null;
  toState: string;
  comment: string | null;
  actorId: string;
  actorRole: string;
  createdAt: Date;
};

export function HistoryTimeline({
  rows,
  actors,
  domain,
  emptyHint,
}: {
  rows: TransitionRow[];
  /** `userId` → nom affichable, résolu côté serveur avec le `schoolId` de la session. */
  actors: Map<string, string>;
  domain: StatusDomain;
  emptyHint?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={History}
        size="sm"
        title="Aucun mouvement enregistré"
        description={emptyHint ?? "L'historique se remplit dès la première action."}
      />
    );
  }

  return (
    <ol className="space-y-0">
      {rows.map((r, i) => (
        <li
          key={r.id}
          className={`flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4 ${
            i > 0 ? "border-t border-rule" : ""
          }`}
        >
          <time
            dateTime={r.createdAt.toISOString()}
            className="shrink-0 text-role-meta tabular-nums text-text-faint sm:w-40"
          >
            {r.createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
            {" à "}
            {r.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </time>

          <div className="min-w-0 flex-1">
            <p className="text-role-body text-text">
              {/* ⚠️ Un traitement automatique n'est pas un compte supprimé. Sans
                  ce test, l'acteur système — absent du répertoire du personnel —
                  s'afficherait comme une personne effacée, ce qui est faux. */}
              <span className="font-semibold">
                {isSystemActor(r.actorId) ? "Traitement automatique" : actors.get(r.actorId) ?? "Compte supprimé"}
              </span>
              {!isSystemActor(r.actorId) && (
                <span className="text-text-faint"> ({roleLabel(r.actorRole)})</span>
              )}
              {" — "}
              {r.fromState ? (
                <>
                  {statusLabel(domain, r.fromState)} <span aria-hidden="true">→</span>{" "}
                  <span className="sr-only">vers</span>
                  <span className="font-medium">{statusLabel(domain, r.toState)}</span>
                </>
              ) : (
                <>entrée dans le circuit : <span className="font-medium">{statusLabel(domain, r.toState)}</span></>
              )}
            </p>
            {r.comment && (
              <p className="mt-0.5 text-role-meta italic text-text-soft">« {r.comment} »</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
