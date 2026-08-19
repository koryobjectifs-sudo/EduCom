import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { allSchedules, activeSchedule, feeChangeRequests, forecast } from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { FeesClient } from "./FeesClient";

const PATH = "/dashboard/settings";

/**
 * Grille tarifaire officielle — écran de la direction. Lot 12.1.
 *
 * ⚠️ **Garde côté serveur.** `/dashboard/settings` n'est listé par aucun rôle :
 * seuls OWNER et ADMIN l'atteignent via `"*"`. C'est le même chemin que
 * `FEE_REVIEW_PATH`, donc quiconque voit cet écran peut décider — et personne
 * d'autre ne le voit. La règle est à un seul endroit.
 *
 * Le gestionnaire ne passe jamais par ici : il propose depuis l'atelier
 * financier, via `requestFeeChange()`.
 */
export default async function FeesPage() {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const ctx = { userId: user.id, schoolId, role: user.role };

  const [schedules, active, requests, fc, classes] = await Promise.all([
    allSchedules(ctx),
    activeSchedule(ctx),
    feeChangeRequests(ctx, 20),
    forecast(ctx),
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, cycle: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Réglages", href: "/dashboard/settings" },
          { label: "Grille tarifaire" },
        ]}
        title="Grille tarifaire"
        description="La grille officielle de l'établissement. Elle alimente le forecast — vous en êtes la seule source de vérité."
      />

      {schedules.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aucune grille tarifaire"
          description="Créez une grille pour l'année scolaire, ajoutez-y vos frais, puis rendez-la officielle. Tant qu'aucune grille n'est active, aucun forecast n'est calculé."
        />
      ) : null}

      <FeesClient
        schedules={schedules.map((s) => ({
          id: s.id,
          label: s.label,
          academicYear: s.academicYear,
          status: String(s.status),
          itemCount: s._count.items,
        }))}
        activeId={active?.id ?? null}
        items={(active?.items ?? []).map((i) => ({
          id: i.id,
          kind: String(i.kind),
          label: i.label,
          amount: i.amount,
          cadence: String(i.cadence),
          mandatory: i.mandatory,
          classId: i.classId,
          className: i.class?.name ?? null,
          cycle: i.cycle ? String(i.cycle) : null,
        }))}
        classes={classes.map((c) => ({ id: c.id, name: c.name, cycle: String(c.cycle) }))}
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
    </div>
  );
}
