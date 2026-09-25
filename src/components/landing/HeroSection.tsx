import Link from "next/link";
import { AppleArrowRightIcon } from "@/components/ui/apple-icons";
import Image from "next/image";
import EduComWordmark from "@/components/brand/EduComWordmark";

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
  // 24 sept. 2026 — registre corporate doux (Kory : « moins agressif, soft ») :
  // fond bleu très pâle, texte bleu nuit du bouclier, accent bleu
  // institutionnel. Le rouge ne subsiste qu'en point minuscule.
  return (
    <section className="relative isolate overflow-hidden bg-white text-m-navy">
      {/* ═══ BANNIÈRE DE FOND — 25 sept. 2026 (Kory : « supprime l'animation
          à droite, propose une bannière de fond ») ═══
          Photo existante du dépôt (`/marketing/hero-educom.jpg`, directrice
          en établissement). Ordinateur : elle occupe la moitié droite et se
          fond vers le blanc sous le texte. Mobile : pleine largeur, voilée de
          blanc pour que le texte reste lisible. Le texte n'est pas modifié.
          ⚠️ Hauteur minimale en style inline (cf. vitrine : classes arbitraires
          non générées sur le poste de Kory). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 lg:left-[42%]">
        <Image
          src="/marketing/hero-educom.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover"
          style={{ objectPosition: "center 25%" }}
        />
        {/* Fondu vers le blanc sous le texte (ordinateur) */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-white via-white/60 to-transparent lg:block" />
        {/* Voile de lisibilité (mobile et tablette) */}
        <div className="absolute inset-0 bg-white/85 lg:hidden" />
        {/* Léger fondu bas, pour enchaîner avec la section suivante */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative mx-auto flex max-w-7xl items-center px-4 pt-14 pb-20 sm:px-6 lg:px-8 lg:pt-20 lg:pb-28" style={{ minHeight: 560 }}>
        <div className="grid w-full grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6 xl:col-span-6">
            <div className="inline-flex flex-wrap items-center gap-2.5 rounded-full bg-white/95 px-4 py-1.5 text-[12.5px] font-medium text-m-navy shadow-xs ring-1 ring-m-sky-deep backdrop-blur-xs">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-m-red shrink-0" />
              <span>
                Là où l&apos;<strong className="font-bold text-amber-500">Éducation</strong> rencontre l&apos;innovation utile
              </span>
            </div>

            <h1 className="mt-6 font-display text-[2.1rem] font-bold leading-[1.08] sm:text-[2.6rem] lg:text-[2.9rem]">
              Votre liste d&apos;élèves suffit.
              <br />
              <span className="text-m-blue"><EduComWordmark /> s&apos;occupe du&nbsp;reste.</span>
            </h1>

            <p className="mt-5 max-w-xl text-[16.5px] leading-[1.65] text-m-ink-soft sm:text-[17px]">
              Importez votre liste d&apos;élèves&nbsp;: bulletins, factures, reçus, certificats et suivi des
              présences se génèrent à partir d&apos;une seule saisie. Direction, secrétariat, comptabilité et
              enseignants travaillent sur <EduComWordmark />, depuis l&apos;ordinateur ou le téléphone, aux couleurs
              et au cachet de votre établissement.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-control bg-m-navy px-7 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(10,35,66,0.55)] transition-all hover:-translate-y-px hover:bg-m-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-blue/40 focus-visible:ring-offset-2"
              >
                Créer mon école
                <AppleArrowRightIcon aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#etapes"
                className="inline-flex h-12 items-center justify-center rounded-control bg-white px-6 text-[15px] font-semibold text-m-navy ring-1 ring-m-sky-deep transition-colors hover:bg-m-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-blue/40"
              >
                Voir comment ça marche
              </Link>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-m-ink-soft">
              {["7\u00a0jours d'essai offerts", "Aucune installation", "Données cloisonnées par école"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-m-blue/50" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
