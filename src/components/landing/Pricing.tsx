"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PRO_PRICE_EUR, formatFCFA, TRIAL_DAYS } from "@/lib/pricing";
import EduComWordmark from "@/components/brand/EduComWordmark";
import {
  AppleCheckIcon,
  AppleArrowRightIcon,
  AppleShieldCheckIcon,
} from "@/components/ui/apple-icons";

/**
 * Grille tarifaire EduCom — Format compact et lisible en un coup d'œil.
 */
const FORMULES = [
  {
    id: "pro",
    nom: "Pro",
    badge: "Recommandé",
    eur: `${PRO_PRICE_EUR} €`,
    cfa: `≈ ${formatFCFA(PRO_PRICE_EUR)}`,
    periode: "par mois",
    essai: `${TRIAL_DAYS} jours d'essai gratuit`,
    reassurance: "Sans engagement · Sans carte bancaire",
    objectif: "Tout pour piloter votre école dès aujourd'hui : zéro calcul manuel, zéro paperasse.",
    features: [
      "Bulletins conformes Sénégal (calcul auto moyennes & rangs)",
      "Import Excel / CSV instantané de votre annuaire",
      "Facturation des écolages & reçus de caisse en Francs CFA",
      "Certificats de scolarité & documents élèves en 1 clic",
      "Pointage de l'appel & liaison WhatsApp familles",
      "Espaces cloisonnés : Direction, Maîtres, Parents",
      "Assistance réactive & support au démarrage inclus",
    ],
    cta: "Créer mon école",
    highlight: true,
  },
  {
    id: "surmesure",
    nom: "Sur devis",
    badge: "Sur mesure",
    eur: "Sur devis",
    cfa: null,
    periode: null,
    essai: "Étude et réponse sous 24h",
    reassurance: "Développements sur-mesure",
    objectif: "Des besoins particuliers ? Développons ensemble les fonctionnalités qu'il vous faut.",
    features: [
      "Développement de fonctionnalités sur-mesure pour votre école",
      "Ajout de modules personnalisés sur demande",
      "Adaptation exacte à vos formats de bulletins et registres",
      "Intégration de passerelles de paiement (Wave, Orange Money)",
      "Pilotage multi-établissements & consolidation de campus",
      "Interlocuteur & développeur dédié pour votre école",
    ],
    cta: "Parler à un expert",
    highlight: false,
  },
];

/**
 * `sansEntete` — sur `/pricing`, l'en-tête de page dit déjà « Tarifs ».
 */
export default function Pricing({ sansEntete = false }: { sansEntete?: boolean }) {
  return (
    <section id="tarifs" className="scroll-mt-20 border-t border-m-line-soft bg-white">
      <div className={`mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 ${sansEntete ? "py-10 lg:py-14" : "py-14 lg:py-20"}`}>
        {!sansEntete && (
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-blue">
              Tarifs
            </p>
            <h2 className="mt-4 font-display text-[1.7rem] font-bold leading-[1.15] text-m-navy sm:text-[2.15rem]">
              Un prix par école, pas par élève.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
              {TRIAL_DAYS}&nbsp;jours d&apos;essai pour importer votre annuaire et juger sur pièces.
              Un tarif fixe par établissement, quel que soit le nombre d&apos;élèves.
            </p>
          </div>
        )}

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.15 }
            }
          }}
          className={`mx-auto grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2 ${sansEntete ? "" : "mt-8"}`}
        >
          {FORMULES.map((f) => {
            const isHighlighted = f.highlight;
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 18 } },
                }}
                whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 22 } }}
                key={f.id}
                className={`relative flex flex-col rounded-2xl transition-all duration-300 ${
                  isHighlighted
                    ? "bg-gradient-to-b from-[#0A2342] via-[#081D37] to-[#051326] border border-blue-400/25 shadow-[0_16px_36px_-12px_rgba(10,35,66,0.35)] ring-1 ring-white/10"
                    : "bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300"
                }`}
              >
                {/* Badge supérieur */}
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-blue-300/30 bg-[#0F2F57] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-100 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {f.badge}
                  </div>
                )}

                <div className="flex flex-col p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`text-[16px] font-bold ${isHighlighted ? "text-white" : "text-slate-900"}`}>
                      {f.nom}
                    </h3>
                    {!isHighlighted && f.badge && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        {f.badge}
                      </span>
                    )}
                  </div>

                  <p className={`mt-2 text-[12.5px] leading-relaxed ${isHighlighted ? "text-slate-300" : "text-slate-600"}`}>
                    {f.objectif}
                  </p>

                  <div className="mt-4 flex flex-col gap-3.5">
                    <div className="flex flex-col">
                      <p className={`text-[11.5px] font-medium ${isHighlighted ? "text-blue-300" : "text-blue-700"}`}>
                        {f.essai}
                      </p>

                      <div className="mt-0.5 flex items-baseline gap-1">
                        <p className={`font-display text-[2rem] font-bold leading-none tracking-tight ${isHighlighted ? "text-white" : "text-slate-900"}`}>
                          {f.eur}
                        </p>
                        {f.periode && (
                          <p className={`text-[12.5px] font-medium ${isHighlighted ? "text-slate-400" : "text-slate-500"}`}>
                            /{f.periode.replace("par ", "")}
                          </p>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5">
                        {f.cfa && (
                          <p className={`text-[12.5px] font-bold tabular-nums ${isHighlighted ? "text-emerald-400" : "text-slate-700"}`}>
                            {f.cfa}
                          </p>
                        )}
                        <span className="text-[11px] text-slate-400">
                          • {f.reassurance}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={f.id === "surmesure" ? "mailto:koryobjectifs@gmail.com?subject=EduCom%20%E2%80%94%20Demande%20de%20fonctionnalit%C3%A9s%20sur%20mesure" : "/register"}
                      className={`group inline-flex h-10.5 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        isHighlighted
                          ? "bg-white text-[#0A2342] hover:bg-slate-50 shadow-sm hover:shadow focus-visible:ring-white/50 focus-visible:ring-offset-[#0A2342]"
                          : "bg-[#0A2342] text-white hover:bg-[#133560] shadow-sm hover:shadow focus-visible:ring-[#0A2342]/40"
                      }`}
                    >
                      <span>{f.cta}</span>
                      <AppleArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>

                <div className={`flex-1 rounded-b-2xl border-t p-6 ${isHighlighted ? "border-white/10 bg-white/[0.02]" : "border-slate-100 bg-slate-50/60"}`}>
                  <ul className="space-y-2.5">
                    {f.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-2 text-[12.5px] leading-relaxed ${isHighlighted ? "text-slate-200" : "text-slate-700"}`}>
                        <AppleCheckIcon
                          className={`mt-1 h-3.5 w-3.5 shrink-0 ${isHighlighted ? "text-emerald-400" : "text-emerald-600"}`}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mentions de réassurance et transparence */}
        <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-3 border-t border-slate-200/80 pt-6 sm:grid-cols-2">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <AppleShieldCheckIcon className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-slate-900">
                Deux monnaies, un seul prix garanti
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">
                La parité euro / franc CFA est fixe (1 € = 655,957 F CFA). Vos montants ne changent jamais avec les fluctuations du cours.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <AppleCheckIcon className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-slate-900">
                Zéro prélèvement automatique masqué
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">
                <EduComWordmark /> ne prélève rien à votre insu. Aucun abonnement ne s&apos;active automatiquement à la fin des {TRIAL_DAYS} jours d&apos;essai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


