import Link from "next/link";
import { GraduationCap, Users, FileText, ArrowRight, Award } from "lucide-react";
import { requireFamilyContext } from "@/lib/familyContext";
import { annoncerDistributionsEchues, bulletinsDistribuesEleve } from "@/lib/bulletinsParents";
import { EmptyState } from "@/components/ui/EmptyState";
import { bilansFamille } from "@/lib/bilanSemaine";
import CarteBilan, { ObservationsSemaine } from "@/components/bilan/CarteBilan";

export const metadata = {
  title: "Notes & Bulletins | Espace Famille EduCom",
  description: "Consultez les résultats, évaluations et bulletins scolaires de vos enfants",
};

export default async function FamilyGradesPage() {
  const { school, schoolId, children } = await requireFamilyContext();

  // 26 sept. 2026 — les familles ne voient QUE les bulletins distribués par
  // l'école (après validation et conseil de classe) : ni notes en cours, ni
  // bulletin provisoire. Règle : `lib/bulletinsParents.ts`.
  await annoncerDistributionsEchues(schoolId).catch(() => 0);
  // Bilans de la semaine envoyés par les enseignants (26 sept. 2026) — le plus récent est marqué « vu ».
  const { bilans, semaine: auJour } = await bilansFamille(schoolId, children.map((c) => c.id));
  const bulletins = new Map(
    await Promise.all(children.map(async (c) => [c.id, await bulletinsDistribuesEleve(schoolId, c.id)] as const)),
  );

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div className="border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Notes & Bulletins scolaires
          </h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-text-soft">
          Consultez les résultats périodiques et les bulletins officiels délivrés par {school.name}.
        </p>
      </div>

      {children.some((c) => (bilans.get(c.id) ?? []).length > 0 || (auJour.get(c.id) ?? []).length > 0) && (
        <section aria-label="Bilans de la semaine" className="space-y-4">
          <h2 className="text-base font-bold text-text">Bilan de la semaine</h2>
          {children.map((child) => {
            const liste = bilans.get(child.id) ?? [];
            const jour = auJour.get(child.id) ?? [];
            if (!liste.length && !jour.length) return null;
            const [dernier, ...anciens] = liste;
            return (
              <div key={child.id} id={`bilan-${child.id}`} className="scroll-mt-24 space-y-2">
                {jour.length > 0 && <ObservationsSemaine prenom={child.firstName} liste={jour} />}
                {dernier && <CarteBilan s={dernier.snapshot} />}
                {anciens.length > 0 && (
                  <details className="rounded-xl border border-rule bg-surface px-4 py-2">
                    <summary className="cursor-pointer text-sm font-semibold text-text-soft">
                      Semaines précédentes de {child.firstName} ({anciens.length})
                    </summary>
                    <div className="mt-3 space-y-3 pb-2">
                      {anciens.map((b) => (
                        <CarteBilan key={b.id} s={b.snapshot} compact />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </section>
      )}

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun enfant rattaché"
          description="Votre compte n'est associé à aucun élève de cet établissement. Rapprochez-vous du secrétariat pour lier vos enfants."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => {
            const distribues = bulletins.get(child.id) ?? [];

            return (
              <div
                key={child.id}
                className="rounded-surface border border-rule bg-surface p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-primary/40 hover:shadow-subtle"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {child.className}
                    </span>
                    {child.academicYear && (
                      <span className="text-[11px] font-medium text-text-soft">
                        Année {child.academicYear}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 text-lg font-bold text-text">
                    {child.firstName} {child.lastName}
                  </h2>
                  {distribues.length === 0 ? (
                    <p className="text-xs text-text-soft mt-1">
                      Aucun bulletin distribué pour l&apos;instant. Vous serez prévenu dès que l&apos;école le mettra à disposition.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {distribues.map((b) => (
                        <li key={b.termId}>
                          <Link
                            href={`/preview/report-card?studentId=${child.id}&termId=${b.termId}`}
                            className="flex items-center justify-between gap-2 rounded-control border border-rule px-3 py-2 text-sm hover:border-primary/40"
                          >
                            <span className="inline-flex items-center gap-2 font-semibold text-text">
                              <Award className="h-4 w-4 text-primary" /> {b.terme}
                            </span>
                            <span className="text-xs text-text-soft">
                              {new Date(b.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-3 border-t border-rule flex items-center justify-end gap-2">

                  <Link
                    href={`/famille/enfants/${child.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-text-soft hover:text-primary transition-colors"
                  >
                    <span>Dossier élève</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
