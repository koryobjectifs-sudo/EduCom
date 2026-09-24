import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFamiliesFinanceData } from "@/lib/finance/familyService";
import FamillesClient from "./FamillesClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Situation des Familles | Finance | EduCom",
  description: "Suivi des scolarités par famille, reliquats et encaissements rapides.",
};

export default async function FamillesPage() {
  const { user, schoolId, school } = await requireSchoolContext();

  // ⚠️ GARDE SERVEUR ABSOLU : Contrôle de rôle côté serveur
  if (!hasAccess(user.role, "/dashboard/payments")) {
    redirect(firstAllowedPath(user.role));
  }

  // Redirection des parents vers leur espace dédié
  if (user.role === "PARENT") {
    redirect("/dashboard/payments");
  }

  // Contexte d'acteur strictement cloisonné par schoolId
  const ctx = { userId: user.id, schoolId, role: user.role };
  const { families, summary } = await getFamiliesFinanceData(ctx);

  const canCollect = hasAccess(user.role, "/dashboard/payments/new");

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Finance", href: "/dashboard/payments" },
          { label: "Familles" },
        ]}
        title="Situation Financière des Familles"
        description="Une ligne par famille · Enfants et classes regroupés · Reliquats et encaissement direct en moins de 10 secondes."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/payments"
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-xs font-semibold text-text shadow-2xs transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Vue financière
            </Link>
          </div>
        }
      />

      <FamillesClient
        initialFamilies={families}
        summary={summary}
        canCollect={canCollect}
      />
    </div>
  );
}
