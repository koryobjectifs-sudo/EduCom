"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   un « pipeline visuel » d'admissions et un « suivi de lecture » : ni l'un ni l'autre n'existe.

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { 
  Users, CalendarCheck, CreditCard, FileText, 
  BookOpen, MessageSquare, UserPlus, LineChart
} from "lucide-react";

export default function FeatureGrid() {
  const features = [
    {
      title: "Gestion des élèves",
      description: "Profil complet de chaque élève, de la maternelle au lycée.",
      icon: Users,
    },
    {
      // ⚠️ Chantier PLG — « Présences » retiré : le module n'existe pas.
      title: "Centre documentaire",
      description: "Règlements, listes de fournitures et formulaires, publiés et diffusés par portée.",
      icon: CalendarCheck,
    },
    {
      title: "Paiements",
      description: "Suivi des frais scolaires, échéanciers et relances automatiques.",
      icon: CreditCard,
    },
    {
      title: "Documents",
      description: "Génération et centralisation sécurisée des documents officiels.",
      icon: FileText,
    },
    {
      title: "Bulletins",
      description: "Création, calculs automatiques et gestion des bulletins scolaires.",
      icon: BookOpen,
    },
    {
      title: "Communication",
      description: "Messages ciblés, annonces générales et suivi de lecture.",
      icon: MessageSquare,
    },
    {
      title: "Admissions",
      description: "Pipeline visuel et complet pour gérer les nouveaux candidats.",
      icon: UserPlus,
    },
    {
      title: "Analytics",
      description: "Comprendre l'activité et la santé financière de l'école.",
      icon: LineChart,
    }
  ];

  return (
    <section id="features" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-sm font-medium mb-6 shadow-sm"
          >
            Fonctionnalités
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 max-w-2xl"
          >
            Conçu pour le quotidien d'une vraie école.
          </motion.h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              className="group bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all duration-300"
            >
              <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-all duration-300">
                <feature.icon className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
