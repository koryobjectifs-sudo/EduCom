import Link from "next/link";
import { UserPlus, FileText, School, CheckCircle2, Circle } from "lucide-react";
import type { DashboardSnapshot } from "@/lib/dashboard";

/**
 * Premiers pas — School Activation Engine
 */
export function PremiersPas({
  schoolName,
  classesCount,
  canAddStudent,
  activation,
}: {
  schoolName: string;
  classesCount: number;
  canAddStudent: boolean;
  activation: DashboardSnapshot["activation"];
}) {
  return (
    <section
      aria-labelledby="premiers-pas"
      className="rounded-surface border border-rule bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 id="premiers-pas" className="text-role-section font-semibold tracking-tight text-text">
          Votre école est prête à {activation.progress} %
        </h2>
        {activation.progress === 100 && (
          <span className="flex items-center gap-1 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Activée
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden">
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-in-out" 
          style={{ width: `${activation.progress}%` }}
        ></div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            {[
              { done: activation.steps.schoolConfigured, label: "Établissement configuré" },
              { done: activation.steps.classesCreated, label: "Classes configurées" },
              { done: activation.steps.studentsAdded, label: "Élèves ajoutés" },
              { done: activation.steps.teachersAdded, label: "Ajouter les enseignants" },
              { done: activation.steps.firstActionDone, label: "Saisir les premières notes (ou premier bulletin)" },
            ].map((step, idx) => (
              <li key={idx} className={`flex items-start gap-3 text-role-body ${step.done ? "text-text" : "text-text-soft"}`}>
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-text-faint shrink-0" />
                )}
                <span className={step.done ? "line-through opacity-70" : "font-medium"}>{step.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center border-l border-rule pl-0 md:pl-8 pt-6 md:pt-0 border-t md:border-t-0">
          {!activation.steps.studentsAdded ? (
            canAddStudent ? (
              <div className="space-y-4">
                <p className="text-role-body leading-relaxed text-text-soft">
                  Pour commencer, veuillez importer le fichier (Excel/CSV) que vous utilisez déjà pour votre école. C'est la méthode la plus rapide et facile pour démarrer.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/dashboard/students/import"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-6 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 w-full sm:w-auto"
                  >
                    <UserPlus aria-hidden="true" className="h-4 w-4" />
                    Importer mes données
                  </Link>
                  <Link
                    href="/dashboard/students/new"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-6 text-role-body font-semibold text-text hover:bg-sunk transition-colors w-full sm:w-auto"
                  >
                    Essayer avec un élève
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-role-meta leading-relaxed text-text-soft">
                L'importation des élèves relève de la direction ou du secrétariat.
              </p>
            )
          ) : !activation.steps.firstActionDone ? (
            <div className="space-y-4">
              <p className="text-role-body leading-relaxed text-text-soft">
                Vos élèves sont là ! Passez à la suite en saisissant les premières notes pour générer un bulletin, ou éditez une facture.
              </p>
              <Link
                href="/dashboard/grades"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-6 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover w-full sm:w-auto"
              >
                <FileText aria-hidden="true" className="h-4 w-4" />
                Saisir des notes
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-role-body leading-relaxed text-text-soft">
                Félicitations, votre école est maintenant active et prête à l'usage. Vous pouvez inviter le reste de votre équipe.
              </p>
              <Link
                href="/dashboard/team"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-6 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover w-full sm:w-auto"
              >
                <School aria-hidden="true" className="h-4 w-4" />
                Inviter mon équipe
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default PremiersPas;
