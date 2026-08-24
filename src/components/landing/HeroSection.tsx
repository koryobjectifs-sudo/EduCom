import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HeroProduct from "./HeroProduct";

/**
 * Hero — chantier PLG, révisé par l'addendum.
 *
 * ═══ TEST DES TROIS SECONDES ═══
 *
 * L'ancienne version disait « Gérez votre école. Engagez vos parents.
 * Simplifiez votre quotidien. » — trois promesses interchangeables avec
 * n'importe quel logiciel de gestion. Le titre nomme désormais **ce qui est
 * réuni** ; le sous-titre dit **ce qu'on obtient dès le premier jour**.
 *
 * ═══ CE QUI AVAIT ÉTÉ RETIRÉ, ET RESTE RETIRÉ ═══
 *
 * ⚠️ Le dégradé sur le titre, la grille en fond, le halo bleu de 800 px et
 * l'animation d'entrée `framer-motion`. Quatre marqueurs de maquette générée —
 * et l'animation retardait la lecture du titre sur une connexion lente, soit
 * exactement le contraire du test des trois secondes. Le composant est un
 * composant serveur : aucun JavaScript n'est nécessaire pour l'afficher.
 *
 * ═══ CE QUE L'ADDENDUM AJOUTE ═══
 *
 * La hiérarchie ne tenait qu'au gras d'Inter. Elle tient maintenant à un
 * **contraste de familles** (romain d'affichage / linéale de texte), à
 * l'échelle, et à un seul trait de couleur : le vert de marque sous le membre
 * de phrase qui porte la promesse. Un accent, pas six.
 *
 * ⚠️ La ligne de réassurance ne contient que des faits vérifiables : aucune
 * durée d'essai n'y est promise, aucun nombre d'écoles clientes n'y figure.
 */
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-m-paper">
      {/* Aplat marine derrière la moitié haute : il ancre la marque sans halo
          ni dégradé, et donne au papier de la page un bord à toucher. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-m-line" />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center rounded-pill bg-m-accent-wash px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-m-accent-deep">
              Écoles privées du Sénégal
            </p>

            <h1 className="mt-6 font-display text-[2.5rem] font-bold leading-[1.08] tracking-[-0.02em] text-m-ink sm:text-[3.25rem] lg:text-[3.5rem]">
              Les dossiers, les bulletins et les frais de votre école,{" "}
              {/* Le seul trait de couleur du hero. Voir `.m-surligne` dans
                  `globals.css` : le trait suit le texte s'il se coupe en deux
                  lignes, et ne dépend d'aucun `whitespace-nowrap` — la première
                  version en avait besoin, et « au même endroit. » tenait alors
                  à trois pixels près sur un écran de 390. */}
              <span className="m-surligne sm:whitespace-nowrap">au même endroit</span>
              .
            </h1>

            <p className="mt-7 max-w-xl text-[17px] leading-[1.7] text-m-ink-soft">
              Inscrivez un élève, et EduCom édite son certificat de scolarité à
              l&apos;en-tête de votre établissement. Puis ses bulletins, ses factures, et le
              dossier complet à présenter à l&apos;inspection.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-m-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-m-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-primary/40 focus-visible:ring-offset-2"
              >
                Créer l&apos;espace de mon école
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-control border border-m-line bg-m-card px-6 text-[15px] font-semibold text-m-ink transition-colors hover:bg-m-paper-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-ink/40 focus-visible:ring-offset-2"
              >
                Voir le déroulé
              </Link>
            </div>

            {/* ⚠️ Uniquement des faits vérifiables. */}
            <p className="mt-7 max-w-lg text-[13px] leading-relaxed text-m-ink-faint">
              Installation en trois minutes · Aucune carte bancaire demandée · Vos données
              restent celles de votre établissement
            </p>
          </div>

          <HeroProduct />
        </div>
      </div>
    </section>
  );
}
