"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   un suivi des ABSENCES et des « alertes instantanées » : aucune donnée de présence au schéma, aucune notification sortante.

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { CheckCircle2, FileText, MessageCircle, Bell } from "lucide-react";

export default function ParentExperience() {
  return (
    <section className="py-32 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">
              Une meilleure expérience pour les parents.
            </h2>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              Parce qu'une école moderne ne se limite pas à son administration. Offrez aux parents une application claire pour suivre la scolarité de leurs enfants en temps réel.
            </p>
            
            <div className="space-y-6">
              {[
                { title: "Tout au même endroit", desc: "Bulletins, absences, paiements et messages." },
                { title: "Notifications push", desc: "Alertes instantanées pour les événements importants." },
                { title: "Paiements simplifiés", desc: "Consultation des échéances et historique des reçus." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{item.title}</h4>
                    <p className="text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Visual Mobile Mockup */}
          <div className="relative h-[650px] w-full flex items-center justify-center">
            {/* Floating cards */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              className="absolute top-20 left-0 lg:-left-12 z-20 bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-sm font-bold text-slate-800">Paiement confirmé ✓</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              viewport={{ once: true }}
              className="absolute top-1/2 -right-4 lg:-right-16 z-20 bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Bulletin disponible</div>
                <div className="text-xs text-slate-500">Trimestre 2</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              viewport={{ once: true }}
              className="absolute bottom-32 left-4 lg:-left-8 z-20 bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Nouveau message</div>
                <div className="text-xs text-slate-500">De : Prof. Dubois</div>
              </div>
            </motion.div>

            {/* Mobile Device */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, type: "spring" }}
              className="w-[300px] h-[600px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl border border-slate-200 relative z-10"
            >
              {/* Screen */}
              <div className="w-full h-full bg-slate-50 rounded-[2.25rem] overflow-hidden relative">
                {/* Notch */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-30">
                  <div className="w-32 h-6 bg-slate-900 rounded-b-2xl"></div>
                </div>
                
                {/* App Content */}
                <div className="h-full flex flex-col pt-12 pb-6 px-5 relative">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="text-xs text-slate-500">Mardi 15 Avril</div>
                      <h3 className="text-xl font-bold text-slate-900">Bonjour, Mariama 👋</h3>
                    </div>
                    <div className="h-10 w-10 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center relative">
                      <Bell className="h-5 w-5 text-slate-600" />
                      <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-primary to-blue-700 p-5 rounded-2xl text-white shadow-md">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold">À payer</span>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Mensualité</span>
                      </div>
                      <div className="text-3xl font-bold mb-1">75,000 FCFA</div>
                      <div className="text-sm text-blue-100 mb-4">Échéance le 30 Avril</div>
                      <button className="w-full bg-white text-primary text-sm font-bold py-2 rounded-lg">Payer maintenant</button>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 text-sm">Mes enfants</h4>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="h-12 w-12 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-slate-400 font-bold">
                          F
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900">Fatou Diop</div>
                          <div className="text-xs text-slate-500">6ème B • Présente</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                        <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">Bulletins</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                        <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">Messages</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
