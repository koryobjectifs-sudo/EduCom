import Link from "next/link";
import { TrendingUp, TrendingDown, Users, DollarSign, ShieldAlert, Award, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { IndicateursCroissance } from "@/lib/calculs";
import { Bloc } from "@/components/ui";

interface Props {
  croissance: IndicateursCroissance;
}

function BadgeEvolution({ taux }: { taux: number | null }) {
  if (taux === null) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10.5px] font-semibold bg-slate-100 text-slate-500">
        <Minus className="h-3 w-3" />
        <span>—</span>
      </span>
    );
  }
  const pct = Math.round(taux * 100);
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-700">
        <ArrowUpRight className="h-3 w-3" />
        <span>+{pct} %</span>
      </span>
    );
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold bg-rose-500/10 text-rose-700">
        <ArrowDownRight className="h-3 w-3" />
        <span>{pct} %</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
      <Minus className="h-3 w-3" />
      <span>0 %</span>
    </span>
  );
}

export default function IndicateursCroissanceEtChurn({ croissance }: Props) {
  const c = croissance;

  return (
    <Bloc
      titre={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Croissance (Growth Rates) & Taux de Rétention / Churn</span>
          </div>
          <span className="text-[11px] font-semibold text-text-soft">
            Pilotage en temps réel
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {/* Daily Growth */}
        <div className="rounded-xl border border-rule bg-sunk/40 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-text-soft">Daily Growth</span>
            <BadgeEvolution taux={c.dailyGrowthRate} />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold tracking-tight text-text">
              {c.inscriptionsAujourdhui}{" "}
              <span className="text-[11px] font-normal text-text-faint">aujourd'hui</span>
            </div>
            <div className="text-[10px] text-text-faint mt-0.5">
              vs {c.inscriptionsHier} hier
            </div>
          </div>
        </div>

        {/* Weekly Growth */}
        <div className="rounded-xl border border-rule bg-sunk/40 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-text-soft">Weekly Growth</span>
            <BadgeEvolution taux={c.weeklyGrowthRate} />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold tracking-tight text-text">
              {c.inscriptions7j}{" "}
              <span className="text-[11px] font-normal text-text-faint">sur 7j</span>
            </div>
            <div className="text-[10px] text-text-faint mt-0.5">
              vs {c.inscriptions7jPrecedents} les 7j préc.
            </div>
          </div>
        </div>

        {/* Monthly Growth */}
        <div className="rounded-xl border border-rule bg-sunk/40 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-text-soft">Monthly Growth</span>
            <BadgeEvolution taux={c.monthlyGrowthRate} />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold tracking-tight text-text">
              {c.inscriptions30j}{" "}
              <span className="text-[11px] font-normal text-text-faint">sur 30j</span>
            </div>
            <div className="text-[10px] text-text-faint mt-0.5">
              vs {c.inscriptions30jPrecedents} les 30j préc.
            </div>
          </div>
        </div>

        {/* MRR Growth */}
        <div className="rounded-xl border border-rule bg-sunk/40 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-text-soft">MRR Growth</span>
            <BadgeEvolution taux={c.mrrGrowthRate} />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold tracking-tight text-emerald-700">
              {c.encaisseMoisActuel > 0
                ? `${Math.round(c.encaisseMoisActuel / 1000)}k`
                : "0"}{" "}
              <span className="text-[10.5px] font-normal text-text-faint">F CFA</span>
            </div>
            <div className="text-[10px] text-text-faint mt-0.5">
              ce mois vs mois M-1
            </div>
          </div>
        </div>

        {/* Churn Rate (Taux de perte payant) */}
        <div className="rounded-xl border border-rose-200/60 bg-rose-50/30 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-rose-800">Taux de Perte (Churn)</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold tracking-tight text-rose-700">
              {c.tauxChurn !== null ? `${Math.round(c.tauxChurn * 100)} %` : "0 %"}
            </div>
            <div className="text-[10px] text-rose-600/80 mt-0.5">
              clients payants désabonnés
            </div>
          </div>
        </div>

        {/* Retention Rate */}
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-emerald-800">Taux Rétention</span>
            <Award className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold tracking-tight text-emerald-700">
              {c.tauxRetention !== null ? `${Math.round(c.tauxRetention * 100)} %` : "100 %"}
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">
              clients actifs conservés
            </div>
          </div>
        </div>

        {/* Perte Essais */}
        <div className="rounded-xl border border-rule bg-sunk/40 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-text-soft">Perte Essais</span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold tracking-tight text-text">
              {c.tauxPerteEssais !== null ? `${Math.round(c.tauxPerteEssais * 100)} %` : "0 %"}
            </div>
            <div className="text-[10px] text-text-faint mt-0.5">
              essais expirés sans paiement
            </div>
          </div>
        </div>

        {/* Taux d'activation */}
        <div className="rounded-xl border border-rule bg-sunk/40 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-text-soft">Taux Activation</span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold tracking-tight text-text">
              {c.tauxActivation !== null ? `${Math.round(c.tauxActivation * 100)} %` : "0 %"}
            </div>
            <div className="text-[10px] text-text-faint mt-0.5">
              écoles avec ≥ 1 élève
            </div>
          </div>
        </div>
      </div>
    </Bloc>
  );
}
