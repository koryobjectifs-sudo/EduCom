"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ COMPOSANT DORMANT — NE PAS REMETTRE EN LIGNE EN L'ÉTAT
   ───────────────────────────────────────────────────────────────────────────
   Retiré des pages publiques au chantier PLG / addendum du 19 août 2026.

   CE QU'IL AFFIRME ET QUI EST FAUX :
   des témoignages inventés.

   Il n'est plus importé nulle part, et un contrôle de
   `scripts/verify-landing-runtime.ts` échoue si une page le réimporte. Il est
   conservé pour sa mise en page, pas pour son texte : le jour où la
   fonctionnalité existera, c'est le CONTENU qu'il faudra réécrire d'abord.
   ═══════════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

export default function Testimonials() {
  const testimonials = [
    {
      content: "EduCom a complètement transformé notre façon de gérer l'établissement. L'interface est intuitive et le gain de temps pour notre équipe administrative est inestimable.",
      author: "Marie Laurent",
      role: "Directrice, Lycée Victor Hugo",
      rating: 5,
      initials: "ML",
      color: "bg-blue-100 text-blue-700",
    },
    {
      content: "La communication avec les parents n'a jamais été aussi simple. Ils apprécient particulièrement de pouvoir suivre les résultats et les absences en temps réel.",
      author: "Thomas Dubois",
      role: "Professeur Principal",
      rating: 5,
      initials: "TD",
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      content: "Une plateforme robuste qui s'adapte parfaitement à nos besoins complexes. Le support client est réactif et toujours à l'écoute de nos suggestions.",
      author: "Sophie Martin",
      role: "Responsable Informatique",
      rating: 5,
      initials: "SM",
      color: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <section id="testimonials" className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium shadow-sm"
          >
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span>Ils nous font confiance</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Découvrez pourquoi les écoles choisissent EduCom
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative group hover:shadow-xl transition-all duration-300"
            >
              <Quote className="absolute top-8 right-8 h-10 w-10 text-slate-100 group-hover:text-blue-50 transition-colors" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              
              <p className="text-slate-700 mb-8 leading-relaxed relative z-10">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center gap-4 mt-auto">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${testimonial.color}`}>
                  {testimonial.initials}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.author}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
