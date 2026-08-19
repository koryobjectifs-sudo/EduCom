import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath, roleLabel } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { resolvePeriod, toDateInput } from "@/lib/finance";
import { buildReport } from "@/lib/reports";
import { PeriodPicker } from "../payments/_finance/PeriodPicker";
import { SectionBlock, ComparisonNotice, GroupBlock, NotificationBanner } from "./ReportSections";

const PATH = "/dashboard/reports";

/**
 * Centre de rapports — lot 12.
 *
 * ═══ CE QUI A REMPLACÉ QUOI ═══
 *
 * L'écran précédent affichait trois cartes et deux graphiques, **identiques pour
 * tous les rôles**, dont deux chiffres faux :
 *   - « Taux de recouvrement » sommait `Invoice.totalAmount` des factures PAID,
 *     alors que deux factures à 0 en base ont pourtant encaissé 110 000 FCFA ;
 *   - « Flux de trésorerie » groupait ces mêmes factures par `Invoice.createdAt`,
 *     c'est-à-dire la date d'émission, pas la date d'encaissement.
 * Un bouton « Exporter (PDF) » sans gestionnaire complétait l'ensemble.
 *
 * Tout cela est retiré. Les montants passent désormais par `financeSnapshot()` /
 * `collectedByMethod()`, définition unique du module financier, et chaque rôle
 * reçoit les sections de son travail.
 *
 * ═══ GARDE CÔTÉ SERVEUR ═══
 *
 * `hasAccess()` est vérifié ici, pas seulement dans la barre latérale : l'URL
 * est atteignable directement. Le rôle décide ensuite **quelle vue** est
 * construite — un enseignant n'obtient aucune section financière parce que
 * `buildReport()` n'en produit pas pour lui, pas parce qu'elle serait masquée
 * à l'affichage.
 *
 * ⚠️ Aucun export n'est proposé : le dépôt n'a aucune capacité d'export
 * existante à réutiliser, et en fabriquer une pour meubler l'écran aurait été
 * la même faute que le bouton PDF mort qu'on retire.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; from?: string; to?: string; termId?: string }>;
}) {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const ctx = { userId: user.id, schoolId, role: user.role };
  const params = await searchParams;

  const { period, notice, terms } = await resolvePeriod(ctx, params);
  const report = await buildReport(ctx, period);

  // Rôle sans audience déclarée : on ne retombe pas sur une vue générique, qui
  // montrerait à quelqu'un des chiffres qui ne le concernent pas.
  if (!report) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader title="Rapports" />
        <EmptyState
          icon={BarChart3}
          title="Aucun rapport pour ce rôle"
          description={`Le rôle « ${roleLabel(user.role)} » n'a pas encore de rapport dédié.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Rapports" }]}
        title={report.title}
        description={report.description}
      />

      <PeriodPicker
        activeKind={period.kind}
        activeLabel={period.label}
        terms={terms}
        termId={params.termId}
        from={toDateInput(period.from)}
        // La borne de fin est exclue : le dernier jour affichable est `to - 1`.
        to={toDateInput(new Date(period.to.getTime() - 864e5))}
        notice={notice}
      />

      <NotificationBanner items={report.notifications} />

      <ComparisonNotice label={report.comparisonLabel} />

      {/* Résumé global — direction uniquement. */}
      {report.summary && <SectionBlock section={report.summary} comparable={report.comparable} />}

      {/*
        Lot 12.1 — un employé ne reçoit qu'un groupe, et les autres ne sont pas
        construits côté serveur : ils n'existent pas dans le DOM. Masquer en CSS
        aurait laissé les finances de l'école lisibles depuis un compte
        enseignant par un simple « afficher la source ».
      */}
      <div className="space-y-10">
        {report.groups.map((group) => (
          <GroupBlock key={group.id} group={group} comparable={report.comparable} />
        ))}
      </div>
    </div>
  );
}
