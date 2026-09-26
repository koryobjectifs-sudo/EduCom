"use client";

import Link from "next/link";
import {
  Users,
  Award,
  ArrowRight,
  Clock,
  CreditCard,
  FileText,
  CheckCircle2,
} from "lucide-react";
import type { FamilyDashboardSnapshot } from "@/lib/dashboard-family";

interface FamilySoftChildrenCardsProps {
  children: FamilyDashboardSnapshot["children"];
  className?: string;
}

export default function FamilySoftChildrenCards({
  children,
  className = "",
}: FamilySoftChildrenCardsProps) {
  return (
    <div
      className={`rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-5 ${className}`}
    >
      {/* ── EN-TÊTE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            <span>Mes Enfants Scolarisés</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Détail des résultats, assiduité et scolarité
          </p>
        </div>

        <Link
          href="/famille/enfants"
          className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors inline-flex items-center gap-1"
        >
          <span>Toutes les fiches</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── LISTE DES CARTES D'ENFANTS ── */}
      {children.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
          <Users className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aucun élève rattaché</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Si votre enfant est scolarisé dans cet établissement, rapprochez-vous du secrétariat pour lier son dossier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {children.map((child) => {
            const initials = `${child.firstName.charAt(0)}${child.lastName.charAt(0)}`.toUpperCase();
            const isFinanceClean = child.financialStatus === "PAID";

            return (
              <div
                key={child.id}
                className="group rounded-2xl border border-slate-200/70 bg-white p-4.5 shadow-2xs hover:border-violet-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between gap-3.5"
              >
                {/* Ligne 1 : Identité & Bouton Bulletin */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0 tracking-wider">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                          {child.firstName} {child.lastName}
                        </h3>
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-100/60">
                          {child.className}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {child.cycle === "MOYEN"
                            ? "Moyen"
                            : child.cycle === "SECONDAIRE"
                            ? "Secondaire"
                            : "Élémentaire"}
                        </span>
                      </div>

                      {child.matricule && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Matricule : <span className="font-medium text-slate-600">{child.matricule}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Link
                      href={`/famille/enfants/${child.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all border border-slate-200/70"
                    >
                      <span>Fiche</span>
                    </Link>

                    <Link
                      href={`/preview/report-card?studentId=${child.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-violet-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-violet-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span>Bulletin</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Ligne 2 : Chiffres clés de l'enfant (Moyenne, Assiduité, Écolage) */}
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100">
                  <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Moyenne
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {child.average !== null ? `${child.average.toFixed(1)} / 20` : "—"}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                      {child.gradesCount} note{child.gradesCount > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Assiduité
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {child.attendanceRate}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                      {child.absencesCount === 0 ? "0 absence" : `${child.absencesCount} abs.`}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Scolarité
                    </span>
                    <span
                      className={`text-sm font-bold mt-0.5 block ${
                        isFinanceClean ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {isFinanceClean ? "Réglée" : `${child.remainingAmount.toLocaleString("fr-FR")} F`}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                      {isFinanceClean ? "À jour" : child.nextDueDate ? `Échéance ${child.nextDueDate}` : "En cours"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
