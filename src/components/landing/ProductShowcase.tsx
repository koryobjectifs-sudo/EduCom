import { ClipboardCheck, FileCheck2, Receipt, Users } from "lucide-react";

/**
 * Le produit, en image — refonte du 4 septembre 2026, sur demande explicite
 * de Kory (« une refonte spectaculaire », références Veracross et EduPage).
 *
 * ═══ CE QUE CES DEUX SITES FONT, ET CE QUE J'EN GARDE ═══
 *
 * Capturés en réel avant d'écrire ce fichier (`scripts/_zz-ref-shots.ts`,
 * jetable, supprimé après usage) : Veracross ouvre sur une photo plein cadre
 * puis prouve la promesse par une capture du produit (« Veracross turns siloed
 * operations into connected workflows ») ; EduPage encadre chaque module dans
 * un ordinateur portable dessiné. Le geste commun, au-delà du style : **montrer
 * l'outil avant de le décrire**. C'est le geste qu'on reprend ici.
 *
 * ═══ CE QU'ON N'EN GARDE PAS ═══
 *
 * ⚠️ Ni photo de salle de classe, ni logo d'établissement partenaire : EduCom
 * n'a ni banque d'images de ses propres écoles, ni client à citer
 * (`SchoolStories.tsx` — le pilote n'a pas commencé). Emprunter une photo
 * de banque d'images générique aurait simulé une preuve sociale qui n'existe
 * pas. On préfère montrer l'écran réel.
 *
 * ═══ POURQUOI UNE MAQUETTE, ET PAS UNE CAPTURE D'ÉCRAN RÉELLE ═══
 *
 * `HeroProduct.tsx` a déjà tranché cette question (voir son en-tête) : le
 * produit s'adapte à la couleur de chaque école, une capture figerait un choix
 * qui n'est pas universel. Même geste ici, mêmes garde-fous : deux panneaux,
 * clairement étiquetés EXEMPLE, avec des chiffres ronds et non attribuables à
 * une école réelle — jamais présentés comme une mesure EduCom.
 */
export default function ProductShowcase() {
  return (
    <section className="border-t border-m-line bg-m-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Le produit, en image
          </p>
          <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
            L&apos;écran que votre secrétariat ouvrira chaque matin.
          </h2>
          <p className="mt-6 text-[16px] leading-[1.7] text-m-ink-soft">
            Pas une maquette de vente : la même densité, la même structure que ce que vous
            verrez le premier jour.
          </p>
        </div>

        <div className="relative mt-16 lg:mt-20">
          {/* Panneau principal — le tableau de bord. */}
          <div className="relative overflow-hidden rounded-[16px] border border-m-line bg-m-card shadow-m-lift lg:mr-24">
            {/* Barre de fenêtre — trois pastilles, une adresse. Le vocabulaire
                exact d'EduPage et Veracross pour dire « c'est le produit »,
                réduit à trois pixels colorés plutôt qu'à une photo de matériel
                qui daterait la page en six mois. */}
            <div className="flex items-center gap-3 border-b border-m-line-soft bg-m-paper-deep px-4 py-2.5">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-m-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-m-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-m-line" />
              </span>
              <span className="flex-1 truncate rounded-control bg-m-card px-3 py-1 text-center text-[12px] text-m-ink-faint ring-1 ring-inset ring-m-line-soft">
                app.educom.school/dashboard
              </span>
              <span className="hidden shrink-0 rounded-pill bg-m-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white sm:inline-block">
                Exemple
              </span>
            </div>

            <div className="p-5 sm:p-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {[
                  { icon: Users, label: "Élèves inscrits", valeur: "312" },
                  { icon: FileCheck2, label: "Dossiers conformes", valeur: "88 %" },
                  { icon: Receipt, label: "Encaissé ce mois", valeur: "2 450 000 F" },
                  { icon: ClipboardCheck, label: "Absences aujourd'hui", valeur: "6" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-[12px] border border-m-line bg-m-paper p-4"
                  >
                    <kpi.icon aria-hidden="true" className="h-[18px] w-[18px] text-m-accent-deep" />
                    <p className="mt-3 font-display text-[1.5rem] font-bold leading-none tabular-nums text-m-ink sm:text-[1.75rem]">
                      {kpi.valeur}
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-snug text-m-ink-faint">{kpi.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[12px] border border-m-line bg-m-paper p-4 sm:mt-6 sm:p-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-m-ink-faint">
                  Dernières activités
                </p>
                <ul className="mt-3.5 divide-y divide-m-line-soft">
                  {[
                    ["Bulletin généré", "CM2 · Fatou Diop", "il y a 4 min"],
                    ["Facture réglée", "6e A · Reçu #0231", "il y a 22 min"],
                    ["Présences enregistrées", "CE1", "il y a 1 h"],
                  ].map(([action, detail, quand]) => (
                    <li key={action} className="flex items-center justify-between gap-4 py-2.5 text-[13.5px]">
                      <span className="min-w-0">
                        <span className="block font-medium text-m-ink">{action}</span>
                        <span className="block truncate text-m-ink-faint">{detail}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-m-ink-faint">{quand}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Second panneau — le bulletin, en aperçu partiel derrière/sous le
              premier. Même geste que la pile de certificats du hero : ce
              n'est pas un second produit, c'est ce que le premier écran
              produit une fois ouvert. */}
          <div className="relative z-10 mx-auto -mt-10 w-[86%] overflow-hidden rounded-[14px] border border-m-line bg-m-card shadow-m-lift sm:w-[70%] lg:absolute lg:-bottom-10 lg:-right-6 lg:mt-0 lg:w-[360px]">
            <div className="flex items-center justify-between gap-3 border-b border-m-line-soft bg-m-paper-deep px-4 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-m-ink-faint">
                Bulletin · CM2
              </span>
              <span className="rounded-pill bg-m-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                Exemple
              </span>
            </div>
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-m-line-soft">
                {[
                  ["Mathématiques", "14,5"],
                  ["Français", "13"],
                  ["Anglais", "16"],
                  ["Sciences de la vie", "12,5"],
                ].map(([matiere, note]) => (
                  <tr key={matiere}>
                    <td className="px-4 py-2 text-m-ink-soft">{matiere}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-m-ink">{note}</td>
                  </tr>
                ))}
                <tr className="bg-m-paper">
                  <td className="px-4 py-2.5 font-semibold text-m-ink">Moyenne générale</td>
                  <td className="px-4 py-2.5 text-right font-display text-[15px] font-bold tabular-nums text-m-accent-deep">
                    14,0
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-14 max-w-2xl text-[13px] leading-relaxed text-m-ink-faint lg:mt-10">
          Aperçu illustratif : structure réelle du produit, chiffres d&apos;exemple. Aucun de
          ces deux écrans ne provient d&apos;un établissement existant.
        </p>
      </div>
    </section>
  );
}
