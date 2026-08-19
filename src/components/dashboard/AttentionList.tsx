import Link from "next/link";
import { ChevronRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * « À traiter » — priorité 1 du tableau de bord.
 *
 * ═══ CE QUI REMPLACE QUOI ═══
 *
 * `AlertsWidget` construisait ses alertes à partir de deux comptages réels
 * (factures en retard, admissions en attente) **puis en ajoutait deux
 * entièrement inventées** — « 4 messages non lus » et « 12 élèves absents
 * aujourd'hui », valeurs écrites en dur. Un commentaire du code l'assumait :
 * « Adding dummy examples requested by the user ». Aucune donnée de présence
 * n'existe dans le schéma.
 *
 * Il était aussi présenté en **carrousel** : une seule alerte visible à la fois,
 * les autres derrière des flèches. Un directeur qui ouvre son tableau de bord
 * doit voir *tout* ce qui demande son attention, pas en feuilleter une partie.
 *
 * ⚠️ Les liens de l'ancien widget pointaient vers `/payments`, `/admissions`,
 * `/communications`, `/students` — **sans le préfixe `/dashboard`**. Aucune de
 * ces routes n'existe : les quatre alertes menaient à une 404.
 *
 * ═══ RÈGLE ═══
 *
 * Une entrée n'apparaît que si son compte est **strictement supérieur à zéro**.
 * Rien à traiter ⇒ état vide explicite, pas une liste décorative.
 */

export type AttentionItem = {
  /** Ce qu'il y a à faire. Porte l'information à lui seul. */
  label: string;
  /** Précision chiffrée, issue d'une requête réelle. */
  detail: string;
  count: number;
  href: string;
  cta: string;
  icon: LucideIcon;
  severity: "danger" | "warning" | "info";
};

const TONE = {
  danger: { text: "text-danger", bg: "bg-danger/10", ring: "border-danger/20" },
  warning: { text: "text-warning", bg: "bg-warning/10", ring: "border-warning/20" },
  info: { text: "text-accent", bg: "bg-accent/10", ring: "border-accent/20" },
} as const;

export default function AttentionList({ items }: { items: AttentionItem[] }) {
  const actionable = items.filter((i) => i.count > 0);
  const total = actionable.reduce((n, i) => n + i.count, 0);

  return (
    <Card
      flush
      // Liseré rouge uniquement s'il y a réellement matière à agir.
      className={actionable.length > 0 ? "border-t-2 border-t-danger" : undefined}
      title="À traiter"
      description={
        actionable.length > 0
          ? `${total} élément${total > 1 ? "s" : ""} demande${total > 1 ? "nt" : ""} votre attention`
          : "Rien ne demande votre attention"
      }
      actions={
        actionable.length > 0 ? (
          <span className="rounded-pill bg-danger/10 px-2 py-0.5 text-role-meta font-semibold tabular-nums text-danger">
            {actionable.length}
          </span>
        ) : undefined
      }
    >
      {actionable.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={CheckCircle2}
            title="Tout est à jour"
            description="Aucun paiement en retard, aucune admission ni aucun bulletin en attente."
            size="sm"
          />
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {actionable.map((item) => {
            const tone = TONE[item.severity];
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sunk/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control border ${tone.bg} ${tone.ring} ${tone.text}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-role-body font-semibold text-text">
                      {item.label}
                    </span>
                    {/* Le détail est du texte : la sévérité ne repose pas sur la
                        seule couleur de la puce. */}
                    <span className={`block text-role-meta font-medium ${tone.text}`}>
                      {item.detail}
                    </span>
                  </span>

                  <span className="hidden shrink-0 text-role-meta font-medium text-text-soft group-hover:text-primary sm:block">
                    {item.cta}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-text-faint group-hover:text-primary"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
