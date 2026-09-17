import Link from "next/link";
import {
  Inbox,
  FileStack,
  Building2,
  FileBadge,
  FileText,
  CalendarDays,
  Receipt,
  Settings,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentsTabs } from "../DocumentsTabs";
import RequestDocumentDialog from "../RequestDocumentDialog";
import { formatDate } from "@/lib/dateUtils";

export const metadata = {
  title: "Modèles & Mentions légales | EduCom",
};

export default async function TemplatesHub() {
  const { schoolId, school, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  const canValidate = hasAccess(role, "/dashboard/documents/validation");
  const canEditSettings = hasAccess(role, "/dashboard/settings");

  const requests = await prisma.documentRequest.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const pending = requests.filter((r) => r.status === "PENDING").length;

  const templatesList = [
    {
      name: "Certificat de scolarité",
      standard: "République du Sénégal · Ministère de l'Éducation Nationale",
      description: "Attestation officielle avec en-tête IA/IEF, cachet numérique et signature autorisée.",
      icon: FileBadge,
      status: "Actif",
    },
    {
      name: "Bulletin officiel trimestriel",
      standard: "Norme MEN / DEMG (Collège & Lycée)",
      description: "Grille officielle de coefficients, moyennes pondérées, appréciations et avis du conseil.",
      icon: FileText,
      status: "Actif",
    },
    {
      name: "Fiche de renseignements élève",
      standard: "Format standardisé de rentrée",
      description: "Fiche d'état civil, urgence médicale, tuteurs légaux et autorisations parentales.",
      icon: FileText,
      status: "Actif",
    },
    {
      name: "Emploi du temps de classe",
      standard: "Grille hebdomadaire standard",
      description: "Répartition hebdomadaire des matières, créneaux et enseignants affectés.",
      icon: CalendarDays,
      status: "Actif",
    },
    {
      name: "Facture & Reçu normalisé",
      standard: "Réglementation comptable scolaire",
      description: "Numérotation séquentielle, ventilation des rubriques de frais et mentions de décharge.",
      icon: Receipt,
      status: "Actif",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Documents", href: "/dashboard/documents" }, { label: "Modèles" }]}
        title="Modèles & Mentions légales"
        description="Configuration des gabarits officiels, en-têtes d'inspection et mentions légales de vos documents"
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

      {/* ── 1. En-tête et Mentions Légales de l'Établissement ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">En-tête officiel &amp; Mentions légales</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ces mentions figurent automatiquement sur tous vos certificats, bulletins et reçus.
              </p>
            </div>
          </div>

          {canEditSettings && (
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs shrink-0"
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              Modifier dans les paramètres
            </Link>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Établissement</span>
            <p className="font-bold text-slate-900 mt-1">{school?.name || "Non configuré"}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{school?.address || "Adresse non renseignée"}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Rattachement Académique</span>
            <p className="font-bold text-slate-900 mt-1">IA {school?.inspectionAcademique || "Dakar"}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">IEF {school?.inspectionIEF || "Plateau"} · {school?.regionAcademique || "Région Dakar"}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Coordonnées officielles</span>
            <p className="font-bold text-slate-900 mt-1">{school?.phone || "Téléphone non renseigné"}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{school?.email || "Email non renseigné"}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Langue &amp; Certification</span>
            <p className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Français (Officiel Sénégal)
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Cachet numérique activé</p>
          </div>
        </div>
      </section>

      {/* ── 2. Gabarits Types du Système ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-900">Gabarits normalisés en circulation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gabarits conformes aux maquettes réglementaires nationales.
          </p>
        </div>

        <ul className="divide-y divide-slate-100 text-xs">
          {templatesList.map((tpl, i) => {
            const Icon = tpl.icon;
            return (
              <li key={i} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3.5 min-w-0">
                  <span className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{tpl.name}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {tpl.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                      {tpl.standard}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {tpl.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── 3. Demandes de Nouveaux Modèles ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Modèles personnalisés demandés</h2>
            <p className="text-xs text-slate-500 mt-0.5">Suivez l&apos;état de vos demandes de gabarits spécifiques</p>
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
              title="Aucun modèle sur-mesure demandé"
              description="Si un format de document spécifique manque à votre établissement, faites-en la demande ici pour intégration par nos équipes."
              size="sm"
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/40 transition-colors text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{r.name}</p>
                  {r.description && (
                    <p className="mt-1 text-slate-600 line-clamp-2">{r.description}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Demandé le {formatDate(r.createdAt)}
                  </p>
                </div>
                
                <Badge
                  variant={
                    r.status === "COMPLETED" ? "success" : r.status === "IN_PROGRESS" ? "info" : "warning"
                  }
                  className="shrink-0 mt-2 sm:mt-0"
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
