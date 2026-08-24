import Link from "next/link";
import { Inbox, FileStack } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentsTabs } from "../DocumentsTabs";
import RequestDocumentDialog from "../RequestDocumentDialog";

export const metadata = {
  title: "Modèles de l'école | EduCom",
};

export default async function TemplatesHub() {
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  const canValidate = hasAccess(role, "/dashboard/documents/validation");

  const requests = await prisma.documentRequest.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const pending = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Documents" }]}
        title="Documents"
        description="Besoins de documents personnalisés enregistrés par votre établissement"
        actions={
          <Link
            href="/dashboard/documents/drafts"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            <FileStack aria-hidden="true" className="h-4 w-4" />
            Brouillons
          </Link>
        }
      />

      <DocumentsTabs canValidate={canValidate} />

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Modèles demandés</h2>
            <p className="text-[13px] text-gray-500 mt-1">Suivez l'état de vos demandes de nouveaux modèles</p>
          </div>
          <div className="flex items-center gap-3">
            {pending > 0 && (
              <Badge variant="warning">{pending} en attente</Badge>
            )}
            <RequestDocumentDialog />
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Inbox}
              title="Aucun modèle demandé"
              description="Si un document vous manque pour votre établissement, enregistrez le besoin — il restera visible ici en attente de création par notre équipe."
              size="sm"
            />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-gray-900 truncate">{r.name}</p>
                  {r.description && (
                    <p className="mt-1 text-[13px] text-gray-600 line-clamp-2">{r.description}</p>
                  )}
                  <p className="mt-2 text-[12px] font-medium text-gray-400">
                    Demandé le {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                
                <Badge
                  variant={
                    r.status === "COMPLETED" ? "success" : r.status === "IN_PROGRESS" ? "info" : "warning"
                  }
                  className="shrink-0 mt-3 sm:mt-0"
                >
                  {r.status === "COMPLETED" ? "Disponible" : r.status === "IN_PROGRESS" ? "En cours de création" : "En attente"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
