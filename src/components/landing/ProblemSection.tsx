import { FolderKanban, MessagesSquare, NotebookPen } from "lucide-react";

/**
 * Le problème — chantier PLG, réécrit par l'addendum.
 *
 * ═══ CE QUI ÉTAIT AFFICHÉ ═══
 *
 * ⚠️ Trois cartes `rounded-3xl` avec pastille d'icône grise, une texture de
 * points en base64 qui apparaissait au survol, un fondu `framer-motion` par
 * carte, et une flèche `animate-bounce` en bas de section. Cinq effets pour
 * trois phrases : la définition même du « template SaaS généré ».
 *
 * ⚠️ Le composant était `"use client"` **uniquement pour animer des fondus**.
 * Il redevient un composant serveur : trois cartes de texte n'ont aucune raison
 * de coûter du JavaScript à une directrice en 3G.
 *
 * ═══ CE QUI LE REMPLACE ═══
 *
 * Une **liste numérotée éditoriale**. Le constat n'a pas besoin d'être joli, il
 * a besoin d'être reconnu : chaque ligne doit provoquer un « c'est exactement
 * ça ». Le texte est resté celui du chantier PLG, qui décrit des situations
 * réelles d'écoles — pas des douleurs inventées pour vendre.
 */
const CONSTATS = [
  {
    icon: FolderKanban,
    titre: "L'administration est dispersée",
    detail:
      "Les informations élèves, les documents et les opérations vivent entre plusieurs outils, des classeurs et des fichiers Excel.",
  },
  {
    icon: MessagesSquare,
    titre: "La communication est fragmentée",
    detail:
      "Ce qui compte se perd entre les groupes WhatsApp, les SMS et les appels — et personne ne sait qui a reçu quoi.",
  },
  {
    icon: NotebookPen,
    titre: "Le suivi est difficile",
    detail:
      "Paiements, dossiers d'élèves, documents officiels et bulletins vivent dans des cahiers et des fichiers séparés.",
  },
];

export default function ProblemSection() {
  return (
    <section className="bg-m-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
              Le point de départ
            </p>
            <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
              Une école ne devrait pas fonctionner avec dix outils différents.
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-[1.7] text-m-ink-soft">
              Entre WhatsApp, Excel, les cahiers, les PDF et les applications de paiement, la
              gestion quotidienne devient un travail à part entière — celui de retrouver
              l&apos;information.
            </p>
          </div>

          <ol className="divide-y divide-m-line border-y border-m-line">
            {CONSTATS.map((c, i) => (
              <li key={c.titre} className="flex gap-5 py-7 first:pt-0 last:pb-0 sm:gap-7">
                <span
                  aria-hidden="true"
                  className="mt-1 shrink-0 font-display text-[15px] font-bold tabular-nums text-m-ink-faint"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2.5 text-[17px] font-semibold text-m-ink">
                    <c.icon aria-hidden="true" className="h-[18px] w-[18px] text-m-accent-deep" />
                    {c.titre}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-[1.7] text-m-ink-soft">{c.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
