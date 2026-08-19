import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, ArrowLeft } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { activeSchedule, feeChangeRequests, forecast } from "@/lib/fees";
import { TarifsClient } from "./TarifsClient";

const PATH = "/dashboard/payments/tarifs";

/**
 * Grille tarifaire — vue du gestionnaire. Lot 12.2.
 *
 * ═══ LECTURE SEULE, PAR CONSTRUCTION ═══
 *
 * Cet écran n'expose **aucune** action d'écriture sur `FeeSchedule` /`FeeItem` :
 * il n'importe que `requestFeeChange()`. Le gestionnaire consulte le tarif
 * officiel et propose ; la direction tranche depuis `/dashboard/settings/fees`.
 *
 * Ce n'est pas une convention d'affichage : les actions d'écriture exigent
 * `FEE_REVIEW_PATH` (`/dashboard/settings`), que l'ACCOUNTANT n'a pas. Même s'il
 * appelait `upsertFeeItem()` directement, il serait refusé côté serveur.
 *
 * ⚠️ `PARENT` possède `/dashboard/payments` et héritait donc de ce chemin par
 * préfixe. Le refus est déclaré dans `ROLE_DENIALS` et appliqué ici.
 */
export default async function TarifsPage() {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const ctx = { userId: user.id, schoolId, role: user.role };
  const [schedule, requests, fc] = await Promise.all([
    activeSchedule(ctx),
    feeChangeRequests(ctx, 20),
    forecast(ctx),
  ]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Paiements", href: "/dashboard/payments" },
          { label: "Grille tarifaire" },
        ]}
        title="Grille tarifaire officielle"
        description="Définie par la direction. Vous ne la modifiez pas directement — vous pouvez demander une modification motivée."
        actions={
          <Link
            href="/dashboard/payments"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Paiements
          </Link>
        }
      />

      {!schedule ? (
        // PARTIE 3 — aucune grille : on le DIT, on n'invente aucun montant et on
        // ne calcule aucun forecast.
        <EmptyState
          icon={Wallet}
          title="Configuration financière incomplète"
          description="Aucune grille tarifaire officielle n'est active pour cet établissement. Tant qu'elle n'est pas définie par la direction, aucun forecast ne peut être calculé — aucun montant n'est supposé."
        />
      ) : (
        <TarifsClient
          scheduleLabel={schedule.label}
          academicYear={schedule.academicYear}
          items={schedule.items.map((i) => ({
            id: i.id,
            kind: String(i.kind),
            label: i.label,
            amount: i.amount,
            cadence: String(i.cadence),
            mandatory: i.mandatory,
            className: i.class?.name ?? null,
            cycle: i.cycle ? String(i.cycle) : null,
          }))}
          requests={requests.map((r) => ({
            id: r.id,
            status: String(r.status),
            reason: r.reason,
            currentAmount: r.currentAmount,
            proposedAmount: r.proposedAmount,
            itemLabel: r.feeItem.label,
            className: r.feeItem.class?.name ?? null,
            decisionReason: r.decisionReason,
          }))}
          forecastTotal={fc?.total ?? null}
          forecastStudents={fc?.studentsCovered ?? 0}
          uncovered={fc?.studentsUncovered ?? 0}
        />
      )}
    </div>
  );
}
