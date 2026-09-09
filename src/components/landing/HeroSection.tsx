import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScreenFrame from "./ScreenFrame";

/**
 * Hero — refonte v7 (6 septembre 2026).
 *
 * ═══ CE QUI CHANGE DEPUIS LA v6 ═══
 *
 * La composition « texte contraint, visuel qui déborde » reste (jugée
 * juste par Kory) mais le fond passe du blanc plat à un lavis chaud
 * (`--m-warm` → blanc → `--m-accent-wash`, en dégradé Tailwind — jamais un
 * `linear-gradient` littéral dans `globals.css`, interdit par le garde-fou
 * des tokens) : direction couleur du plan validé, calquée sur ce que Slack
 * fait réellement derrière sa capture de hero (étudié en réel via
 * Playwright), jamais un dégradé violet « IA ». Le mot « digitalisation »
 * porte le rouge de marque (`--m-red`, échantillonné dans le vrai logo) —
 * la seule touche de rouge du hero, stratégique, pas décorative. Le visuel
 * utilise désormais `ScreenFrame`, le même chrome minimal que le reste de la
 * page (cohérence du système), tout en gardant le débord/rotation qui le
 * sépare d'une carte flottante isolée.
 *
 * ⚠️ Passe du 7 septembre 2026 : le H1 occupait jusqu'à `6rem` — beaucoup
 * trop de hauteur d'écran pour ce qu'il dit. Ramené à `4.25rem` au maximum,
 * marges resserrées d'un cran partout dans ce bloc.
 */
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-m-warm via-m-paper to-m-accent-wash">
      <div className="grid grid-cols-1 items-center gap-10 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-0 lg:px-0 lg:pb-0 lg:pt-16">
        <div className="max-w-xl lg:pl-8 xl:pl-12">
          <p className="inline-flex items-center gap-2 rounded-pill bg-m-accent-wash px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-m-accent-deep">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-m-accent-deep" />
            Écoles privées du Sénégal
          </p>

          <h1 className="mt-5 font-display text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.03em] text-m-ink sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem]">
            Une école plus simple à gérer
            <br />
            commence par sa <span className="text-m-red">digitalisation</span>.
          </h1>

          <p className="mt-5 max-w-md text-[16px] leading-[1.65] text-m-ink-soft">
            Tout part de votre annuaire élèves. Une fois numérisé, les dossiers, les notes, les
            présences et la communication avec les familles se connectent d&apos;eux-mêmes.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-m-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-m-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-ink/40 focus-visible:ring-offset-2"
            >
              Commencer gratuitement
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="#systeme"
              className="inline-flex h-12 items-center justify-center rounded-control border border-m-line bg-m-card px-6 text-[15px] font-semibold text-m-ink transition-colors hover:bg-m-paper-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-ink/30 focus-visible:ring-offset-2"
            >
              Découvrir EduCom
            </Link>
          </div>

          <p className="mt-5 max-w-lg text-[13px] leading-relaxed text-m-ink-faint">
            7 jours d&apos;essai · Aucune carte bancaire demandée · Vos données restent celles
            de votre établissement
          </p>
        </div>

        {/* Le visuel — un vrai écran, pas une composition. Contenu à partir de
            `lg` ; déborde jusqu'au bord du viewport, ne reste pas une carte
            flottante isolée. */}
        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:w-[42vw] lg:max-w-[680px] lg:justify-self-end">
          <ScreenFrame
            label="Dossier — Aïssatou Ndiaye"
            src="/marketing/hero-dossier.png"
            alt="Fiche d'Aïssatou Ndiaye dans EduCom : matricule, classe, statut d'inscription"
            width={1355}
            height={521}
            priority
            sizes="(min-width: 1024px) 42vw, 90vw"
            className="lg:-rotate-1 lg:rounded-r-none lg:rounded-l-[22px]"
          />
          <p className="mt-4 pr-4 text-center text-[12px] leading-relaxed text-m-ink-faint lg:pr-10 lg:text-right">
            Aperçu réel du dossier d&apos;un élève. Données d&apos;exemple.
          </p>
        </div>
      </div>
    </section>
  );
}
