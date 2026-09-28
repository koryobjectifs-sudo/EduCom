import Link from "next/link";
import { AppleArrowRightIcon, AppleMessageIcon } from "@/components/ui/apple-icons";
import EduComWordmark from "@/components/brand/EduComWordmark";
import { TRIAL_DAYS } from "@/lib/pricing";
import FondAmbiance from "./FondAmbiance";

/**
 * Appel final — « Créer mon école » (24 septembre 2026).
 *
 * Kory : « pas de bouton de démo, plutôt Créer mon école ». Remplace
 * `DemoBookingSection` dans l'assemblage de la page (fichier conservé). Le
 * parcours devient libre-service : inscription → import de la liste.
 *
 * WhatsApp reste en lien secondaire discret : au Sénégal, c'est là qu'un
 * directeur pose sa question avant de s'engager — le retirer ferait perdre
 * ces prospects, le mettre en bouton concurrencerait l'action principale.
 *
 * ⚠️ « Sans carte bancaire » est vrai à la lettre : EduCom n'a aucun paiement
 * en ligne (voir `Pricing.tsx`). À revoir le jour où l'abonnement sera prélevé.
 */
const WHATSAPP_EQUIPE = "221773024844";

export default function CreateSchoolSection() {
  const message = encodeURIComponent("Bonjour, j'ai une question avant de créer mon école sur EduCom.");

  return (
    <section id="commencer" className="relative isolate scroll-mt-16 overflow-hidden bg-m-sky py-10 lg:py-14">
      <FondAmbiance />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[24px] bg-white px-6 py-8 text-center ring-1 ring-m-sky-deep shadow-[0_20px_48px_-24px_rgba(10,35,66,0.25)] sm:px-10 lg:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-m-navy via-m-blue to-m-red"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/educom-bouclier.png" alt="" width={38} height={44} className="mx-auto h-[44px] w-auto" />

          <h2 className="mx-auto mt-4 max-w-2xl font-display text-[1.45rem] font-bold leading-[1.15] text-m-navy sm:text-[1.85rem]">
            Créez votre école sur <EduComWordmark /> dès aujourd&apos;hui.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-m-ink-soft">
            Importez votre liste d&apos;élèves&nbsp;: vos premiers bulletins, factures et certificats suivent.
            {" "}{TRIAL_DAYS}&nbsp;jours d&apos;essai, sans engagement, sans carte bancaire.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex h-10.5 items-center justify-center gap-2 rounded-control bg-m-navy px-7 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(10,35,66,0.55)] transition-all hover:-translate-y-px hover:bg-m-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-blue/40 focus-visible:ring-offset-2"
            >
              Créer mon école
              <AppleArrowRightIcon aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_EQUIPE}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 text-[13.5px] font-medium text-m-ink-soft underline-offset-4 transition-colors hover:text-m-navy hover:underline"
            >
              <AppleMessageIcon aria-hidden="true" className="h-4 w-4 text-m-signal" />
              Une question&nbsp;? Écrivez-nous sur WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
