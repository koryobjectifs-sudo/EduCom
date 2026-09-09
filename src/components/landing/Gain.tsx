import { X, Check } from "lucide-react";

/**
 * « Le gain » — refonte visuelle du 5 septembre 2026 (v6).
 *
 * Le « wow moment » du brief : pas un compte de fonctionnalités, un
 * avant/après sur le temps, le contrôle et la visibilité. La phrase de
 * clôture reprend celle d'`AdminRelief.tsx`, retirée comme section autonome
 * pour ne pas répéter le même battement émotionnel deux fois à quelques
 * sections d'écart (voir `page.tsx`).
 *
 * ⚠️ Déjà la section la moins « card-based » de la page — conservée presque
 * à l'identique. Seul changement : la phrase de clôture monte à une échelle
 * proche du hero, pour créer l'écho typographique demandé.
 *
 * ⚠️ v7 (6 septembre 2026) : fond réchauffé (`--m-warm`, le même lavis que le
 * hero) au lieu du gris-bleu froid `--m-paper-deep` — beat « HUMAIN » du
 * rythme validé, distinct du beat « DONNÉES » sombre qui précède.
 *
 * ⚠️ Passe du 7 septembre 2026 : la phrase de clôture montait à `3.5rem`,
 * jugée disproportionnée une fois le hero lui-même réduit. Redescendue à
 * `2.5rem` — l'écho reste, l'écart avec le reste de la page se resserre.
 */
const AVANT = [
  "Chercher une information dans plusieurs fichiers",
  "Appeler le secrétariat pour un numéro de téléphone",
  "Chercher un contact dans un groupe WhatsApp",
  "Préparer un bulletin à la main, matière par matière",
  "Reconstituer les absences depuis un cahier",
];

const APRES = [
  "Une information, au même endroit",
  "Un numéro, déjà dans le dossier de l'élève",
  "Un message, envoyé depuis la fiche de l'élève",
  "Un bulletin, calculé et mis en page",
  "Une présence, enregistrée et visible immédiatement",
];

export default function Gain() {
  return (
    <section className="bg-m-warm">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Le gain
          </p>
          <h2 className="mt-4 font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
            Le temps, le contrôle, la visibilité.
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-m-ink-faint">
              Avant
            </h3>
            <ul className="mt-5 flex flex-col gap-3.5">
              {AVANT.map((a) => (
                <li key={a} className="flex items-start gap-3 text-[14.5px] leading-[1.6] text-m-ink-soft">
                  <X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-m-ink-faint" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-m-accent-deep">
              Avec EduCom
            </h3>
            <ul className="mt-5 flex flex-col gap-3.5">
              {APRES.map((a) => (
                <li key={a} className="flex items-start gap-3 text-[14.5px] leading-[1.6] text-m-ink">
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-m-signal" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center font-display text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-m-ink sm:text-[2.5rem]">
          Moins de temps à gérer l&apos;école.
          <br />
          Plus de temps à la diriger.
        </p>
      </div>
    </section>
  );
}
