"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  STANDARD_PRICE_XOF,
  PREMIUM_PRICE_XOF,
  STANDARD_PRICE_EUR,
  PREMIUM_PRICE_EUR,
  formatMontantCFA,
  TRIAL_DAYS,
} from "@/lib/pricing";
import EduComWordmark from "@/components/brand/EduComWordmark";
import {
  AppleCheckIcon,
  AppleArrowRightIcon,
  AppleShieldCheckIcon,
} from "@/components/ui/apple-icons";

/**
 * Grille tarifaire EduCom — 3 formules forfaitaires par établissement.
 */
const FORMULES = [
  {
    id: "standard",
    nom: "Standard",
    badge: `Essai ${TRIAL_DAYS} jours`,
    prixPrincipal: formatMontantCFA(STANDARD_PRICE_XOF),
    equivalence: `~${STANDARD_PRICE_EUR} €`,
    periode: "par mois",
    essai: `${TRIAL_DAYS} jours d'essai gratuit`,
    reassurance: "Sans engagement",
    objectif: "Tout pour piloter la scolarité et les finances sans complication.",
    features: [
      "Bulletins officiels conformes Sénégal (calcul auto moyennes & rangs)",
      "Gestion de l'appel & registre d'assiduité en direct",
      "Facturation écolages & reçus certifiés (QR code & filigrane)",
      "Annuaire élèves, inscriptions & imports Excel en 1 clic",
      "Cockpits : Direction, Enseignant, Secrétaire, Comptable",
      "Portail Famille (consultation des notes & bulletins)",
      "Assistance & support WhatsApp inclus",
    ],
    cta: `Démarrer l'essai ${TRIAL_DAYS}j`,
    highlight: false,
  },
  {
    id: "premium",
    nom: "Premium",
    badge: "Recommandé",
    prixPrincipal: formatMontantCFA(PREMIUM_PRICE_XOF),
    equivalence: `~${PREMIUM_PRICE_EUR} €`,
    periode: "par mois",
    essai: "Tout le Standard inclus",
    reassurance: "Rentabilisé dès le 1er mois",
    objectif: "L'expérience complète : remplacez WhatsApp et connectez vos familles.",
    features: [
      "Tout ce qui est inclus dans le forfait Standard",
      "Communauté d'école & Messagerie école ↔ parents (anti-WhatsApp)",
      "Accusés de lecture obligatoires (« Lu par 95% des parents »)",
      "Sondages & formulaires avec relances automatiques",
      "Notifications Web Push directes sur smartphones & PC",
      "Cockpits « Soft Elegance » avec analytique en temps réel",
      "Attribution des capacités d'équipe (StaffGrants)",
      "Support prioritaire 7j/7 dédié à la direction",
    ],
    cta: "Choisir la formule Premium",
    highlight: true,
  },
  {
    id: "surmesure",
    nom: "Sur Demande",
    badge: "Sur mesure",
    prixPrincipal: "Sur devis",
    equivalence: "Frais dev + loyer",
    periode: "sur mesure",
    essai: "Étude & cadrage sous 24h",
    reassurance: "Développements dédiés",
    objectif: "Un besoin spécifique ou un groupe scolaire ? Sur-mesure complet.",
    features: [
      "Développement de fonctionnalités sur-mesure",
      "Adaptation exacte à vos formats de bulletins et registres",
      "Intégrations passerelles de paiement ou bancaires",
      "Pilotage multi-établissements & consolidation campus",
      "Accompagnement & formation sur site de vos équipes",
      "Développeur & interlocuteur technique dédié",
    ],
    cta: "Demander une étude",
    highlight: false,
  },
];

/**
 * `sansEntete` — sur `/pricing`, l'en-tête de page dit déjà « Tarifs ».
 */
export default function Pricing({ sansEntete = false }: { sansEntete?: boolean }) {
  return (
    <section id="tarifs" className="scroll-mt-16 border-t border-m-line-soft bg-white">
      <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${sansEntete ? "py-6 lg:py-8" : "py-8 lg:py-10"}`}>
        {!sansEntete && (
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-purple-700">
              Tarifs forfaitaires
            </p>
            <h2 className="mt-1.5 font-display text-[1.45rem] font-bold leading-[1.15] text-slate-900 sm:text-[1.85rem]">
              Un tarif fixe par école, jamais par élève.
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              {TRIAL_DAYS}&nbsp;jours d&apos;essai sans carte bancaire. Peu importe que vous ayez 50 ou 800 élèves, votre forfait ne varie pas.
            </p>
          </div>
        )}

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 }
            }
          }}
          className={`mx-auto grid max-w-6xl grid-cols-1 gap-4.5 md:grid-cols-3 ${sansEntete ? "" : "mt-6"}`}
        >
          {FORMULES.map((f) => {
            const isHighlighted = f.highlight;
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140, damping: 20 } },
                }}
                whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 22 } }}
                key={f.id}
                className={`relative flex flex-col rounded-2xl transition-all duration-300 ${
                  isHighlighted
                    ? "bg-gradient-to-b from-[#3B0764] via-[#581C87] to-[#2E0854] border border-purple-400/35 shadow-[0_16px_36px_-12px_rgba(88,28,135,0.4)] ring-1 ring-white/15"
                    : "bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300"
                }`}
              >
                {/* Badge supérieur */}
                {isHighlighted && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-purple-300/40 bg-[#7E22CE] px-3 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white shadow-xs flex items-center gap-1.5 whitespace-nowrap">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {f.badge}
                  </div>
                )}

                <div className="flex flex-col p-4.5 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-[15.5px] font-bold ${isHighlighted ? "text-white" : "text-slate-900"}`}>
                      {f.nom}
                    </h3>
                    {!isHighlighted && f.badge && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-600">
                        {f.badge}
                      </span>
                    )}
                  </div>

                  <p className={`mt-1 min-h-[30px] text-[11.5px] leading-snug line-clamp-2 ${isHighlighted ? "text-purple-100/90" : "text-slate-600"}`}>
                    {f.objectif}
                  </p>

                  <div className="mt-2.5 flex flex-col gap-2.5">
                    <div className="flex flex-col">
                      <p className={`text-[11px] font-medium ${isHighlighted ? "text-purple-200" : "text-purple-700"}`}>
                        {f.essai}
                      </p>

                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <p className={`font-display text-[1.65rem] font-bold leading-none tracking-tight ${isHighlighted ? "text-white" : "text-slate-900"}`}>
                          {f.prixPrincipal}
                        </p>
                        {f.periode && (
                          <p className={`text-[11.5px] font-medium ${isHighlighted ? "text-purple-200/80" : "text-slate-500"}`}>
                            /{f.periode.replace("par ", "")}
                          </p>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                        {f.equivalence && (
                          <span className={`font-semibold ${isHighlighted ? "text-emerald-300" : "text-slate-600"}`}>
                            {f.equivalence}
                          </span>
                        )}
                        <span className={isHighlighted ? "text-purple-200/60" : "text-slate-400"}>
                          • {f.reassurance}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={f.id === "surmesure" ? "mailto:koryobjectifs@gmail.com?subject=EduCom%20%E2%80%94%20Formule%20Sur%20Demande" : "/register"}
                      className={`group inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        isHighlighted
                          ? "bg-white text-[#581C87] hover:bg-purple-50 shadow-xs hover:shadow focus-visible:ring-white/50 focus-visible:ring-offset-[#581C87]"
                          : "bg-slate-900 text-white hover:bg-slate-800 shadow-xs hover:shadow focus-visible:ring-slate-900/40"
                      }`}
                    >
                      <span>{f.cta}</span>
                      <AppleArrowRightIcon className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>

                <div className={`flex-1 rounded-b-2xl border-t p-4 sm:p-4.5 ${isHighlighted ? "border-white/10 bg-white/[0.04]" : "border-slate-100 bg-slate-50/60"}`}>
                  <ul className="space-y-1.5">
                    {f.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-1.5 text-[11.5px] leading-tight ${isHighlighted ? "text-purple-50" : "text-slate-700"}`}>
                        <AppleCheckIcon
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isHighlighted ? "text-emerald-400" : "text-emerald-600"}`}
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

        {/* Mentions de réassurance et transparence — compact */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 pt-3 text-[11.5px] text-slate-600">
          <div className="flex items-center gap-2">
            <AppleShieldCheckIcon className="h-4 w-4 shrink-0 text-purple-700" />
            <span><strong>Tarif fixe sans surprise</strong> : Aucun surcoût au nombre d&apos;élèves ou de classes.</span>
          </div>
          <div className="flex items-center gap-2">
            <AppleCheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
            <span><strong>Zéro prélèvement automatique</strong> : Aucun abonnement ne s&apos;active seul à la fin des {TRIAL_DAYS}j.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
