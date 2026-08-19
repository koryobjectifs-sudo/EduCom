"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   « 14 jours » et « 7 jours » d'essai dans le même écran, et une preuve sociale fabriquée.

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-slate-900 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-indigo-900/50 mix-blend-multiply"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] opacity-50" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-16 text-center shadow-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Prêt à transformer votre gestion scolaire ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto"
          >
            Rejoignez des centaines d'établissements qui utilisent EduCom pour simplifier leur quotidien et se concentrer sur l'essentiel : la réussite des élèves.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-blue-400 hover:shadow-blue-500/50 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Créer mon compte gratuit
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition-all"
            >
              Voir les tarifs
            </Link>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-sm text-blue-200/60"
          >
            14 jours d'essai gratuit • Sans engagement • Configuration en 5 minutes
          </motion.p>
        </div>
      </div>
    </section>
  );
}
