import type { Bulletin, BulletinStudent } from "@/lib/bulletin";

/**
 * **Le bulletin — une seule feuille, un seul rendu.**
 *
 * ═══ CE QU'IL REMPLACE ═══
 *
 * Deux implémentations concurrentes produisaient le même document officiel :
 *
 *   · `documents/report-card/Generator.tsx` — matières **à plat**, aucun
 *     regroupement, « Note /20 » en dur, « Absences: 0 » et « Retards: 0 »
 *     écrits en dur alors qu'aucune donnée de présence n'existe au schéma, et
 *     une appréciation par défaut « Excellent travail. » appliquée à **tous**
 *     les élèves.
 *   · `documents/validation/impression/PrintClient.tsx` — avec regroupements et
 *     moyennes de groupe, mais année scolaire figée à « 2023-2024 ».
 *
 * Les deux consomment désormais cette feuille, alimentée par `buildBulletin()`.
 * Un élève ne peut plus avoir deux moyennes selon l'écran qui l'affiche.
 *
 * ═══ TROIS RÈGLES DE VÉRITÉ ═══
 *
 * ⚠️ **Le barème vient des notes** (`bulletin.scale`), jamais de « /20 ».
 * ⚠️ **Aucune assiduité n'est imprimée** tant qu'aucun modèle de présence
 *    n'existe. Un « Absences : 0 » sur un document officiel est un faux.
 * ⚠️ **Une matière non notée affiche « — »**, jamais 0.
 */

const fmt = (v: number | null, digits = 2) => (v === null ? "—" : v.toFixed(digits));

function rankLabel(rank: number | null): string {
  if (rank === null) return "Non classé";
  return rank === 1 ? "1er" : `${rank}ème`;
}

export function BulletinSheet({
  student,
  bulletin,
  school,
  className,
  termName,
  evaluationName,
  isComposition,
  academicYear,
  /** Rendu par le champ éditable côté client, quand l'écran le permet. */
  councilSlot,
  hidden = false,
}: {
  student: BulletinStudent;
  bulletin: Bulletin;
  school: { name?: string | null; logo?: string | null; signature?: string | null; stamp?: string | null } | null;
  className: string;
  termName: string;
  evaluationName: string;
  isComposition: boolean;
  academicYear: string;
  councilSlot?: React.ReactNode;
  hidden?: boolean;
}) {
  const scale = bulletin.scale;

  return (
    <div
      className={`relative flex flex-col bg-white p-10 print:break-before-page print:p-0 ${hidden ? "print:hidden" : ""}`}
      style={{ minHeight: "297mm" }}
    >
      {/* ── En-tête ── */}
      <header className="z-10 mb-8 flex items-start justify-between border-b-2 border-gray-900 pb-6">
        <div className="flex items-center gap-4">
          {school?.logo ? (
            <img src={school.logo} alt="" className="h-16 object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-900 text-3xl font-semibold text-white">
              {school?.name?.charAt(0) ?? "E"}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">
              {school?.name ?? "—"}
            </h2>
            {/* Année déduite du calendrier scolaire, jamais écrite en dur. */}
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Année scolaire {academicYear}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
            {isComposition ? "Bulletin de composition" : "Bulletin de notes"}
          </h1>
          <p className="mt-1 text-base font-semibold uppercase tracking-widest text-gray-500">
            {evaluationName} ({termName})
          </p>
        </div>
      </header>

      <div className="flex flex-grow flex-col">
        {/* ── Élève et repères de classe ── */}
        <div className="mb-8 grid grid-cols-2 gap-8 rounded-lg border border-gray-200 bg-gray-50/50 p-6 print:border-none print:bg-transparent print:p-0">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Nom de l'élève</p>
            <p className="text-xl font-black text-gray-900">
              {student.lastName.toUpperCase()} {student.firstName}
            </p>
            {student.dateOfBirth && (
              <p className="mt-1 text-sm text-gray-600">
                Né(e) le {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-right">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Classe</p>
              <p className="text-lg font-bold text-gray-900">{className}</p>
              <p className="mt-1 text-xs text-gray-500">Effectif : {bulletin.headcount}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Moy. classe</p>
              <p className="text-lg font-bold tabular-nums text-gray-900">{fmt(bulletin.classAverage)}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Extrêmes</p>
              <p className="text-sm font-bold tabular-nums text-gray-900">
                {fmt(bulletin.best)} / {fmt(bulletin.worst)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Résultats par matière ── */}
        <div className="relative mt-2 flex-grow">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="w-1/3 border-b-2 border-gray-900 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-900">Matière</th>
                <th className="w-12 border-b-2 border-gray-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-900">Coef</th>
                {/* Le barème réel, pas « /20 ». */}
                <th className="w-20 border-b-2 border-gray-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-900">Note /{scale}</th>
                <th className="w-24 border-b-2 border-gray-900 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-900">Moy. classe</th>
                <th className="border-b-2 border-gray-900 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-900">Appréciations</th>
              </tr>
            </thead>
            <tbody>
              {student.blocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs italic text-gray-400">
                    Aucune matière n'est rattachée à cette classe.
                  </td>
                </tr>
              ) : (
                student.blocks.flatMap((block) => {
                  const lines = block.lines.map((l) => (
                    <tr key={l.subjectId}>
                      <td className={`border-b border-gray-200 px-2 py-2 text-xs text-gray-800 ${block.title ? "pl-6 font-medium" : "font-semibold"}`}>
                        {l.name}
                      </td>
                      <td className="border-b border-gray-200 px-2 py-2 text-center text-xs font-medium tabular-nums text-gray-600">
                        {l.coefficient ?? "—"}
                      </td>
                      <td className="border-x border-b border-gray-200 bg-gray-50/30 px-2 py-2 text-center text-sm font-bold tabular-nums">
                        {fmt(l.average)}
                      </td>
                      <td className="border-b border-gray-200 px-2 py-2 text-center text-xs tabular-nums text-gray-500">
                        {fmt(l.classAverage)}
                      </td>
                      <td className="border-b border-gray-200 px-2 py-2 text-xs italic text-gray-700">{l.comment ?? ""}</td>
                    </tr>
                  ));

                  // Un groupe (Français, Mathématiques…) porte sa moyenne ; une
                  // matière notée seule n'a pas d'en-tête à afficher.
                  if (!block.title) return lines;
                  return [
                    <tr key={`${block.key}-h`} className="bg-gray-100 print:bg-gray-100">
                      <td className="px-2 py-1.5 text-[11px] font-black uppercase tracking-wide text-gray-900">{block.title}</td>
                      <td />
                      <td className="px-2 py-1.5 text-center font-black tabular-nums text-gray-900">{fmt(block.groupAverage)}</td>
                      <td />
                      <td className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-gray-500">Moyenne du groupe</td>
                    </tr>,
                    ...lines,
                  ];
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="border-b-2 border-gray-900 px-2 py-4 text-right text-xs font-black uppercase text-gray-900">
                  Moyenne générale
                </td>
                <td className="border-x-2 border-b-2 border-gray-900 bg-gray-100 px-2 py-4 text-center text-lg font-black tabular-nums">
                  {fmt(student.general)}
                </td>
                <td colSpan={2} className="border-b-2 border-gray-900 px-4 py-4 text-xs font-black uppercase text-gray-900">
                  Rang : {rankLabel(student.rank)} / {bulletin.headcount}
                </td>
              </tr>
            </tfoot>
          </table>

          {student.filled < student.expected && (
            <p className="mt-2 text-[11px] italic text-gray-500">
              {student.expected - student.filled} matière
              {student.expected - student.filled > 1 ? "s" : ""} sans note à ce jour.
            </p>
          )}
        </div>

        {/* ── Avis du conseil et signatures ──
             ⚠️ Aucun bloc « Vie scolaire ». Les absences et retards ne sont pas
             suivis dans EduCom : imprimer « Absences : 0 » ferait dire au
             document officiel quelque chose que personne n'a constaté. */}
        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Avis du conseil</p>
            {councilSlot ?? (
              <div className="min-h-[64px] rounded-lg border border-gray-200 p-3 text-xs italic leading-relaxed text-gray-700 print:border-gray-300">
                {student.generalComment?.trim()
                  ? student.generalComment
                  : <span className="text-gray-400">Aucune appréciation renseignée.</span>}
              </div>
            )}
          </div>
          <div className="relative flex flex-col text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">La direction</span>
            {school?.signature && (
              <div className="absolute bottom-4 right-4 h-16 opacity-80">
                <img src={school.signature} alt="" className="h-full object-contain" />
              </div>
            )}
            {school?.stamp && (
              <div className="absolute bottom-2 right-24 h-20 opacity-40">
                <img src={school.stamp} alt="" className="h-full object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
