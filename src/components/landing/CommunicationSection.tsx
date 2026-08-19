"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   « Envoyez sur WhatsApp, SMS et portail parent EN UN CLIC » et des accusés de lecture — aucun canal ne peut émettre (lot 17).

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { MessageSquare, Send, CheckCheck, Smartphone, Globe } from "lucide-react";

export default function CommunicationSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Visual Side */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1 relative"
          >
            <div className="absolute inset-0 bg-blue-50 transform rotate-3 rounded-[3rem] -z-10" />
            
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden relative z-10 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-lg text-slate-900">Nouvelle Annonce</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">Brouillon</span>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Destinataires</label>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 flex flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Parents 6ème</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Parents 5ème</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Message</label>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 min-h-[120px]">
                    Chers parents,<br/><br/>La réunion trimestrielle parents-professeurs se tiendra ce vendredi à 16h00. Merci de confirmer votre présence via le portail parent.
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-2 block">Canaux de diffusion</label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCheck className="h-2 w-2 text-white" />
                      </div>
                      <span className="text-xs font-medium">WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <CheckCheck className="h-2 w-2 text-white" />
                      </div>
                      <span className="text-xs font-medium">Portail</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      <div className="w-4 h-4 rounded border border-slate-300"></div>
                      <span className="text-xs font-medium text-slate-500">SMS</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <button className="text-sm font-medium text-slate-500">Annuler</button>
                <button className="bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md">
                  Envoyer <Send className="h-4 w-4" />
                </button>
              </div>

              {/* Stats Overlay */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                viewport={{ once: true }}
                className="absolute -right-6 -bottom-6 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 hidden md:block"
              >
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Statistiques d'envoi</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-8">
                    <span className="text-sm text-slate-600">Envoyés</span>
                    <span className="font-bold text-slate-900">428</span>
                  </div>
                  <div className="flex justify-between items-center gap-8">
                    <span className="text-sm text-slate-600">Reçus</span>
                    <span className="font-bold text-slate-900">417</span>
                  </div>
                  <div className="flex justify-between items-center gap-8 pt-2 border-t border-slate-100">
                    <span className="text-sm font-semibold text-slate-800">Lus</span>
                    <span className="font-bold text-green-600">389</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Text Side */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
              Chaque message important, au bon parent, au bon moment.
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Ne vous demandez plus si les parents ont bien reçu l'information. EduCom centralise votre communication scolaire et vous garantit que vos messages sont lus.
            </p>
            
            <ul className="space-y-6">
              {[
                { icon: Smartphone, title: "Diffusion multi-canaux", desc: "Envoyez sur WhatsApp, SMS et portail parent en un clic." },
                { icon: CheckCheck, title: "Accusés de lecture", desc: "Sachez exactement quel parent a lu quelle annonce." },
                { icon: Globe, title: "Messages ciblés", desc: "Communiquez avec toute l'école, une classe, ou un seul parent." }
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="mt-1 flex-shrink-0">
                    <item.icon className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{item.title}</h4>
                    <p className="text-slate-600">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
