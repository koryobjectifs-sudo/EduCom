"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight, TrendingUp, TrendingDown, Wallet, GraduationCap, Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CountUp } from "./Motion";
import { DataState } from "./DataState";
import type { AcademicFacts, FinanceFacts, ParentsFacts, Signal } from "@/lib/dashboard";

/**
 * Niveau 5 — Finance · Académique · Parents.
 *
 * ═══ TROIS RÉSUMÉS, PAS TROIS RAPPORTS ═══
 *
 * Chaque bloc tient en un **chiffre de tête** plus trois appuis, et se termine
 * par un lien vers **Rapports**, seul responsable de l'analyse détaillée. Règle
 * appliquée : si une information n'aide ni à comprendre ni à agir depuis le
 * tableau de bord, elle appartient au rapport.
 *
 * ═══ IDENTITÉ SANS ARC-EN-CIEL ═══
 *
 * Les trois cartes se distinguent par leur **icône**, leur **chiffre de tête**
 * et leur **structure** — pas par trois couleurs de marque. La couleur
 * n'apparaît que quand la donnée la justifie : un recouvrement faible vire à
 * l'orange, une moyenne en baisse au rouge. Les pastilles d'icône restent
 * neutres, sinon l'écran devient un tableau de couleurs et plus une lecture.
 *
 * ⚠️ Les trois reçoivent un `Signal` : sans donnée, elles affichent la raison et
 * non un zéro. Un « 0 % de recouvrement » sur une école qui n'a jamais émis de
 * facture est un mensonge, pas un état vide.
 */

function SummaryShell({
  title, description, icon: Icon, href, cta, children,
}: {
  title: string; description?: string; icon: LucideIcon;
  href: string; cta: string; children: ReactNode;
}) {
  return (
    /**
     * ⚠️ `h-full` + `flex-col` : sans cela les cartes prennent la hauteur de leur
     * contenu et les trois liens de pied se retrouvent à trois hauteurs
     * différentes sur une même rangée — mesuré au pilote Chrome.
     */
    <Card
      className="group/card flex h-full flex-col transition-shadow duration-200 hover:shadow-overlay"
      bodyClassName="flex-1"
      title={
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-control bg-sunk text-text-soft transition-colors duration-200 group-hover/card:bg-primary/10 group-hover/card:text-primary"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          {title}
        </span>
      }
      description={description}
      footer={
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-role-meta font-semibold text-text-soft transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {cta}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      }
    >
      {children}
    </Card>
  );
}

/** Le chiffre de tête d'une carte. Un seul par carte — c'est ce qui la nomme. */
function Lead({
  value, unit, caption, tone = "neutral", after,
}: {
  value: number; unit?: string; caption: string;
  tone?: "neutral" | "success" | "warning" | "danger"; after?: ReactNode;
}) {
  const toneClass =
    tone === "success" ? "text-success"
    : tone === "warning" ? "text-warning"
    : tone === "danger" ? "text-danger"
    : "text-text";
  return (
    <div>
      <div className="flex items-baseline gap-2.5">
        <p className={`text-[30px] font-semibold tabular-nums leading-none tracking-tight ${toneClass}`}>
          <CountUp value={value} />
          {unit && <span className="ml-0.5 text-role-section font-medium">{unit}</span>}
        </p>
        {after}
      </div>
      <p className="mt-1.5 text-role-meta text-text-soft">{caption}</p>
    </div>
  );
}

/** Les appuis : petits, tabulaires, jamais en couleur sauf signal réel. */
function Sub({
  value, unit, label, tone = "neutral",
}: {
  value: number; unit?: string; label: string; tone?: "neutral" | "danger" | "success";
}) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-text";
  return (
    <div className="min-w-0">
      <p className={`text-role-card font-semibold tabular-nums ${toneClass}`}>
        <CountUp value={value} />
        {unit && <span className="ml-0.5 text-role-meta font-medium text-text-faint">{unit}</span>}
      </p>
      <p className="mt-0.5 truncate text-role-meta text-text-soft" title={label}>{label}</p>
    </div>
  );
}

/* ═════════════════════════════════ finance ═════════════════════════════════ */

export function FinanceSummary({ finance }: { finance: Signal<FinanceFacts> }) {
  return (
    <SummaryShell
      title="Finance"
      description="Recouvrement du mois en cours"
      icon={Wallet}
      href="/dashboard/reports?dept=finance"
      cta="Voir le rapport financier"
    >
      {finance.ok ? (
        <>
          {finance.value.recoveryRate !== null ? (
            <Lead
              value={finance.value.recoveryRate}
              unit="%"
              caption="Des montants facturés déjà encaissés"
              tone={finance.value.recoveryRate >= 80 ? "success" : finance.value.recoveryRate >= 50 ? "warning" : "danger"}
            />
          ) : (
            <div>
              <p className="text-[30px] font-semibold leading-none tracking-tight text-text-faint">—</p>
              <p className="mt-1.5 text-role-meta text-text-soft">Aucune facture émise</p>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-rule pt-4">
            <Sub value={finance.value.collected} unit="F" label="Encaissé" tone="success" />
            <Sub value={finance.value.outstanding} unit="F" label="Reste dû" />
            <Sub
              value={finance.value.lateFamilies}
              label="En retard"
              tone={finance.value.lateFamilies > 0 ? "danger" : "success"}
            />
          </div>
        </>
      ) : (
        <DataState
          kind="empty"
          title="Aucune facture émise"
          description={finance.reason}
          action={{ label: "Facturer", href: "/dashboard/payments" }}
        />
      )}
    </SummaryShell>
  );
}

/* ════════════════════════════════ académique ════════════════════════════════ */

export function AcademicSummary({ academic }: { academic: Signal<AcademicFacts> }) {
  return (
    <SummaryShell
      title="Performance académique"
      description={academic.ok ? academic.value.termName : "Résultats de l'établissement"}
      icon={GraduationCap}
      href="/dashboard/reports?dept=teaching"
      cta="Voir le rapport académique"
    >
      {academic.ok ? (
        <>
          <Lead
            value={academic.value.average}
            unit="%"
            caption="Moyenne générale de l'établissement"
            after={
              academic.value.delta !== null && academic.value.delta !== 0 ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-role-meta font-semibold ${
                    academic.value.delta > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  }`}
                >
                  {academic.value.delta > 0
                    ? <TrendingUp aria-hidden="true" className="h-3 w-3" />
                    : <TrendingDown aria-hidden="true" className="h-3 w-3" />}
                  {academic.value.delta > 0 ? "+" : ""}{academic.value.delta} pts
                </span>
              ) : undefined
            }
          />

          {academic.value.movements.length > 0 && (
            <ul className="mt-5 space-y-2.5 border-t border-rule pt-4">
              {academic.value.movements.map((m) => (
                /* Intitulé et écart EMPILÉS : côte à côte, l'écart portait
                   `shrink-0` et poussait le texte hors de la carte à 1024 px. */
                <li key={m.label} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-pill ${m.direction === "up" ? "bg-success" : "bg-danger"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-role-body text-text" title={m.label}>{m.label}</span>
                    <span className={`block text-role-meta font-semibold ${m.direction === "up" ? "text-success" : "text-danger"}`}>
                      {m.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <DataState
          kind="empty"
          title="Aucune note saisie"
          description={academic.reason}
          action={{ label: "Saisir", href: "/dashboard/grades" }}
        />
      )}
    </SummaryShell>
  );
}

/* ═══════════════════════════ parents & communication ═══════════════════════════ */

export function ParentsSummary({ parents }: { parents: Signal<ParentsFacts> }) {
  return (
    <SummaryShell
      title="Parents & communication"
      description="Votre lien réel avec les familles"
      icon={Users}
      href="/dashboard/communications"
      cta="Voir les communications"
    >
      {parents.ok ? (
        <>
          <Lead
            value={parents.value.reachableRate}
            unit="%"
            caption={
              parents.value.totalParents > 1
                ? `${parents.value.reachable} des ${parents.value.totalParents} familles ont un numéro`
                : `${parents.value.reachable} famille sur 1 a un numéro`
            }
            tone={parents.value.reachableRate >= 80 ? "success" : parents.value.reachableRate >= 50 ? "warning" : "danger"}
          />

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-rule pt-4">
            {parents.value.readRate !== null ? (
              <Sub value={parents.value.readRate} unit="%" label="Lus" />
            ) : (
              <div className="min-w-0">
                <p className="text-role-card font-semibold text-text-faint">—</p>
                <p className="mt-0.5 truncate text-role-meta text-text-soft">Lus</p>
              </div>
            )}
            <Sub value={parents.value.sent} label="Envoyés" />
            <Sub
              value={parents.value.inboundPending}
              label="Reçus"
              tone={parents.value.inboundPending > 0 ? "danger" : "neutral"}
            />
          </div>
        </>
      ) : (
        <DataState
          kind="empty"
          title="Aucune famille rattachée"
          description={parents.reason}
          action={{ label: "Ajouter", href: "/dashboard/team" }}
        />
      )}
    </SummaryShell>
  );
}
