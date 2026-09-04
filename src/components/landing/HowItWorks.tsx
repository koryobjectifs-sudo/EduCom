import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Le déroulé — chantier PLG, réécrit par l'addendum.
 *
 * ═══ CE QUI ÉTAIT AFFICHÉ ═══
 *
 * ⚠️ L'étape 2 disait « **Importez vos données** — ajoutez facilement vos
 * élèves, enseignants et parents **depuis Excel** ». Il n'existe aucun import :
 * aucune dépendance de lecture de tableur (`xlsx`, `papaparse`) n'est installée,
 * et aucune route ne l'implémente. C'était l'étape la plus décisive du parcours
 * — celle qui décide une directrice ayant déjà trois cents élèves dans un
 * classeur — et elle était fausse.
 *
 * ⚠️ Trois cercles de 96 px avec bordure blanche de 8 px, une pastille numérotée
 * en bleu vif hors charte, un trait de liaison en `absolute` cassé sous `md`, et
 * un fondu `framer-motion` par étape.
 *
 * ═══ CE QUI LE REMPLACE ═══
 *
 * Les **trois étapes réelles**, celles que la sonde CDP parcourt réellement de
 * bout en bout : niveaux → premier élève → certificat. La troisième n'est pas
 * une étape d'installation, c'est le **premier résultat** — et c'est pour cela
 * qu'elle est traitée différemment des deux autres.
 */
const ETAPES = [
  {
    n: "01",
    titre: "Créez l'espace de votre école",
    detail:
      "Son nom, puis les niveaux que vous enseignez — maternelle, primaire, collège, lycée. Les classes correspondantes sont créées pour vous.",
    duree: "≈ 1 minute",
  },
  {
    n: "02",
    titre: "Inscrivez un élève",
    detail:
      "Nom, date de naissance, classe. Coordonnées et tarifs peuvent attendre : rien ne vous est demandé avant d'être utile.",
    duree: "≈ 1 minute",
  },
];

export default function HowItWorks() {
  return (
    <section id="deroule" className="scroll-mt-20 bg-m-paper-deep">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Le déroulé
          </p>
          <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
            Du compte créé au premier document, en trois minutes.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {ETAPES.map((e) => (
            <div
              key={e.n}
              className="rounded-[14px] border border-m-line bg-m-card p-7 sm:p-8"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span
                  aria-hidden="true"
                  className="font-display text-[15px] font-bold tabular-nums text-m-ink-faint"
                >
                  {e.n}
                </span>
                <span className="text-[12px] font-medium text-m-ink-faint">{e.duree}</span>
              </div>
              <h3 className="mt-5 text-[18px] font-semibold leading-snug text-m-ink">
                {e.titre}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-m-ink-soft">{e.detail}</p>
            </div>
          ))}

          {/* La troisième carte n'est pas une étape : c'est le résultat. Elle
              change de fond pour que l'œil le comprenne avant de lire. */}
          <div className="rounded-[14px] bg-m-ink-deep p-7 text-white sm:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <span
                aria-hidden="true"
                className="font-display text-[15px] font-bold tabular-nums text-white/50"
              >
                03
              </span>
              <span className="rounded-pill bg-m-gold px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-m-ink-deep">
                Résultat
              </span>
            </div>
            <h3 className="mt-5 font-display text-[20px] font-bold leading-snug">
              Son certificat de scolarité est prêt.
            </h3>
            <p className="mt-3 text-[15px] leading-[1.7] text-white/75">
              À l&apos;en-tête de votre établissement, avec l&apos;année scolaire en cours,
              prêt à imprimer et à remettre au parent qui attend.
            </p>
            <Link
              href="/register"
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-control bg-white px-5 text-[14px] font-semibold text-m-ink transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-m-ink-deep"
            >
              Commencer
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-[15px] leading-[1.7] text-m-ink-soft">
          Ensuite seulement viennent les bulletins, la grille tarifaire, les factures et le
          dossier numérique — quand vous en avez besoin, pas avant.
        </p>
      </div>
    </section>
  );
}
