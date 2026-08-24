"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   quatre statistiques INVENTÉES (342, 284, 198, 124) présentées comme l'activité d'une école.

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { TrendingUp, Users, UserPlus, CreditCard, CalendarCheck, MessageSquare } from "lucide-react";

export default function AnalyticsSection() {
  const metrics = [
    { label: "Élèves", value: "842", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Admissions", value: "124", icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Revenus (Mensuel)", value: "14.2M", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
    // ⚠️ Chantier PLG — « Présence 94 % » retiré : chiffre inventé, pour un
    // module qui n'existe pas. Aucune valeur d'exemple ne le remplace.
    { label: "Engagement Parents", value: "78%", icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6"
          >
            Enfin une vue claire de votre école.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600"
          >
            Comprenez la santé de votre établissement en un clin d'œil sans avoir besoin d'être un expert en analyse de données.
          </motion.p>
        </div>

        {/* Dashboard Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="h-16 border-b border-slate-100 flex items-center px-8 bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">Vue d'ensemble - Année Scolaire 2025/2026</h3>
          </div>

          <div className="p-8">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
              {metrics.map((metric, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-6 w-6 rounded flex items-center justify-center ${metric.bg}`}>
                      <metric.icon className={`h-3.5 w-3.5 ${metric.color}`} />
                    </div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{metric.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Chart 1: Revenue */}
              <div className="border border-slate-100 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-semibold text-slate-800 text-sm">Évolution des encaissements</h4>
                  <div className="text-xs text-emerald-600 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-1 rounded">
                    <TrendingUp className="h-3 w-3" /> +12%
                  </div>
                </div>
                <div className="h-40 flex items-end gap-3 justify-between">
                  {[40, 55, 45, 70, 65, 80, 75, 90, 85, 100].map((h, i) => (
                    <div key={i} className="w-full bg-blue-50 rounded-t-sm relative group">
                      <div 
                        className="absolute bottom-0 inset-x-0 bg-m-primary rounded-t-sm opacity-80 group-hover:opacity-100 group-hover:bg-m-primary/90 transition-colors"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-3 px-1 uppercase tracking-wider">
                  <span>Sep</span>
                  <span>Déc</span>
                  <span>Mar</span>
                  <span>Juin</span>
                </div>
              </div>

              {/* Chart 2: Admissions Pipeline */}
              <div className="border border-slate-100 rounded-xl p-6">
                <h4 className="font-semibold text-slate-800 text-sm mb-6">Entonnoir des admissions</h4>
                <div className="space-y-4">
                  {[
                    { label: "Demandes reçues", value: 342, percentage: 100, color: "bg-slate-200" },
                    { label: "Dossiers complets", value: 284, percentage: 83, color: "bg-blue-200" },
                    { label: "Tests passés", value: 198, percentage: 57, color: "bg-blue-400" },
                    { label: "Inscrits (Payés)", value: 124, percentage: 36, color: "bg-primary" },
                  ].map((stage, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                        <span>{stage.label}</span>
                        <span className="text-slate-900 font-bold">{stage.value}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${stage.color}`} 
                          style={{ width: `${stage.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
