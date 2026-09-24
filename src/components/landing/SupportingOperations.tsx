import { FileSpreadsheet, UserCheck, MessageCircle, ClipboardList, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const OPERATIONS = [
  {
    titre: "Annuaire numérique & Import immédiat",
    tag: "Import Excel / CSV",
    promesse: "Démarrez avec ce que vous avez déjà.",
    detail:
      "Vos listes d'élèves existent déjà dans des classeurs Excel ? Importez-les directement en deux minutes. EduCom structure vos classes et vos dossiers sans vous forcer à repartir de zéro.",
    icon: FileSpreadsheet,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    titre: "Pointage des Présences",
    tag: "Élèves & Équipe",
    promesse: "L'appel en classe en 30 secondes.",
    detail:
      "Saisie rapide de l'assiduité par les enseignants depuis leur smartphone ou ordinateur. La direction visualise les absences du jour en direct, sans attendre les cahiers du soir.",
    icon: UserCheck,
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    titre: "Liaison Famille & WhatsApp",
    tag: "Sans mot de passe",
    promesse: "Le contact direct au bon moment.",
    detail:
      "Transmettez alertes d'absence, relances de paiement et documents directement sur WhatsApp. Les familles accèdent aux informations essentielles de leurs enfants sans barrière technique.",
    icon: MessageCircle,
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    titre: "Sondages & Enquêtes Scolaires",
    tag: "Formulaires en ligne",
    promesse: "Collectez les avis sans papier.",
    detail:
      "Créez des questionnaires en quelques clics pour consulter les parents d'élèves ou l'équipe pédagogique. Les réponses sont regroupées et analysées automatiquement.",
    icon: ClipboardList,
    color: "text-purple-700 bg-purple-50 border-purple-200",
  },
] as const;

export default function SupportingOperations() {
  return (
    <section id="operations" className="scroll-mt-20 bg-m-paper py-14 sm:py-16 lg:py-20 border-t border-m-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Opérations quotidiennes
          </p>
          <h2 className="mt-4 font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
            Tout ce qui fait tourner votre école au quotidien.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
            En plus des bulletins et de la facturation, EduCom réunit les opérations
            administratives que votre équipe gère chaque semaine.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {OPERATIONS.map((op) => (
            <div
              key={op.titre}
              className="flex flex-col justify-between rounded-[18px] border border-m-line bg-m-card p-6 sm:p-7 shadow-xs transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${op.color}`}>
                    <op.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="rounded-full border border-m-line bg-m-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-m-ink-soft">
                    {op.tag}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-[17px] font-semibold text-m-ink">
                  {op.titre}
                </h3>
                <p className="mt-1.5 text-[14px] font-medium text-m-accent-deep">
                  {op.promesse}
                </p>
                <p className="mt-3 text-[14px] leading-[1.65] text-m-ink-soft">
                  {op.detail}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-m-line-soft">
                <Link
                  href="#demo"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-m-ink hover:text-m-accent-deep transition-colors"
                >
                  Voir en démo
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
