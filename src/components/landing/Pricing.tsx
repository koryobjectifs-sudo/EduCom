import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

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
 */
const FORMULES = [
  {
    id: "essai",
    nom: "Essai",
    eur: "Gratuit",
    cfa: "14 jours",
    objectif: "Découvrir EduCom et obtenir votre premier résultat concret.",
    // ⚠️ Aucune fonctionnalité listée : ce qui est ouvert pendant l'essai n'est
    // pas arrêté. La phrase décrit l'INTENTION de l'essai, ce qui est décidé.
    note: "Aucune carte bancaire n'est demandée.",
    cta: "Créer l'espace de mon école",
    ton: "clair" as const,
  },
  {
    id: "pro",
    nom: "Pro",
    eur: "20 €",
    cfa: "≈ 13 100 F CFA",
    periode: "par mois",
    objectif: "Faire fonctionner l'école au quotidien.",
    note: null,
    cta: "Commencer par l'essai",
    ton: "clair" as const,
  },
  {
    id: "premium",
    nom: "Premium",
    eur: "30 €",
    cfa: "≈ 19 700 F CFA",
    periode: "par mois",
    objectif: "Piloter et automatiser l'école.",
    note: null,
    cta: "Commencer par l'essai",
    ton: "sombre" as const,
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
      <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${sansEntete ? "py-16 lg:py-20" : "py-20 lg:py-28"}`}>
        {!sansEntete && (
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
              Tarifs
            </p>
            <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
              Un prix par école, pas par élève.
            </h2>
            <p className="mt-6 text-[16px] leading-[1.7] text-m-ink-soft">
              Commencez par les 14 jours d&apos;essai : le temps d&apos;éditer votre premier
              document officiel et de voir si EduCom vous fait gagner vos journées.
            </p>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-5 md:grid-cols-3 ${sansEntete ? "" : "mt-14"}`}>
          {FORMULES.map((f) => {
            const sombre = f.ton === "sombre";
            return (
              <div
                key={f.id}
                className={`flex flex-col rounded-[14px] p-7 sm:p-8 ${
                  sombre
                    ? "bg-m-ink text-white"
                    : "border border-m-line bg-m-card text-m-ink-soft"
                }`}
              >
                <h3
                  className={`text-[13px] font-bold uppercase tracking-[0.14em] ${
                    sombre ? "text-white/60" : "text-m-ink-faint"
                  }`}
                >
                  {f.nom}
                </h3>

                <div className="mt-5">
                  <p
                    className={`font-display text-[2.25rem] font-bold leading-none tracking-[-0.02em] ${
                      sombre ? "text-white" : "text-m-ink"
                    }`}
                  >
                    {f.eur}
                  </p>
                  {/* Le franc CFA sur sa propre ligne, à taille lisible : c'est
                      le montant que la personne compare à son budget. */}
                  <p
                    className={`mt-2 text-[15px] font-semibold tabular-nums ${
                      sombre ? "text-m-accent" : "text-m-accent-deep"
                    }`}
                  >
                    {f.cfa}
                  </p>
                  {f.periode && (
                    <p
                      className={`mt-1 text-[13px] ${
                        sombre ? "text-white/55" : "text-m-ink-faint"
                      }`}
                    >
                      {f.periode}
                    </p>
                  )}
                </div>

                <p
                  className={`mt-6 flex-1 text-[15px] leading-[1.7] ${
                    sombre ? "text-white/80" : "text-m-ink-soft"
                  }`}
                >
                  {f.objectif}
                </p>

                {f.note && (
                  <p
                    className={`mt-4 flex items-start gap-2 text-[13px] leading-relaxed ${
                      sombre ? "text-white/70" : "text-m-ink-soft"
                    }`}
                  >
                    <Check
                      aria-hidden="true"
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        sombre ? "text-m-accent" : "text-m-accent-deep"
                      }`}
                    />
                    {f.note}
                  </p>
                )}

                <Link
                  href="/register"
                  className={`mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-control px-5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    sombre
                      ? "bg-white text-m-ink hover:bg-white/90 focus-visible:ring-white/60 focus-visible:ring-offset-m-ink"
                      : "bg-m-ink text-white hover:bg-m-ink/90 focus-visible:ring-m-ink/40"
                  }`}
                >
                  {f.cta}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* ⚠️ Les trois phrases que la grille ne doit jamais perdre. */}
        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-4 border-t border-m-line pt-8 sm:grid-cols-3">
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
          <p className="text-[13px] leading-relaxed text-m-ink-soft">
            <span className="font-semibold text-m-ink">Le détail des formules arrive.</span>{" "}
            La répartition exacte entre Pro et Premium est en cours d&apos;arrêt ; nous ne
            l&apos;annoncerons pas avant qu&apos;elle soit décidée.
          </p>
        </div>
      </div>
    </section>
  );
}
