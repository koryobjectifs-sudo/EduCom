"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   un avant/après illustré par des fonctionnalités qui n'existent pas toutes.

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { FileSpreadsheet, MessageCircle, FileText, PhoneCall, ArrowRight, Layers } from "lucide-react";

export default function ChaosToControl() {
  return (
    <section className="py-32 bg-slate-900 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Moins de tâches administratives. <br />
            <span className="text-blue-400">Plus de temps pour votre école.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-300"
          >
            EduCom transforme la complexité quotidienne en une expérience simple, organisée et centralisée.
          </motion.p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-8">
          {/* Chaos Side */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative w-full max-w-md h-[400px] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-slate-800/50 rounded-3xl border border-slate-700 backdrop-blur-sm" />
            
            {/* Floating elements representing chaos */}
            <motion.div 
              animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 left-10 bg-white p-4 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 rotate-[-5deg]"
            >
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
              <div className="w-24 h-2 bg-slate-200 rounded" />
            </motion.div>

            <motion.div 
              animate={{ y: [0, 15, 0], rotate: [2, -2, 2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-20 left-12 bg-white p-4 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 rotate-[8deg]"
            >
              <MessageCircle className="h-6 w-6 text-green-500" />
              <div className="w-32 h-2 bg-slate-200 rounded" />
            </motion.div>

            <motion.div 
              animate={{ y: [0, -15, 0], rotate: [-1, 4, -1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute top-24 right-8 bg-white p-4 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-2 rotate-[12deg]"
            >
              <FileText className="h-6 w-6 text-slate-500" />
              <div className="w-16 h-2 bg-slate-200 rounded" />
              <div className="w-20 h-2 bg-slate-200 rounded" />
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="absolute bottom-12 right-16 bg-white p-3 rounded-full shadow-lg border border-slate-200 flex items-center justify-center rotate-[-15deg]"
            >
              <PhoneCall className="h-6 w-6 text-red-500" />
            </motion.div>
            
            <div className="relative z-10 text-slate-400 font-medium text-lg text-center px-6">
              Outils dispersés, perte d'informations, suivi manuel difficile.
            </div>
          </motion.div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center justify-center w-24">
            <motion.div
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight className="h-10 w-10 text-blue-500 opacity-50" />
            </motion.div>
          </div>

          {/* Control Side */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative w-full max-w-md h-[400px] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-800 rounded-3xl border border-blue-600/50 shadow-2xl shadow-blue-900/50" />
            
            <div className="relative z-10 w-3/4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 flex flex-col items-center">
              <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-black/20">
                <Layers className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">EduCom</h3>
              <p className="text-blue-100 text-center text-sm">
                Toutes vos opérations, admissions, et communications centralisées au même endroit.
              </p>
              
              <div className="w-full mt-6 space-y-2">
                <div className="h-8 w-full bg-white/10 rounded border border-white/5 flex items-center px-3">
                  <div className="h-2 w-1/3 bg-white/30 rounded" />
                </div>
                <div className="h-8 w-full bg-white/10 rounded border border-white/5 flex items-center px-3">
                  <div className="h-2 w-1/2 bg-white/30 rounded" />
                </div>
                <div className="h-8 w-full bg-white/10 rounded border border-white/5 flex items-center px-3">
                  <div className="h-2 w-2/5 bg-white/30 rounded" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
