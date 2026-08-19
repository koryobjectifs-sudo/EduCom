import { DOCUMENT_KINDS } from "@/lib/documents";

/**
 * Les documents qu'EduCom édite — addendum PLG. Remplace `FeatureGrid` et
 * `AnalyticsSection` sur `/features`.
 *
 * ═══ POURQUOI CES DEUX COMPOSANTS ONT ÉTÉ RETIRÉS ═══
 *
 * ⚠️ `AnalyticsSection` affichait **quatre statistiques inventées** — 342, 284,
 *    198, 124 — présentées comme l'activité d'une école. Le cahier des charges
 *    du chantier PLG l'interdit explicitement : « Ne jamais inventer : élèves ;
 *    classes ; parents ; statistiques ; documents. » Un chiffre faux sur une
 *    page publique est indéfendable, et celui-ci l'était quatre fois.
 * ⚠️ `FeatureGrid` annonçait un « **pipeline visuel et complet pour gérer les
 *    nouveaux candidats** » : le module Admissions n'existe pas. Il annonçait
 *    aussi un « suivi de lecture » des messages, impossible (lot 17).
 *
 * ═══ CE QUI LES REMPLACE ═══
 *
 * La liste réelle des générateurs, lue dans `src/lib/documents.ts`. Ce
 * catalogue est déjà comparé au contenu de `src/app/dashboard/documents/` par
 * un contrôle automatique : un document annoncé ici existe donc forcément dans
 * le produit. C'est la même règle que `RolesSection` — la page publique se
 * branche sur la source de vérité plutôt que de la paraphraser.
 *
 * ⚠️ Ne pas ajouter d'entrée « à venir » dans cette grille. Un document promis
 * au milieu de documents livrés est lu comme un document livré.
 */
const SUJET = {
  "élève": "Pour un élève",
  classe: "Pour une classe",
  facture: "Pour une facture",
} as const;

export default function DocumentsShowcase() {
  return (
    <section className="border-b border-m-line bg-m-paper-deep">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Les documents
          </p>
          <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
            Sept documents, à l&apos;en-tête de votre école.
          </h2>
          <p className="mt-6 text-[16px] leading-[1.7] text-m-ink-soft">
            Chacun reprend le nom, le logo, le cachet et la signature que vous avez
            enregistrés. Ils s&apos;impriment tels quels, et restent modifiables avant
            impression.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_KINDS.map((d) => (
            <div
              key={d.id}
              className="flex flex-col rounded-[14px] border border-m-line bg-m-card p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <d.icon aria-hidden="true" className="h-5 w-5 text-m-accent-deep" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-m-ink-faint">
                  {SUJET[d.subject]}
                </span>
              </div>
              <h3 className="mt-4 text-[17px] font-semibold leading-snug text-m-ink">
                {d.name}
              </h3>
              <p className="mt-2.5 text-[14px] leading-[1.7] text-m-ink-soft">
                {d.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
