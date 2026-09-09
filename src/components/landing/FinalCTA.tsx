import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/pricing";

/**
 * Appel à l'action final — refonte du 5 septembre 2026 (v5).
 *
 * ═══ CE QUI RESTE VRAI DEPUIS LES VERSIONS PRÉCÉDENTES ═══
 *
 * Une seule durée d'essai lue depuis `TRIAL_DAYS`, cohérente avec `Pricing` ;
 * aucune preuve sociale inventée ; aucun halo décoratif ; aucun filigrane du
 * symbole de marque (verrou de marque : `educom-logo-officiel.jpg` seul,
 * présent dans la nav et le pied de page).
 *
 * ═══ CE QUI CHANGE AVEC LA v5 ═══
 *
 * CTA unifié : « Commencer gratuitement » partout sur la page (nav, hero,
 * tarifs, ici). `HowItWorks.tsx` n'apparaît plus sur l'accueil (reste sur
 * `/how-it-works`).
 *
 * ═══ v6 (5 septembre 2026) ═══
 *
 * Le titre monte à une échelle proche du hero (direction C, §12 du plan
 * validé) : le CTA final referme la page en écho à son ouverture, au lieu de
 * répéter le gabarit « H2 standard » utilisé partout ailleurs.
 *
 * ⚠️ Passe du 7 septembre 2026 : `4.75rem` était disproportionné une fois le
 * hero lui-même réduit à `4.25rem`. Redescendu à `2.75rem`, panneau resserré.
 */
export default function FinalCTA() {
  return (
    <section className="bg-m-paper px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[20px] bg-m-ink-deep px-7 py-12 sm:px-12 sm:py-14 lg:px-16 lg:py-16">
          <div className="relative max-w-2xl">
            <h2 className="font-display text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-[2.25rem] lg:text-[2.75rem]">
              Réunissez votre école.
            </h2>

            <p className="mt-5 text-[16px] leading-[1.65] text-white/65">
              Créez l&apos;espace de votre école, numérisez votre annuaire élèves : chaque
              dossier devient immédiatement accessible, à jour, et prêt à imprimer.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-white px-6 text-[15px] font-semibold text-m-ink transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink-deep"
              >
                Commencer gratuitement
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-control border border-white/20 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink-deep"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>

            {/* ⚠️ Aucun compte d'écoles clientes. Aucun prélèvement annoncé — cette
                mention reste ici même si `Pricing` la répète juste au-dessus sur la
                page : un visiteur qui saute directement à ce bloc doit la voir aussi. */}
            <p className="mt-5 text-[13px] leading-relaxed text-white/45">
              {TRIAL_DAYS} jours d&apos;essai · Aucune carte bancaire demandée · Aucun
              prélèvement automatique
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
