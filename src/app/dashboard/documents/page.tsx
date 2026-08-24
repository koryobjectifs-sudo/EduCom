import Link from "next/link";
import { ArrowRight, FileStack } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { DOCUMENT_KINDS, documentHref } from "@/lib/documents";
import { PageHeader } from "@/components/ui/PageHeader";
import { DocumentsTabs } from "./DocumentsTabs";

export default async function DocumentsHub() {
  const { user } = await requireSchoolContext();
  const role = user.role as RoleType;

  const canValidate = hasAccess(role, "/dashboard/documents/validation");
  const visibleKinds = DOCUMENT_KINDS.filter((d) => hasAccess(role, documentHref(d)));

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Documents" }]}
        title="Documents"
        description={`${visibleKinds.length} modèle${visibleKinds.length > 1 ? "s" : ""} disponible${visibleKinds.length > 1 ? "s" : ""} · vos informations d'établissement, cachet et signature sont insérés automatiquement`}
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
        <ul className="divide-y divide-gray-100">
          {visibleKinds.map((doc) => {
            const Icon = doc.icon;
            return (
              <li key={doc.id}>
                <Link
                  href={documentHref(doc)}
                  className="group flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50/50 text-[#539BEB] group-hover:bg-[#539BEB] group-hover:text-white transition-colors shadow-sm">
                      <Icon className="h-6 w-6" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-[15px] font-semibold text-gray-900 truncate group-hover:text-[#539BEB] transition-colors">
                          {doc.name}
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 truncate">
                          Par {doc.subject}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-500 line-clamp-1">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="shrink-0 ml-4 pl-4 flex items-center">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#539BEB] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      Créer
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="text-gray-300 group-hover:opacity-0 transition-opacity duration-300 ml-4">
                      <ArrowRight aria-hidden="true" className="h-5 w-5" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
