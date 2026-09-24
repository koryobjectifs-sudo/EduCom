import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HeroDemo from "./HeroDemo";

/**
 * Hero — raffinement premium du 23 septembre 2026.
 *
 * ⚠️ La photo d'illustration est remplacée par `HeroDemo` : le visiteur d'une
 * campagne de prospection doit VOIR EduCom produire un bulletin, une facture,
 * un certificat — pas une directrice qui sourit à une tablette.
 *
 * ⚠️ Mentions retirées car fausses ou invérifiables :
 *   - « Données sécurisées au Sénégal » : la base est hébergée à Francfort
 *     (Supabase eu-central-1, Vercel fra1). Promesse inexacte, et sensible au
 *     regard de la CDP.
 *   - « Plateforme déployée à Dakar », « pièces certifiés conformes » : aucune
 *     certification ne fonde ces formules.
 *   - « calcul automatique des moyennes et rangs » : ramené à ce que la démo montre.
 *
 * Promesse : Kory veut qu'un directeur comprenne « j'importe ma liste, le reste
 * suit ». Le sous-titre borne honnêtement ce « reste » (on saisit toujours les
 * notes et les paiements).
 */

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-m-accent-wash/60 via-m-paper to-m-paper">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-m-card px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.02em] text-m-accent-deep ring-1 ring-m-line">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-m-signal" />
              Écoles privées · Élémentaire · Moyen · Secondaire
            </p>

            <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] text-m-ink sm:text-[3.4rem] lg:text-[3.9rem]">
              Importez vos élèves.
              <br />
              <span className="text-m-accent-deep">EduCom produit le reste.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-[1.6] text-m-ink-soft sm:text-[18px]">
              Vous saisissez les notes et les paiements. Moyennes, bulletins officiels, factures, reçus et
              certificats sont générés automatiquement, au nom et au cachet de votre école.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="#demo"
                className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-control bg-m-ink px-7 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(11,18,32,0.5)] transition-all hover:-translate-y-px hover:bg-m-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-ink/40 focus-visible:ring-offset-2"
              >
                Réserver une démo
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#parcours"
                className="inline-flex h-12 items-center justify-center rounded-control bg-m-card px-6 text-[15px] font-semibold text-m-ink ring-1 ring-m-line transition-colors hover:bg-m-paper-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-ink/30 focus-visible:ring-offset-2"
              >
                Voir EduCom en action
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-m-ink-soft">
              {["Démo de 20 min avec votre fichier Excel", "Rien à installer", "Chaque école cloisonnée"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-m-ink-faint" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6">
            <HeroDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
