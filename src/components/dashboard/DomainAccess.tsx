"use client";

import Link from "next/link";
import { Users, ClipboardList, GraduationCap, CreditCard, FileText, ArrowRight, Settings } from "lucide-react";
import type { DashboardSnapshot } from "@/lib/dashboard";

export default function DomainAccess({ scope }: { scope: DashboardSnapshot["scope"] }) {
  // Respecter les permissions et scopes de l'utilisateur
  const domains = [
    {
      id: "students",
      label: "Élèves & dossiers",
      description: "Gérer les élèves, importer ou exporter des données",
      icon: Users,
      href: "/dashboard/students",
      show: scope.students,
    },
    {
      id: "attendance",
      label: "Présences",
      description: "Prendre et suivre l'assiduité de l'établissement",
      icon: ClipboardList,
      href: "/dashboard/attendance",
      show: true,
    },
    {
      id: "grades",
      label: "Notes & bulletins",
      description: "Gérer les évaluations et résultats scolaires",
      icon: GraduationCap,
      href: "/dashboard/grades",
      show: true,
    },
    {
      id: "finance",
      label: "Finance",
      description: "Suivre les paiements et gérer les tarifs",
      icon: CreditCard,
      href: "/dashboard/payments",
      show: scope.money,
    },
    {
      id: "documents",
      label: "Documents",
      description: "Gérer les documents administratifs et ressources",
      icon: FileText,
      href: "/dashboard/documents",
      show: true,
    },
    {
      id: "admin",
      label: "Administration",
      description: "Gérer l'équipe, les paramètres et la configuration",
      icon: Settings,
      href: "/dashboard/admin",
      show: scope.money,
    },
  ].filter((d) => d.show);

  return (
    <section className="mb-10" id="domain-access">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-text-faint">
        Espaces de travail
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {domains.map((domain) => (
          <Link
            key={domain.id}
            href={domain.href}
            className="group flex flex-col justify-between rounded-[16px] border border-rule/50 bg-surface p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-rule hover:shadow-md"
          >
            <div>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <domain.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-[15px] font-semibold text-text">
                {domain.label}
              </h3>
              <p className="text-[13px] leading-relaxed text-text-soft">
                {domain.description}
              </p>
            </div>
            
            <div className="mt-5 flex items-center justify-end">
              <span className="flex items-center text-[12px] font-semibold text-primary/70 transition-colors group-hover:text-primary">
                Ouvrir
                <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
