import Link from "next/link";
import { requireSchoolContext } from "@/lib/documentContext";
import { Settings, Briefcase, GraduationCap, FileSignature, CircleDollarSign, BarChart3, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AdminHubPage() {
  await requireSchoolContext(); // Will protect the route via standard context check, although navigation filters it anyway.

  const adminSections = [
    {
      id: "settings",
      label: "Paramètres de l'établissement",
      description: "Nom, logo, cachet, adresse et coordonnées officielles",
      icon: Settings,
      href: "/dashboard/settings",
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
    {
      id: "team",
      label: "Équipe",
      description: "Gérer les accès, inviter des collaborateurs et professeurs",
      icon: Briefcase,
      href: "/dashboard/team",
      color: "text-blue-700",
      bg: "bg-blue-100",
    },
    {
      id: "pedagogy",
      label: "Configuration pédagogique",
      description: "Trimestres, classes, coefficients et système d'évaluation",
      icon: GraduationCap,
      href: "/dashboard/settings/pedagogie",
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    },
    {
      id: "fees",
      label: "Configuration financière",
      description: "Grille tarifaire, frais d'inscription et scolarité",
      icon: CircleDollarSign,
      href: "/dashboard/settings/fees",
      color: "text-amber-700",
      bg: "bg-amber-100",
    },
    {
      id: "documents",
      label: "Modèles de documents",
      description: "Gérer les en-têtes et textes légaux des documents",
      icon: FileSignature,
      href: "/dashboard/settings/documents",
      color: "text-purple-700",
      bg: "bg-purple-100",
    },
    {
      id: "reports",
      label: "Rapports globaux",
      description: "Statistiques, analyses et vues d'ensemble de l'école",
      icon: BarChart3,
      href: "/dashboard/admin/reports",
      color: "text-indigo-700",
      bg: "bg-indigo-100",
    }
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Administration" }]}
        title="Administration"
        description="Hub de contrôle global de votre établissement"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {adminSections.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="group relative rounded-2xl border border-rule/50 bg-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-rule hover:shadow-md flex flex-col justify-between h-full"
          >
            <div>
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${section.bg} ${section.color}`}>
                <section.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-text">
                {section.label}
              </h3>
              <p className="text-sm leading-relaxed text-text-soft">
                {section.description}
              </p>
            </div>
            
            <div className="mt-6 flex items-center justify-end">
              <span className="flex items-center text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
                Accéder
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
