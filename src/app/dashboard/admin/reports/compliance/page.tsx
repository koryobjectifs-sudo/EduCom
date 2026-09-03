import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { audienceForRole } from "@/lib/reports";
import { firstAllowedPath, roleLabel } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { documentComplianceOverview } from "@/lib/documentCompliance";
import { ComplianceClient } from "./ComplianceClient";

/**
 * Portail de conformité documentaire — Rapports › Secrétariat.
 *
 * ⚠️ **La garde n'est PAS `hasAccess("/dashboard/admin/reports/compliance")`.**
 * `/dashboard/admin/reports` est autorisé à TOUS les rôles employés — enseignant,
 * comptable, et même le parent y a son rapport familial (`ROLE_PERMISSIONS`
 * dans `src/lib/permissions.ts`). `hasAccess()` compare par préfixe : une garde
 * sur ce seul chemin aurait ouvert la liste nominative du dossier documentaire
 * de CHAQUE élève à un enseignant ou à un parent. La garde reproduit donc
 * `audienceForRole()`, la même fonction qui décide déjà quelles sections
 * `buildReport()` construit pour chaque rôle : seuls « direction » et
 * « secrétariat » atteignent ce portail.
 */
export default async function CompliancePage() {
  const { user, schoolId } = await requireSchoolContext();
  const audience = audienceForRole(user.role);
  if (audience !== "direction" && audience !== "secretariat") {
    redirect(firstAllowedPath(user.role));
  }

  const ctx = { userId: user.id, schoolId, role: user.role };
  const overview = await documentComplianceOverview(ctx);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Rapports", href: "/dashboard/admin/reports" },
          { label: "Conformité documentaire" },
        ]}
        title="Conformité documentaire"
        description="Élèves dont le dossier respecte la checklist en vigueur, par classe. Un élève sans checklist applicable n'entre dans aucun taux."
      />

      {overview.configured.length === 0 && overview.unconfigured.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucun élève"
          description={`Rien à afficher pour le rôle « ${roleLabel(user.role)} ».`}
        />
      ) : (
        <ComplianceClient overview={overview} />
      )}
    </div>
  );
}
