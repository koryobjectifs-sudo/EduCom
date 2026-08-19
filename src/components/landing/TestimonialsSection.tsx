"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   des témoignages inventés, dont des marques de gabarit « [Nom Prénom] ».

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { MessageCircle, Play } from "lucide-react";

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-sm font-medium mb-6 shadow-sm"
          >
            Témoignages
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900"
          >
            Une école mieux organisée commence par de meilleurs outils.
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Text Testimonial 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col"
          >
            <div className="text-slate-400 mb-6">
              <MessageCircle className="h-8 w-8" />
            </div>
            <p className="text-lg text-slate-700 mb-8 flex-1 leading-relaxed">
              "[Témoignage directeur d'école : comment EduCom a simplifié la gestion quotidienne et fait gagner du temps à l'administration.]"
            </p>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 font-bold">
                ND
              </div>
              <div>
                <div className="font-bold text-slate-900">[Nom Prénom]</div>
                <div className="text-sm text-slate-500">[Directeur d'école]</div>
              </div>
            </div>
          </motion.div>

          {/* Text Testimonial 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-slate-50 rounded-3xl p-8 border border-slate-200 flex flex-col"
          >
            <div className="text-slate-400 mb-6">
              <MessageCircle className="h-8 w-8" />
            </div>
            <p className="text-lg text-slate-700 mb-8 flex-1 leading-relaxed">
              "[Témoignage sur l'amélioration de la communication avec les parents et la facilité de recouvrement des frais scolaires.]"
            </p>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 font-bold">
                FM
              </div>
              <div>
                <div className="font-bold text-slate-900">[Nom Prénom]</div>
                <div className="text-sm text-slate-500">[Fondateur]</div>
              </div>
            </div>
          </motion.div>

          {/* Video Testimonial Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900 rounded-3xl overflow-hidden relative group aspect-[4/5] md:aspect-auto flex flex-col justify-end p-8"
          >
            <div className="absolute inset-0 bg-slate-800" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10" />
            
            {/* Play Button */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
                <Play className="h-6 w-6 text-white ml-1" />
              </div>
            </div>
            
            <div className="relative z-20 mt-auto">
              <p className="text-white text-lg font-medium mb-4 leading-relaxed">
                "[Citation vidéo courte]"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-700 rounded-full border border-slate-600 flex items-center justify-center text-slate-300 text-xs font-bold">
                  PL
                </div>
                <div>
                  <div className="font-bold text-white text-sm">[Nom Prénom]</div>
                  <div className="text-xs text-slate-400">[Administrateur]</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
