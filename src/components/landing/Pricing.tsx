"use client";

import Link from "next/link";
import { Check } from "lucide-react";
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
 * ═══ REFONTE VISUELLE DU 4 SEPTEMBRE 2026 (troisième version) ═══
 *
 * Aucun montant, aucune fonctionnalité, aucun libellé n'a changé — seule la
 * peinture. La bordure conique tournante en boucle infinie est retirée :
 * pure décoration, contraire au principe 4 de la constitution produit
 * (« no gimmicks, no decorative animation »). L'inclinaison 3D à l'entrée
 * est ramenée à un ressort simple, cohérent avec le reste de la page.
 *
 * ═══ REFONTE DU 5 SEPTEMBRE 2026 — DEUX FORMULES, PAS TROIS ═══
 *
 * Le brief de Kory demande exactement deux options : Pro (avec essai) et
 * Custom. « Freemium » (0 €) et « Pro » (9 €) fusionnent en une seule carte
 * — l'essai n'est plus une formule séparée, c'est la porte d'entrée de Pro.
 * « On Demand » devient « Sur mesure », repositionné comme le brief le
 * demande : pas un second palier générique, une réponse à un besoin
 * spécifique.
 *
 * ⚠️ **DÉCISION DE KORY (5 septembre 2026), tranchée par PLG CHECK** : le
 * brief demandait un essai de 7 jours suivi d'un « prélèvement automatique ».
 * Impossible à écrire tel quel — EduCom n'a toujours aucun paiement en ligne
 * (ni Stripe, ni mobile money), donc rien ne peut être prélevé, et
 * l'annoncer aurait été une fausse promesse commerciale. Kory a tranché :
 * durée d'essai ramenée à 7 jours comme demandé, mais la mention
 * reste « aucun prélèvement automatique » — c'est la description exacte de
 * l'état du produit, pas un argument commercial qu'on peut retoucher.
 *
 * ═══ REFONTE DU 5 SEPTEMBRE 2026 (v5) — LIBELLÉS DE CTA UNIFIÉS ═══
 *
 * « Commencer l'essai 7 jours » devient « Commencer gratuitement », identique
 * au CTA du hero et du CTA final — un seul texte de bouton sur toute la page
 * (brief §4, §9). « Nous contacter » devient « Parler à un expert » (demande
 * explicite du brief §9).
 *
 * ⚠️ Ce CTA reste un `mailto:` vers l'adresse personnelle de Kory (aucun
 * contact commercial dédié n'existe) — « expert » reste défendable puisque
 * c'est lui qui répond, mais à remplacer par une vraie adresse dès qu'elle
 * existe, comme noté plus bas.
 *
 * ═══ PASSE DU 7 SEPTEMBRE 2026 — COMPACTION ═══
 *
 * Aucun montant, aucune fonctionnalité n'a changé. Les cartes occupaient une
 * hauteur disproportionnée pour deux offres à comparer (padding `p-10`,
 * grille large `max-w-3xl`) — resserrées (`p-6`, `max-w-2xl`, listes plus
 * denses) pour que les deux formules se comparent d'un coup d'œil.
 */
const FORMULES = [
  {
    id: "pro",
    nom: "Pro",
    eur: `${PRO_PRICE_EUR} €`,
    cfa: `≈ ${formatFCFA(PRO_PRICE_EUR)}`,
    periode: "par mois",
    essai: `${TRIAL_DAYS} jours d'essai gratuit, puis`,
    objectif: "Tout EduCom, dès aujourd'hui.",
    features: [
      "Toutes les fonctionnalités actuelles",
      "Import de votre annuaire élèves (Excel/CSV)",
      "Inscriptions et dossiers élèves",
      "Saisie des notes et bulletins",
      "Facturation et reçus",
      "Support prioritaire",
    ],
    cta: "Commencer gratuitement",
    highlight: true,
  },
  {
    id: "surmesure",
    nom: "Sur mesure",
    eur: "Sur devis",
    cfa: null,
    periode: null,
    essai: null,
    objectif: "Des besoins particuliers ? Construisons-le ensemble.",
    features: [
      "Développement de fonctionnalités spécifiques",
      "Intégration de paiements",
      "Automatisations sur mesure",
      "Accompagnement dédié",
    ],
    cta: "Parler à un expert",
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
      <div className={`mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 ${sansEntete ? "py-10 lg:py-14" : "py-14 lg:py-20"}`}>
        {!sansEntete && (
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
              Tarifs
            </p>
            <h2 className="mt-4 font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
              Un prix par école, pas par élève.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
              Commencez par {TRIAL_DAYS} jours d&apos;essai : le temps de numériser votre
              annuaire élèves et de voir si EduCom vous fait gagner vos journées.
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
          className={`mx-auto grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2 ${sansEntete ? "" : "mt-8"}`}
        >
          {FORMULES.map((f) => {
            const isHighlighted = f.highlight;
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 28 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 18 } },
                }}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 22 } }}
                key={f.id}
                className={`relative flex flex-col rounded-[16px] transition-shadow duration-300 ${
                  isHighlighted ? "bg-m-ink shadow-m-lift" : "bg-m-card shadow-[0_1px_2px_rgb(11_18_32_/_0.04)] hover:shadow-m-lift"
                }`}
              >
                <div className="flex flex-col p-6">
                  <div className="flex items-center gap-3">
                    <h3 className={`text-[14px] font-semibold ${isHighlighted ? "text-white" : "text-m-ink"}`}>
                      {f.nom}
                    </h3>
                    {isHighlighted && (
                      <span className="rounded-pill bg-m-accent-bright px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-m-ink">
                        Populaire
                      </span>
                    )}
                  </div>

                  <p className={`mt-2 text-[12.5px] leading-relaxed ${isHighlighted ? "text-white/65" : "text-m-ink-soft"}`}>
                    {f.objectif}
                  </p>

                  <div className="mt-5 flex flex-col gap-4">
                    <div className="flex flex-col">
                      {f.essai && (
                        <p className={`text-[12px] font-medium ${isHighlighted ? "text-m-accent-bright" : "text-m-accent-deep"}`}>
                          {f.essai}
                        </p>
                      )}
                      <div className="mt-1 flex items-baseline gap-1">
                        <p className={`font-display text-[2rem] font-semibold leading-none tracking-tight ${isHighlighted ? "text-white" : "text-m-ink"}`}>
                          {f.eur}
                        </p>
                        {f.periode && (
                          <p className={`text-[13px] font-medium ${isHighlighted ? "text-white/50" : "text-m-ink-faint"}`}>
                            /{f.periode.replace("par ", "")}
                          </p>
                        )}
                      </div>
                      {f.cfa && (
                        <p className={`mt-1 text-[12.5px] font-semibold tabular-nums ${isHighlighted ? "text-m-accent-bright" : "text-m-ink-faint"}`}>
                          {f.cfa}
                        </p>
                      )}
                    </div>

                    {/* ⚠️ « Sur mesure » n'a pas de formulaire de contact — aucun
                        n'existe dans le produit, et un lien mort coûte plus de
                        confiance que son absence (règle du reste du site). La
                        boîte de Kory reçoit directement le message ; à
                        remplacer par une adresse dédiée dès qu'elle existe. */}
                    <Link
                      href={f.id === "surmesure" ? "mailto:koryobjectifs@gmail.com?subject=EduCom%20%E2%80%94%20Besoin%20sur%20mesure" : "/register"}
                      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-control text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        isHighlighted
                          ? "bg-white text-m-ink hover:bg-white/90 focus-visible:ring-white/50 focus-visible:ring-offset-m-ink"
                          : "bg-m-ink text-white hover:bg-m-ink/85 focus-visible:ring-m-ink/40"
                      }`}
                    >
                      {f.cta}
                    </Link>
                  </div>
                </div>

                <div className={`flex-1 rounded-b-[16px] border-t p-6 ${isHighlighted ? "border-white/10 bg-white/[0.03]" : "border-m-line-soft bg-m-paper"}`}>
                  <ul className="space-y-2.5">
                    {f.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-2.5 text-[12.5px] leading-relaxed ${isHighlighted ? "text-white/70" : "text-m-ink-soft"}`}>
                        <Check
                          aria-hidden="true"
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isHighlighted ? "text-m-accent-bright" : "text-m-accent-deep"}`}
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
        <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-3 border-t border-m-line pt-6 sm:grid-cols-2">
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
