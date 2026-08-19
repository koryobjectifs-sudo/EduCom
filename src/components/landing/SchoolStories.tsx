import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";

/**
 * Histoires d'écoles — preuve sociale. Addendum PLG.
 *
 * ═══ LA RÈGLE QUI GOUVERNE CE FICHIER ═══
 *
 * ⚠️ **Aucun nom d'école, de directeur, de citation, de chiffre, de résultat ou
 * de vidéo ne doit être écrit ici tant qu'il n'est pas réel et vérifiable.**
 * L'addendum est explicite, et le dépôt a déjà payé cette faute : la page de
 * connexion portait un témoignage signé d'une personne qui n'existe pas, et
 * l'appel à l'action final annonçait « des dizaines d'écoles nous font déjà
 * confiance » alors qu'aucune école n'utilise EduCom en production.
 *
 * ═══ POURQUOI IL N'Y A PAS DE « CONTENU DE DÉMONSTRATION » ═══
 *
 * L'addendum l'autorise s'il est indispensable et explicitement étiqueté. Il ne
 * l'est pas : la structure se visualise très bien avec zéro témoignage, parce
 * que **l'état vide est ici un vrai état produit**, pas un trou à combler. Une
 * carte « Nom Prénom · Directrice · École X » barrée d'un bandeau « exemple »
 * n'aurait rien prouvé, et aurait fini par être publiée sans le bandeau — c'est
 * toujours ainsi que les fausses preuves entrent dans un produit.
 *
 * ═══ COMMENT PUBLIER LE PREMIER VRAI TÉMOIGNAGE ═══
 *
 * Ajouter un objet à `TEMOIGNAGES` ci-dessous. La section bascule seule de
 * l'état « pilote » à la grille éditoriale : il n'y a rien d'autre à modifier,
 * et surtout rien à supprimer. Conditions à remplir AVANT d'ajouter la ligne :
 *
 *   1. la personne a écrit ou relu et **approuvé par écrit** la citation ;
 *   2. son nom, sa fonction et son établissement sont **exacts** ;
 *   3. tout chiffre cité est **mesuré**, pas estimé, et sa source est connue ;
 *   4. l'accord de publication couvre le nom de l'établissement.
 *
 * ⚠️ Ne jamais « arrondir » une citation pour la rendre plus vendeuse. Une
 * phrase maladroite mais authentique convainc davantage qu'une phrase parfaite
 * — et elle est la seule qu'on puisse défendre si on la conteste.
 */
type Temoignage = {
  /** La citation, mot pour mot. Aucune retouche de fond. */
  citation: string;
  /** Prénom et nom réels, tels que la personne accepte d'être citée. */
  nom: string;
  /** Fonction exacte : « Directrice », « Secrétaire général », « Enseignant ». */
  fonction: string;
  /** Établissement réel, avec son accord de publication. */
  etablissement: string;
  /** Ville — utile au lecteur sénégalais, qui situe immédiatement. */
  ville: string;
};

/** ⚠️ Vide, et c'est exact : le pilote n'a pas commencé. Voir l'en-tête. */
const TEMOIGNAGES: Temoignage[] = [];

/**
 * Ce qu'une école du pilote donne et reçoit. Rien ici n'est un chiffre inventé :
 * ce sont des engagements de fonctionnement, tenables dès aujourd'hui.
 */
const PILOTE = [
  {
    titre: "Vous gardez la main",
    detail:
      "Vos données restent celles de votre établissement. Vous pouvez arrêter et récupérer vos documents à tout moment.",
  },
  {
    titre: "Nous corrigeons dans la semaine",
    detail:
      "Ce qui vous bloque passe avant ce qui était prévu. C'est le seul avantage qu'une petite équipe puisse réellement offrir.",
  },
  {
    titre: "Vous décidez de la suite",
    detail:
      "Les prochains chantiers sont arbitrés avec les écoles du pilote — présences, encaissement, envoi aux familles.",
  },
];

export default function SchoolStories() {
  const aDesTemoignages = TEMOIGNAGES.length > 0;

  return (
    <section id="ecoles" className="scroll-mt-20 border-t border-m-line bg-m-card">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Histoires d&apos;écoles
          </p>
          <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
            {aDesTemoignages
              ? "Ce que les écoles en disent."
              : "Les premières écoles écrivent cette page."}
          </h2>
        </div>

        {aDesTemoignages ? (
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TEMOIGNAGES.map((t) => (
              <figure
                key={`${t.nom}-${t.etablissement}`}
                className="flex flex-col rounded-[14px] border border-m-line bg-m-paper p-7"
              >
                <Quote aria-hidden="true" className="h-5 w-5 shrink-0 text-m-accent-deep" />
                <blockquote className="mt-4 flex-1 text-[15px] leading-[1.75] text-m-ink">
                  {t.citation}
                </blockquote>
                <figcaption className="mt-6 border-t border-m-line pt-4">
                  <p className="text-[14px] font-semibold text-m-ink">{t.nom}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-m-ink-soft">
                    {t.fonction} · {t.etablissement}, {t.ville}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div>
              {/* ⚠️ Le paragraphe le plus inhabituel de la page. Il dit qu'il n'y
                  a pas encore de clients. C'est vrai, c'est vérifiable, et une
                  directrice le découvrirait de toute façon en cherchant EduCom
                  ailleurs — mieux vaut qu'elle l'apprenne ici. */}
              <p className="text-[17px] leading-[1.75] text-m-ink-soft">
                EduCom démarre son pilote au Sénégal. Nous n&apos;avons donc pas encore de
                témoignages à publier, et nous préférons cette section vide à des citations
                fabriquées.
              </p>
              <p className="mt-5 text-[17px] leading-[1.75] text-m-ink-soft">
                Chaque témoignage publié ici portera un nom, une fonction et un établissement
                réels, avec l&apos;accord écrit de la personne citée. Chaque chiffre sera
                mesuré. C&apos;est la règle que nous nous appliquons, et elle vaut aussi pour
                tout le reste de cette page.
              </p>

              <Link
                href="/register"
                className="mt-9 inline-flex h-12 items-center gap-2 rounded-control bg-m-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-m-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-ink/40 focus-visible:ring-offset-2"
              >
                Rejoindre le pilote
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[14px] border border-m-line bg-m-paper p-7 sm:p-9">
              <h3 className="font-display text-[19px] font-bold text-m-ink">
                Ce que vous obtenez en entrant tôt
              </h3>
              <dl className="mt-6 space-y-6">
                {PILOTE.map((p) => (
                  <div key={p.titre} className="border-l-2 border-m-accent pl-4">
                    <dt className="text-[15px] font-semibold text-m-ink">{p.titre}</dt>
                    <dd className="mt-1.5 text-[14px] leading-[1.7] text-m-ink-soft">
                      {p.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
