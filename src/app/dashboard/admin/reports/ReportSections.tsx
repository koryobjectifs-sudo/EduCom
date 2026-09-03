import { Info, TriangleAlert, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DataTable, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmptyRow,
} from "@/components/ui/DataTable";
import { DonutChart } from "@/components/ui/DonutChart";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatAmount } from "@/lib/moneyFormat";
import type { Metric, ReportGroup, ReportSection, TraceRow, Unavailable } from "@/lib/reports";
import { NotificationItem } from "./NotificationItem";
import { RevenueChart, PaymentMethodsChart } from "./Charts";

/**
 * Rendu d'un rapport — composants **serveur**.
 *
 * ⚠️ `DataTable` est un module `"use client"` : ses propriétés statiques
 * (`DataTable.Cell`…) ne traversent pas la frontière RSC et valent `undefined`
 * depuis un composant serveur. Ce fichier utilise donc les **exports nommés**,
 * seule forme valable ici — c'est exactement le bug « Element type is invalid »
 * du lot 08, et le garde de `verify-dashboard.ts` le vérifie.
 */

/* ───────────────────────────── comparaison ───────────────────────────── */

/**
 * Écart avec la période précédente.
 *
 * ⚠️ Trois cas distincts, et ils ne doivent pas se confondre :
 *   - `previous === null` → **non calculable**, on affiche un tiret et rien d'autre ;
 *   - `previous === 0`    → calculable, mais aucun pourcentage n'a de sens
 *                           (division par zéro) : on affiche l'écart absolu ;
 *   - sinon               → pourcentage réel.
 *
 * Un « +100 % » sorti d'une base nulle est le genre de chiffre qui se retrouve
 * dans une réunion de direction. Il n'est pas produit ici.
 */
function Comparison({ metric }: { metric: Metric }) {
  if (metric.previous === null) {
    return (
      <span className="text-role-meta text-text-faint" title="Comparaison non calculable sur cette période.">
        —
      </span>
    );
  }

  const delta = metric.value - metric.previous;
  if (delta === 0) {
    return <span className="text-role-meta text-text-faint">stable</span>;
  }

  const up = delta > 0;
  const abs = metric.format === "amount" ? formatAmount(Math.abs(delta)) : Math.abs(delta).toLocaleString("fr-FR");
  const pct = metric.previous === 0 ? null : Math.round((delta / Math.abs(metric.previous)) * 100);

  // La couleur ne porte jamais l'information seule : le signe est écrit.
  return (
    <span className={`text-role-meta font-medium ${up ? "text-success" : "text-danger"}`}>
      {up ? "+" : "−"}{abs}
      {pct !== null && <span className="text-text-faint"> ({up ? "+" : "−"}{Math.abs(pct)} %)</span>}
    </span>
  );
}

/* ─────────────────────────────── métrique ─────────────────────────────── */

function MetricCard({ metric, comparable }: { metric: Metric; comparable: boolean }) {
  return (
    <div className="rounded-surface bg-surface p-5 shadow-sm border border-rule/50 hover:shadow-md transition-shadow">
      <p className="text-sm font-semibold tracking-wide text-text-soft">{metric.label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-text">
        {metric.format === "amount" ? formatAmount(metric.value) : metric.value.toLocaleString("fr-FR")}
        {metric.format === "amount" && <span className="ml-1 text-sm font-medium text-text-soft">FCFA</span>}
      </p>

      {comparable && (
        <p className="mt-3 flex items-center gap-2">
          <Comparison metric={metric} />
        </p>
      )}

      {metric.hint && <p className="mt-3 text-xs leading-relaxed text-text-faint">{metric.hint}</p>}
    </div>
  );
}

/* ──────────────────────────── indisponibilité ──────────────────────────── */

/**
 * Donnée que le schéma ne permet pas de produire.
 *
 * Elle est **affichée**, pas masquée : un directeur qui cherche « bulletins
 * imprimés » doit apprendre que la donnée n'existe pas, sinon il conclut que le
 * chiffre est nul.
 */
function UnavailableList({ items }: { items: Unavailable[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 space-y-2 border-t border-rule pt-4">
      {items.map((u) => (
        <div key={u.label} className="flex gap-2 text-role-meta text-text-faint">
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="leading-relaxed">
            <span className="font-medium text-text-soft">{u.label} — non disponible.</span> {u.reason}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────── traçabilité ──────────────────────────── */

const dateTime = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
  " · " +
  d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function TraceTable({ rows, emptyLabel }: { rows: TraceRow[]; emptyLabel?: string }) {
  const withWho = rows.some((r) => r.who);
  const withAmount = rows.some((r) => r.amount !== null);
  const withState = rows.some((r) => r.state);

  return (
    <DataTable>
      <TableHead>
        <TableRow>
          <TableHeadCell>Quoi</TableHeadCell>
          {withWho && <TableHeadCell>Qui</TableHeadCell>}
          <TableHeadCell>Quand</TableHeadCell>
          {withState && <TableHeadCell>État</TableHeadCell>}
          {withAmount && <TableHeadCell numeric>Montant</TableHeadCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmptyRow colSpan={2 + Number(withWho) + Number(withState) + Number(withAmount)}>
            {emptyLabel ?? "Aucune donnée sur cette période."}
          </TableEmptyRow>
        ) : (
          rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-text">{r.what}</TableCell>
              {withWho && <TableCell className="text-text-soft">{r.who ?? "—"}</TableCell>}
              <TableCell className="whitespace-nowrap text-text-soft tabular-nums">{dateTime(r.when)}</TableCell>
              {withState && (
                <TableCell>
                  {r.state ? <StatusBadge domain={r.state.domain} status={r.state.value} /> : "—"}
                </TableCell>
              )}
              {withAmount && (
                <TableCell numeric className="font-medium text-text">
                  {r.amount === null ? "—" : `${formatAmount(r.amount)} FCFA`}
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </DataTable>
  );
}

/* ──────────────────────────────── section ──────────────────────────────── */

export function SectionBlock({ section, comparable }: { section: ReportSection; comparable: boolean }) {
  const hasMetrics = section.metrics.length > 0;
  const hasRows = section.rows.length > 0;

  // Détection des métriques financières pour afficher la barre de progression
  const expectedMetric = section.metrics.find((m) => m.key === "expected" || m.key === "g-expected");
  const collectedMetric = section.metrics.find((m) => m.key.includes("collected"));
  const showProgress = expectedMetric && collectedMetric && expectedMetric.value > 0;
  
  const progressValue = showProgress ? Math.min((collectedMetric.value / expectedMetric.value) * 100, 100) : 0;

  // ⚠️ Rattachement PAR ID, à l'identique de `showProgress` juste au-dessus :
  // la section « Conformité documentaire » (construite dans `secretariatSections()`
  // de `src/lib/reports.ts`) est la SEULE à devoir renvoyer vers le portail
  // détaillé — un tableau nominatif, hors du cadre « métriques » de cet écran.
  const isCompliance = section.id === "secr-compliance";

  return (
    <Card
      title={section.title}
      description={section.description}
      actions={
        isCompliance ? (
          <Link
            href="/dashboard/admin/reports/compliance"
            className="inline-flex items-center gap-1.5 text-role-body font-semibold text-primary hover:underline pointer-coarse:min-h-11"
          >
            Voir le détail par élève
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : undefined
      }
    >
      {showProgress && (
        <div className="mb-8 rounded-surface border border-rule/50 bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold tracking-wide text-text-soft">Progression globale (Objectif Mensuel)</h3>
          <ProgressBar
            progress={progressValue}
            target={100}
            color="success"
            showLabel
            label={`${formatAmount(collectedMetric.value)} FCFA / ${formatAmount(expectedMetric.value)} FCFA`}
            className="mb-2"
          />
        </div>
      )}

      {hasMetrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {section.metrics.map((m) => (
            <MetricCard key={m.key} metric={m} comparable={comparable} />
          ))}
        </div>
      )}

      {/* Une section sans métrique NI ligne dit pourquoi, au lieu de rester vide. */}
      {!hasMetrics && !hasRows && (
        <EmptyState
          size="sm"
          title="Rien à afficher"
          description={section.emptyLabel ?? "Aucune donnée sur cette période."}
        />
      )}

      {section.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {section.charts.revenue && (
            <div className="rounded-surface border border-rule/50 bg-surface p-5 shadow-sm">
              <h3 className="text-sm font-semibold tracking-wide text-text-soft">Évolution Financière</h3>
              <RevenueChart data={section.charts.revenue} />
            </div>
          )}
          {section.charts.methods && (
            <div className="rounded-surface border border-rule/50 bg-surface p-5 shadow-sm">
              <h3 className="text-sm font-semibold tracking-wide text-text-soft">Répartition des Encaissements</h3>
              <PaymentMethodsChart data={section.charts.methods} />
            </div>
          )}
        </div>
      )}

      {hasRows && (
        <div className={hasMetrics || section.charts ? "mt-5" : ""}>
          <TraceTable rows={section.rows} emptyLabel={section.emptyLabel} />
        </div>
      )}

      <UnavailableList items={section.unavailable} />
    </Card>
  );
}

/* ──────────────────────── bandeau de comparaison ──────────────────────── */

export function ComparisonNotice({ label }: { label: string | null }) {
  if (label) {
    return (
      <p className="text-role-meta text-text-faint">
        Les écarts sont calculés face à <span className="font-medium text-text-soft">{label}</span>.
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-control border border-warning/30 bg-warning/5 px-3 py-2 text-role-meta text-warning">
      <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Aucune comparaison n&apos;est affichée : un trimestre ne porte ni ordre ni rang au schéma, donc
        « le trimestre précédent » ne peut pas être déterminé sans le deviner.
      </span>
    </p>
  );
}

/* ────────────────────────────── groupe de service ────────────────────────── */

/**
 * Un service et ses sections — lot 12.1.
 *
 * ⚠️ Ce composant n'a **aucune logique de visibilité**. Il rend ce qu'on lui
 * donne, et `buildReport()` ne lui donne que les groupes auxquels l'utilisateur
 * a droit. C'est voulu : une visibilité décidée à l'affichage finit toujours par
 * laisser les données dans le DOM.
 */
export function GroupBlock({ group, comparable }: { group: ReportGroup; comparable: boolean }) {
  return (
    <section aria-labelledby={`grp-${group.id}`} className="space-y-4">
      <div className="border-b border-rule pb-2">
        <h2 id={`grp-${group.id}`} className="text-role-section font-semibold tracking-tight text-text">
          {group.title}
        </h2>
        {group.description && (
          <p className="mt-0.5 text-role-meta text-text-soft">{group.description}</p>
        )}
      </div>

      <div className="space-y-5">
        {group.sections.map((s) => (
          <SectionBlock key={s.id} section={s} comparable={comparable} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────── notifications ───────────────────────────── */

/**
 * Notifications non lues du personnel — lot 12.1, cycle de lecture au 12.2.
 *
 * ⚠️ Ce bandeau est le **seul** canal de remise : la notification vit en base et
 * se lit ici. Aucun e-mail ni SMS n'est envoyé — le dépôt n'a de canal sortant
 * que Twilio, câblé pour les parents.
 *
 * Le composant lui-même est un simple conteneur ; le bouton « marquer comme
 * lue » vit dans `NotificationItem`, qui est client (il lui faut un état de
 * transition). Le rendu reste donc serveur pour tout le reste de la page.
 */
export function NotificationBanner({
  items,
}: {
  items: { id: string; title: string; body: string; link: string | null; createdAt: Date }[];
}) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Notifications non lues" className="space-y-2">
      {items.map((n) => (
        <NotificationItem
          key={n.id}
          id={n.id}
          title={n.title}
          body={n.body}
          link={n.link}
          // Une `Date` ne traverse pas la frontière serveur → client dans les
          // props : elle est sérialisée en ISO et reformatée côté client.
          createdAtIso={n.createdAt.toISOString()}
        />
      ))}
    </section>
  );
}
