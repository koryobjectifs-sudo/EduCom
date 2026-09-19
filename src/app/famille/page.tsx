import Link from "next/link";
import { requireFamilyContext } from "@/lib/familyContext";
import { Users, AlertCircle, ArrowRight, FolderOpen, Award, CheckCircle2, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dateUtils";

export default async function FamilyHomePage() {
  const { user, school, children, pendingReminders, memberships } = await requireFamilyContext();

  const firstName = user.firstName || "Parent";

  return (
    <div className="space-y-6">
      {/* 1. Salutation & Contexte École */}
      <div className="rounded-surface border border-rule bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Espace Famille
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-text mt-0.5">
              Bonjour, {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-text-soft mt-1">
              Suivi scolaire, démarches administratives et actions pour vos enfants à{" "}
              <strong className="text-text font-semibold">{school.name}</strong>.
            </p>
          </div>

          {memberships.length > 1 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-rule bg-ground/60 px-3 py-2 text-xs text-text-soft">
              <Building2 className="h-4 w-4 text-primary" />
              <span>{memberships.length} écoles rattachées</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Bloc Actions Prioritaires (Win-Mapping : L'action la plus importante d'abord) */}
      {pendingReminders.length > 0 ? (
        <section className="rounded-surface border border-danger/30 bg-danger/5 p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-danger">
                  {pendingReminders.length} action{pendingReminders.length > 1 ? "s" : ""} requise{pendingReminders.length > 1 ? "s" : ""}
                </h2>
                <Link
                  href="/famille/actions"
                  className="text-xs font-semibold text-danger hover:underline inline-flex items-center gap-1"
                >
                  <span>Voir tout</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="text-xs text-text-soft mt-1">
                L'établissement a transmis des demandes prioritaires concernant les dossiers de vos enfants.
              </p>

              <div className="mt-3 space-y-2">
                {pendingReminders.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-rule bg-surface p-3 text-xs shadow-2xs"
                  >
                    <div>
                      <span className="font-bold text-text">{r.requirementLabel}</span>
                      <span className="text-text-muted mx-1.5">•</span>
                      <span className="text-primary font-medium">{r.studentName}</span>
                      {r.message && (
                        <p className="text-[11px] text-text-soft mt-0.5 italic">« {r.message} »</p>
                      )}
                    </div>
                    <Link
                      href={r.actionUrl || `/famille/actions`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover shrink-0"
                    >
                      <span>{r.nature === "SIGN" ? "Signer le document" : "Régulariser"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="rounded-surface border border-emerald-500/20 bg-emerald-50/50 p-3.5 sm:p-4 text-xs text-emerald-800 flex items-center gap-2.5">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>
            <strong>Dossier à jour</strong> : Aucune action administrative urgente en attente pour vos enfants dans cet établissement.
          </span>
        </div>
      )}

      {/* 3. Section "Mes Enfants" */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-base font-bold text-text">Mes enfants scolarisés</h2>
          </div>
          <Link
            href="/famille/enfants"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
          >
            <span>Voir détails</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {children.length === 0 ? (
          <div className="rounded-surface border border-dashed border-rule bg-surface p-8 text-center">
            <Users className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-semibold text-text">Aucun élève rattaché dans cet établissement</h3>
            <p className="text-xs text-text-soft mt-1 max-w-md mx-auto">
              Si votre enfant est scolarisé à {school.name}, veuillez vous rapprocher du secrétariat avec votre numéro de téléphone pour relier son dossier.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-surface border border-rule bg-surface p-4 shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-primary/40 hover:shadow-subtle"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-pill bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {child.className}
                    </span>
                    <StatusBadge domain="student" status={child.status} />
                  </div>

                  <h3 className="mt-2 text-base font-bold text-text">
                    {child.firstName} {child.lastName}
                  </h3>

                  <div className="mt-1 text-xs text-text-soft space-y-0.5">
                    {child.matricule && (
                      <p>Matricule : <span className="font-medium text-text">{child.matricule}</span></p>
                    )}
                    {child.dateOfBirth && (
                      <p>Né(e) le : <span className="font-medium text-text">{formatDate(child.dateOfBirth)}</span></p>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-rule/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/famille/enfants/${child.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>Fiche & dossier</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/dashboard/grades/bulletin?studentId=${child.id}`}
                      title="Consulter les notes et bulletins"
                      className="inline-flex items-center gap-1 rounded-control border border-rule bg-surface px-2.5 py-1 text-xs text-text-soft hover:bg-sunk hover:text-text transition-colors"
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span>Bulletins</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Raccourcis Utiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/famille/documents"
          className="group rounded-surface border border-rule bg-surface p-4 shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text group-hover:text-primary transition-colors">
                Documents & Pièces officielles
              </h4>
              <p className="text-[11px] text-text-soft">
                Certificats, reçus et pièces déposées
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/famille/actions"
          className="group rounded-surface border border-rule bg-surface p-4 shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text group-hover:text-primary transition-colors">
                Suivi des démarches
              </h4>
              <p className="text-[11px] text-text-soft">
                Historique des signatures et vérifications
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
  );
}
