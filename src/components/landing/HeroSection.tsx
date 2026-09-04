import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HeroProduct from "./HeroProduct";

/**
 * Hero — refonte du 4 septembre 2026, sur demande explicite de Kory.
 *
 * ═══ CE QUI CHANGE, ET POURQUOI C'EST UN CHOIX ASSUMÉ, PAS UN OUBLI ═══
 *
 * L'addendum PLG (voir `context.md`) avait délibérément retiré tout dégradé,
 * halo et grille en fond : c'était juste pour l'époque — la page sortait tout
 * juste d'un premier chantier qui accumulait ces marqueurs de maquette
 * générée sans qu'aucun ne serve le propos. Kory demande maintenant l'inverse
 * : « une bannière de fond », un hero « beaucoup plus » — le produit a grandi
 * (dossier conforme, conformité documentaire, présences, import Excel), la
 * page doit maintenant porter cette ambition visuellement.
 *
 * ⚠️ Ce n'est donc PAS un retour aveugle à la maquette d'origine. La bannière
 * ci-dessous n'a ni dégradé de couleur ni halo flou : elle est marine unie
 * (`--m-ink-deep`, un ton de la charte, pas inventé), texturée d'une grille
 * fine — la trame d'un registre administratif, pas une texture décorative
 * générique — et porte le symbole de marque en filigrane, tiré tel quel de
 * `public/brand/`. Zéro JavaScript, zéro dépendance d'animation : la page
 * doit toujours s'ouvrir vite depuis Dakar.
 *
 * ⚠️ La ligne de réassurance ne contient toujours que des faits vérifiables.
 *
 * ═══ SECONDE PASSE, MÊME JOUR — RÉFÉRENCES VERACROSS / EDUPAGE ═══
 *
 * Kory a fourni deux sites de référence et un « free pass ». Capture réelle
 * des deux avant d'écrire une ligne (`scripts/_zz-ref-shots.ts`, jetable) :
 * Veracross compose son titre à une échelle bien plus grande que ce que cette
 * page avait — c'est la seule chose empruntée ici, l'échelle, pas le fond
 * photographique plein cadre (une directrice PLG doit voir le produit dans le
 * hero, pas une photo de banque d'images).
 */
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-m-ink-deep">
      {/* Filigrane de marque — le symbole officiel, surdimensionné, presque
          invisible. Une bannière a besoin d'une texture ; la marque elle-même
          en est une, et ça évite d'inventer un motif hors charte. */}
      <img
        src="/brand/educom-symbole-blanc.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] select-none opacity-[0.05] sm:h-[560px] sm:w-[560px]"
      />

      {/* Trame fine — la grille d'un registre, pas un quadrillage de maquette :
          un seul pixel de large, très espacée, quasi invisible sauf au regard
          qui la cherche. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--m-ink-line) 1px, transparent 1px), linear-gradient(to bottom, var(--m-ink-line) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Filet supérieur — or, pas marine : la bannière a besoin d'un bord à
          toucher, comme le papier en avait un au chantier précédent. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-m-gold/50 to-transparent"
      />
      {/* Transition vers le papier : la bannière ne s'arrête pas net. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-m-paper/[0.03]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill bg-m-ink-elevated px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-m-gold-soft ring-1 ring-inset ring-m-ink-line">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-m-gold" />
              Écoles privées du Sénégal
            </p>

            <h1 className="mt-6 font-display text-[2.75rem] font-bold leading-[1.05] tracking-[-0.025em] text-white sm:text-[3.75rem] lg:text-[4.25rem]">
              Les dossiers, les bulletins et les frais de votre école,{" "}
              <span className="hero-surligne sm:whitespace-nowrap">au même endroit</span>.
            </h1>

            <p className="mt-7 max-w-xl text-[17px] leading-[1.7] text-white/70">
              Inscrivez un élève, et EduCom édite son certificat de scolarité à
              l&apos;en-tête de votre établissement. Puis ses bulletins, son dossier conforme
              au référentiel officiel, et ses factures — tout au même endroit.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-white px-6 text-[15px] font-semibold text-m-ink transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink-deep"
              >
                Créer l&apos;espace de mon école
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-control border border-white/20 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink-deep"
              >
                Voir le déroulé
              </Link>
            </div>

            {/* ⚠️ Uniquement des faits vérifiables. */}
            <p className="mt-7 max-w-lg text-[13px] leading-relaxed text-white/45">
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
