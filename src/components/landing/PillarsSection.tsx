"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   deux maquettes de modules absents (Pipeline Admissions, application EduCom Parents) avec des noms d'élèves inventés.

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { ClipboardList, Layout, Smartphone, Check } from "lucide-react";

export default function PillarsSection() {
  return (
    <section id="solutions" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-sm font-medium mb-6 shadow-sm"
          >
            Une seule plateforme
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900"
          >
            Tout ce dont votre école a besoin. <br className="hidden md:block" />
            <span className="text-primary">Au même endroit.</span>
          </motion.h2>
        </div>

        <div className="space-y-12">
          {/* Pillar 1: Admissions */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col lg:flex-row"
          >
            <div className="p-10 lg:p-16 lg:w-5/12 flex flex-col justify-center">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">Admissions & Inscriptions</h3>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Transformez vos inscriptions en ligne et suivez chaque candidature jusqu'à l'inscription.
              </p>
              <ul className="space-y-4">
                {["Formulaire d'inscription en ligne", "Gestion des candidats", "Suivi des dossiers", "Attribution aux classes"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-7/12 bg-slate-100 p-8 lg:p-12 flex items-center justify-center relative overflow-hidden">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-10 translate-x-4 lg:translate-x-12">
                <div className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-4">
                  <div className="font-semibold text-sm text-slate-800">Pipeline Admissions</div>
                </div>
                <div className="p-6 flex gap-4 overflow-hidden">
                  <div className="w-1/3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 mb-3">Nouveau (12)</div>
                    <div className="bg-white p-3 rounded shadow-sm border border-slate-100 mb-2">
                      <div className="font-semibold text-sm">Amadou Diallo</div>
                      <div className="text-xs text-slate-400">6ème</div>
                    </div>
                    <div className="bg-white p-3 rounded shadow-sm border border-slate-100 opacity-50">
                      <div className="h-3 w-20 bg-slate-200 rounded mb-1"></div>
                      <div className="h-2 w-12 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                  <div className="w-1/3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 mb-3">Test prévu (4)</div>
                    <div className="bg-white p-3 rounded shadow-sm border border-amber-200 bg-amber-50 mb-2">
                      <div className="font-semibold text-sm">Fatou Sow</div>
                      <div className="text-xs text-amber-600">Aujourd'hui, 14:00</div>
                    </div>
                  </div>
                  <div className="w-1/3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 mb-3">Accepté (28)</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pillar 2: School Operations */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col lg:flex-row-reverse"
          >
            <div className="p-10 lg:p-16 lg:w-5/12 flex flex-col justify-center">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-6">
                <Layout className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">Opérations scolaires</h3>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Centralisez les élèves, les présences, les documents, les paiements et le calendrier de l'école.
              </p>
              <ul className="space-y-4">
                {["Base élèves centralisée", "Suivi des présences", "Facturation & Paiements", "Génération de bulletins"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-7/12 bg-slate-100 p-8 lg:p-12 flex items-center justify-center relative overflow-hidden">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-10 -translate-x-4 lg:-translate-x-12">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-800">Facturation Mars 2026</h4>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">82% Recouvré</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { n: "Famille Diop", s: "Payé", c: "text-green-600 bg-green-50", v: "150,000 FCFA" },
                      { n: "Famille Ndiaye", s: "En attente", c: "text-amber-600 bg-amber-50", v: "75,000 FCFA" },
                      { n: "Famille Fall", s: "En retard", c: "text-red-600 bg-red-50", v: "150,000 FCFA" }
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                        <div>
                          <div className="font-semibold text-sm">{row.n}</div>
                          <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${row.c}`}>{row.s}</div>
                        </div>
                        <div className="font-bold text-sm text-slate-700">{row.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pillar 3: Parent Engagement */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col lg:flex-row"
          >
            <div className="p-10 lg:p-16 lg:w-5/12 flex flex-col justify-center">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-6">
                <Smartphone className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">Parents toujours connectés</h3>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Communiquez avec les parents au bon moment et mesurez leur engagement grâce au portail dédié.
              </p>
              <ul className="space-y-4">
                {["Portail parent mobile", "Annonces & SMS", "Accusés de lecture", "Paiements en ligne"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-7/12 bg-slate-100 p-8 lg:p-12 flex items-center justify-center relative overflow-hidden">
              <div className="w-[280px] h-[580px] bg-white rounded-[2.5rem] shadow-2xl border-[8px] border-slate-900 overflow-hidden relative z-10">
                <div className="h-16 bg-primary px-6 flex items-end pb-3">
                  <div className="text-white font-bold">EduCom Parents</div>
                </div>
                <div className="p-5 bg-slate-50 h-full">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4">
                    <div className="text-xs text-slate-500 mb-1">Aujourd'hui</div>
                    <div className="font-bold text-slate-800 text-sm mb-2">Bulletin de notes disponible</div>
                    <p className="text-xs text-slate-600">Le bulletin du 2ème trimestre de Mariama est maintenant disponible en téléchargement.</p>
                    <button className="mt-3 text-xs bg-primary text-white px-3 py-1.5 rounded-md font-medium">Voir le bulletin</button>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Hier</div>
                    <div className="font-bold text-slate-800 text-sm mb-2">Rappel de paiement</div>
                    <p className="text-xs text-slate-600">La mensualité d'avril arrive à échéance dans 5 jours.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
