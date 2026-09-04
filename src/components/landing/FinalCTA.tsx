import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Appel à l'action final — chantier PLG, révisé par l'addendum.
 *
 * ═══ CE QUI ÉTAIT AFFICHÉ ═══
 *
 * ⚠️ **Deux durées d'essai contradictoires dans le même composant** : « 14 jours
 * d'essai gratuit » au-dessus du bouton, « 7 jours d'essai gratuit » quatre
 * lignes plus bas. La contradiction prouve à elle seule que ce texte n'avait
 * jamais été relu.
 *
 * ⚠️ **« Rejoignez des dizaines d'écoles privées qui font déjà confiance à
 * EduCom. »** Aucune école n'utilise EduCom en production : preuve sociale
 * inventée, et la plus facile à démentir.
 *
 * ⚠️ Halo de 1000 px et ombre portée noire : marqueurs de maquette générée.
 *
 * ═══ CE QUI LE REMPLACE ═══
 *
 * Ce qui se passe réellement quand on clique, et rien d'autre. L'essai de
 * 14 jours peut désormais être nommé — il est arrêté (voir `Pricing`) — mais la
 * phrase qui l'accompagne reste exacte : aucun mécanisme ne le décompte, et rien
 * ne peut être prélevé.
 *
 * ⚠️ Refonte du 4 septembre 2026 : le bandeau passe du bleu produit au marine
 * profond du hero, avec le même filet or et le même filigrane de marque — la
 * page ouvre et se referme sur la même couleur, volontairement.
 */
export default function FinalCTA() {
  return (
    <section className="bg-m-paper px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[20px] bg-m-ink-deep px-7 py-14 sm:px-12 sm:py-16 lg:px-16">
          {/* Filet or — le même repère que le haut du hero : la page ouvre et
              referme sur la même couleur institutionnelle, refonte du 4 sept. */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-m-gold/50 to-transparent" />
          <img
            src="/brand/educom-symbole-blanc.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-20 h-[320px] w-[320px] select-none opacity-[0.05]"
          />

          <div className="relative max-w-2xl">
            <h2 className="font-display text-[2rem] font-bold leading-[1.12] tracking-[-0.015em] text-white sm:text-[2.5rem]">
              Votre premier document officiel, aujourd&apos;hui.
            </h2>

            <p className="mt-6 text-[17px] leading-[1.7] text-white/70">
              Créez l&apos;espace de votre école, choisissez vos niveaux, inscrivez un
              élève : son certificat de scolarité est prêt à imprimer. Trois étapes, aucune
              configuration préalable.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-white px-6 text-[15px] font-semibold text-m-ink transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink-deep"
              >
                Créer l&apos;espace de mon école
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-control border border-white/20 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink-deep"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>

            {/* ⚠️ Aucun compte d'écoles clientes. Aucun prélèvement annoncé. */}
            <p className="mt-7 text-[13px] leading-relaxed text-white/45">
              14 jours d&apos;essai · Aucune carte bancaire demandée · EduCom n&apos;a pas
              encore de paiement en ligne : rien ne peut vous être débité
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
