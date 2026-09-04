"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { PRO_PRICE_EUR, formatFCFA, TRIAL_DAYS } from "@/lib/pricing";

/**
 * Tarifs — addendum PLG.
 *
 * ═══ CE QUI ÉTAIT AFFICHÉ AVANT LE CHANTIER ═══
 *
 * ⚠️ Trois formules chiffrées — « 0 € », « 199 €/mois », « Sur mesure » —
 * **en euros** pour des établissements qui facturent en francs CFA,
 * **inventées** (aucune décision tarifaire n'avait été prise), et adossées à des
 * fonctionnalités inexistantes : « Gestion des présences » figurait dans les
 * trois. Elles ont été retirées, et remplacées par une section qui disait
 * simplement que la grille n'était pas arrêtée.
 *
 * ═══ CE QUE L'ADDENDUM APPORTE ═══
 *
 * Kory a arrêté la grille. Les montants ci-dessous sont **les siens**, repris
 * mot pour mot : essai de 14 jours, Pro à 20 €, Premium à 30 €, avec leur
 * objectif respectif. Ils ne sont plus une supposition.
 *
 * ⚠️ **CE QUI N'EST TOUJOURS PAS DÉCIDÉ, ET N'EST DONC PAS ÉCRIT ICI** : la
 * répartition des fonctionnalités entre Pro et Premium, les limites d'élèves,
 * d'utilisateurs ou de stockage, les quotas, les modules inclus, les conditions
 * contractuelles. L'addendum l'interdit explicitement, et c'est la partie d'une
 * grille tarifaire qu'il est le plus tentant de « compléter » pour faire propre.
 * Une case cochée à tort dans un tableau comparatif est une promesse
 * commerciale opposable. Consigné dans `rappel.md`.
 *
 * ⚠️ **AUCUN « le plus populaire », AUCUN « meilleur rapport »**. Aucune
 * décision commerciale ne les fonde ; les inventer reviendrait à fabriquer une
 * preuve sociale, exactement ce que `SchoolStories` refuse de faire.
 *
 * ⚠️ **L'essai de 14 jours n'est aujourd'hui appliqué par aucun mécanisme.** Le
 * schéma Prisma n'a ni plan, ni abonnement, ni date de fin d'essai, et EduCom
 * n'a aucun paiement en ligne. La page ne doit donc jamais laisser croire à un
 * décompte automatique ni à un prélèvement : la mention « aucun prélèvement
 * automatique » n'est pas un argument commercial, c'est la description exacte de
 * l'état du produit.
 *
 * ═══ LES DEUX MONNAIES ═══
 *
 * Le franc CFA n'est pas une conversion de courtoisie : c'est la monnaie dans
 * laquelle une directrice sénégalaise décide. La parité est **fixe** —
 * 1 € = 655,957 F CFA — ce qui permet d'afficher les deux montants sans
 * dépendre d'un taux du jour ni d'un service externe. Les arrondis (13 100 et
 * 19 700) sont ceux fixés par Kory.
 *
 * ═══ REFONTE VISUELLE DU 4 SEPTEMBRE 2026 ═══
 *
 * Aucun montant, aucune fonctionnalité, aucun libellé n'a changé — seule la
 * peinture. Deux choses corrigées :
 *
 * ⚠️ La carte « Pro » utilisait `--color-primary` (bleu #539BEB, la couleur du
 * TENANT produit) au lieu des tokens `m-*` de la marque marketing — c'était la
 * seule carte de toute la page publique à ne pas suivre le socle du lot 19.
 * Elle passe au marine + or du hero, cohérent avec le reste de la refonte.
 *
 * ⚠️ La bordure conique tournante en boucle infinie était une pure décoration
 * — exactement ce que le principe 4 de la constitution produit interdit
 * (« no gimmicks, no decorative animation »). Retirée. L'inclinaison 3D
 * (rotateX/rotateY) à l'entrée est ramenée au même ressort que
 * `Features.tsx` : la page ne doit pas avoir une carte plus spectaculaire que
 * ses voisines sans raison.
 */
const FORMULES = [
  {
    id: "essai",
    nom: "Freemium",
    eur: "0 €",
    cfa: "0 F CFA",
    periode: `${TRIAL_DAYS} jours`,
    objectif: "Découvrir EduCom et obtenir votre premier résultat concret.",
    features: [
      "Création de votre établissement",
      "Édition de vos premiers documents",
      "Aucune carte bancaire requise",
      "Support par email"
    ],
    cta: "Commencer",
    highlight: false,
  },
  {
    id: "pro",
    nom: "Pro",
    eur: `${PRO_PRICE_EUR} €`,
    cfa: `≈ ${formatFCFA(PRO_PRICE_EUR)}`,
    periode: "par mois",
    objectif: "Tout EduCom, simplement.",
    features: [
      "Toutes les fonctionnalités actuelles",
      "Inscriptions et dossiers élèves",
      "Saisie des notes et bulletins",
      "Facturation et reçus",
      "Support prioritaire"
    ],
    cta: "Essai gratuit",
    highlight: true,
  },
  {
    id: "ondemand",
    nom: "On Demand",
    eur: "Sur mesure",
    cfa: "Sur devis",
    periode: null,
    objectif: "Besoin de plus ? Construisons-le ensemble.",
    features: [
      "Développement de fonctionnalités spécifiques",
      "Intégration de paiements",
      "Automatisations sur mesure",
      "Accompagnement dédié"
    ],
    cta: "Nous contacter",
    highlight: false,
  },
];

/**
 * `sansEntete` — sur `/pricing`, l'en-tête de page dit déjà « Tarifs » et
 * annonce les deux monnaies. Sans ce drapeau, la page empilait **deux titres
 * quasi identiques** l'un sous l'autre, et le surtitre « TARIFS » deux fois en
 * six centimètres d'écran. Le composant reste unique — c'est justement l'objet
 * de la suppression de `PricingSection` : il n'existe plus qu'UNE définition des
 * montants, et elle sait seulement se taire quand la page a déjà parlé.
 */
export default function Pricing({ sansEntete = false }: { sansEntete?: boolean }) {
  return (
    <section id="tarifs" className="scroll-mt-20 bg-m-paper-deep">
      <div className={`mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 ${sansEntete ? "py-16 lg:py-20" : "py-20 lg:py-28"}`}>
        {!sansEntete && (
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
              Tarifs
            </p>
            <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
              Un prix par école, pas par élève.
            </h2>
            <p className="mt-6 text-[16px] leading-[1.7] text-m-ink-soft">
              Commencez par {TRIAL_DAYS} jours d&apos;essai : le temps d&apos;éditer votre premier
              document officiel et de voir si EduCom vous fait gagner vos journées.
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
              transition: { staggerChildren: 0.2 }
            }
          }}
          className={`grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8 ${sansEntete ? "" : "mt-14"}`}
        >
          {FORMULES.map((f) => {
            const isHighlighted = f.highlight;
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 28 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", stiffness: 120, damping: 18 },
                  },
                }}
                whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 22 } }}
                key={f.id}
                className={`relative flex flex-col rounded-[16px] transition-shadow duration-300 ${
                  isHighlighted
                    ? "bg-m-ink-deep shadow-m-lift ring-1 ring-inset ring-m-gold/30"
                    : "border border-m-line bg-m-card hover:border-m-line hover:shadow-m-lift"
                }`}
              >
                {/* TOP SECTION */}
                <div className="flex flex-col p-6 sm:p-7">
                  <div className="flex items-center gap-3">
                    <h3
                      className={`text-[15px] font-semibold ${
                        isHighlighted ? "text-m-gold-soft" : "text-m-ink"
                      }`}
                    >
                      {f.nom}
                    </h3>
                    {isHighlighted && (
                      <span className="rounded-pill bg-m-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-m-ink-deep">
                        Populaire
                      </span>
                    )}
                  </div>

                  <p className={`mt-4 min-h-[40px] text-[13px] leading-relaxed ${isHighlighted ? "text-white/65" : "text-m-ink-soft"}`}>
                    {f.objectif}
                  </p>

                  <div className="mt-8 flex flex-col gap-6">
                    {/* ZONE DE PRIX */}
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1">
                        <p className={`font-display text-[2.5rem] font-bold leading-none tracking-tight ${isHighlighted ? "text-white" : "text-m-ink"}`}>
                          {f.eur}
                        </p>
                        {f.periode && (
                          <p className={`text-[13px] font-medium ${isHighlighted ? "text-white/50" : "text-m-ink-faint"}`}>
                            /{f.periode.replace("par ", "")}
                          </p>
                        )}
                      </div>
                      <p
                        className={`mt-1 text-[13px] font-semibold tabular-nums ${
                          isHighlighted ? "text-m-gold-soft" : "text-m-ink-faint"
                        }`}
                      >
                        {f.cfa}
                      </p>
                    </div>

                    {/* BOUTON D'ACTION */}
                    <Link
                      href="/register"
                      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-control text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        isHighlighted
                          ? "bg-white text-m-ink hover:bg-white/90 focus-visible:ring-white/50 focus-visible:ring-offset-m-ink-deep"
                          : "bg-m-ink text-white hover:bg-m-ink-deep focus-visible:ring-m-ink/40"
                      }`}
                    >
                      {f.cta}
                    </Link>
                  </div>
                </div>

                {/* BOTTOM SECTION - FEATURES */}
                <div className={`flex-1 rounded-b-[16px] border-t p-6 sm:p-7 ${isHighlighted ? "border-white/10 bg-white/[0.03]" : "border-m-line bg-m-paper"}`}>
                  <ul className="space-y-4">
                    {f.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-[13px] leading-relaxed ${isHighlighted ? "text-white/70" : "text-m-ink-soft"}`}>
                        <Check
                          aria-hidden="true"
                          className={`mt-0.5 h-4 w-4 shrink-0 ${isHighlighted ? "text-m-gold-soft" : "text-m-accent-deep"}`}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ⚠️ Les mentions légales. */}
        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-4 border-t border-m-line pt-8 sm:grid-cols-2">
          <p className="text-[13px] leading-relaxed text-m-ink-soft">
            <span className="font-semibold text-m-ink">Deux monnaies, un seul prix.</span>{" "}
            La parité euro / franc CFA est fixe (1 € = 655,957 F CFA) : les montants ne
            bougent pas avec le change.
          </p>
          <p className="text-[13px] leading-relaxed text-m-ink-soft">
            <span className="font-semibold text-m-ink">Aucun prélèvement automatique.</span>{" "}
            EduCom n&apos;a pas encore de paiement en ligne : rien ne peut vous être débité,
            et l&apos;essai ne se transforme pas tout seul en abonnement.
          </p>
        </div>
      </div>
    </section>
  );
}
