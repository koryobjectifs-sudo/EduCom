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
 */
export default function FinalCTA() {
  return (
    <section className="bg-m-paper px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[20px] bg-m-primary px-7 py-14 sm:px-12 sm:py-16 lg:px-16">
          <div className="max-w-2xl">
            <h2 className="font-display text-[2rem] font-bold leading-[1.12] tracking-[-0.015em] text-white sm:text-[2.5rem]">
              Votre premier document officiel, aujourd&apos;hui.
            </h2>

            <p className="mt-6 text-[17px] leading-[1.7] text-white/75">
              Créez l&apos;espace de votre école, choisissez vos niveaux, inscrivez un
              élève : son certificat de scolarité est prêt à imprimer. Trois étapes, aucune
              configuration préalable.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-white px-6 text-[15px] font-semibold text-m-ink transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink"
              >
                Créer l&apos;espace de mon école
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-control border border-white/25 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>

            {/* ⚠️ Aucun compte d'écoles clientes. Aucun prélèvement annoncé. */}
            <p className="mt-7 text-[13px] leading-relaxed text-white/60">
              14 jours d&apos;essai · Aucune carte bancaire demandée · EduCom n&apos;a pas
              encore de paiement en ligne : rien ne peut vous être débité
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
