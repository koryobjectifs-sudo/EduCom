"use client";

import { useState, useTransition } from "react";
import { Printer, Check, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { BulletinSheet } from "@/components/grades/BulletinSheet";
import { saveCouncilComment } from "@/app/dashboard/grades/actions";
import type { Bulletin } from "@/lib/bulletin";

/**
 * Aperçu et impression des bulletins.
 *
 * ═══ CE QUE CE COMPOSANT NE FAIT PLUS ═══
 *
 * Il calculait lui-même moyennes, rangs et moyenne de classe, **à plat**, sans
 * regroupement — pendant que l'impression du secrétariat faisait le même calcul
 * autrement, avec les groupes. Deux versions du même document officiel. Tout le
 * calcul est parti dans `buildBulletin()` et tout le rendu dans
 * `BulletinSheet` : ce fichier ne garde que l'impression et l'avis du conseil.
 *
 * Trois fictions ont disparu au passage, toutes documentées dans l'audit du
 * 21 août : « Absences: 0 jour(s) », « Retards: 0 » (aucun modèle de présence
 * n'existe) et l'appréciation par défaut « Excellent travail. » appliquée à
 * tous les élèves.
 *
 * ⚠️ **La sélection passe par l'URL**, plus par un état React. C'est ce qui
 * répare les `searchParams` : quatre écrans envoyaient déjà `classId`, `termId`
 * ou `studentId` au générateur, qui les jetait.
 */
export default function ReportCardGenerator({
  bulletin, klass, term, evaluation, academicYear, school, canEditCouncil, focusStudentId,
}: {
  bulletin: Bulletin;
  klass: { id: string; name: string };
  term: { id: string; name: string };
  evaluation: { id: string; name: string; isComposition: boolean } | null;
  academicYear: string;
  school: { name?: string | null; logo?: string | null; signature?: string | null; stamp?: string | null } | null;
  canEditCouncil: boolean;
  focusStudentId: string | null;
}) {
  const [printOnly, setPrintOnly] = useState<string | null>(focusStudentId);

  const students = focusStudentId
    ? bulletin.students.filter((s) => s.studentId === focusStudentId)
    : bulletin.students;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-rule bg-surface px-4 py-3 shadow-card print:hidden">
        <div className="min-w-0">
          <p className="text-role-body font-semibold text-text">
            {students.length} bulletin{students.length > 1 ? "s" : ""} — {klass.name}
          </p>
          <p className="text-role-meta text-text-soft">
            {term.name}
            {evaluation ? ` · ${evaluation.name}` : " · toutes les évaluations du trimestre"}
            {" · barème /"}{bulletin.scale}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {printOnly && (
            <button
              onClick={() => setPrintOnly(null)}
              className="rounded-control border border-rule bg-surface px-3 py-2 text-role-meta font-medium text-text-soft transition-colors hover:text-primary"
            >
              Tout afficher
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-role-body font-semibold text-white transition-all duration-200 hover:bg-primary-hover"
          >
            <Printer aria-hidden="true" className="h-4 w-4" />
            Imprimer
          </button>
        </div>
      </div>

      {bulletin.mixedScales && (
        <p className="flex items-start gap-2 rounded-control border border-warning/20 bg-warning/10 px-3.5 py-2.5 text-role-meta text-warning print:hidden">
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Plusieurs barèmes cohabitent dans cette classe. Les moyennes sont ramenées sur /{bulletin.scale}.
        </p>
      )}

      {students.length === 0 ? (
        <p className="rounded-surface border border-dashed border-rule bg-ground px-4 py-8 text-center text-role-body text-text-soft print:hidden">
          Aucun élève inscrit dans cette classe.
        </p>
      ) : (
        <div className="space-y-6 print:space-y-0">
          {students.map((s) => (
            <div key={s.studentId} className="rounded-surface border border-rule shadow-card print:border-none print:shadow-none">
              <BulletinSheet
                student={s}
                bulletin={bulletin}
                school={school}
                className={klass.name}
                termName={term.name}
                evaluationName={evaluation?.name ?? `Trimestre ${term.name}`}
                isComposition={evaluation?.isComposition ?? true}
                academicYear={academicYear}
                hidden={printOnly !== null && printOnly !== s.studentId}
                councilSlot={
                  canEditCouncil && evaluation ? (
                    <CouncilField
                      studentId={s.studentId}
                      classId={klass.id}
                      termId={term.id}
                      evaluationId={evaluation.id}
                      initial={s.generalComment ?? ""}
                    />
                  ) : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * L'avis du conseil — **enregistré**, contrairement au `contentEditable` qu'il
 * remplace.
 *
 * ⚠️ Sauvegarde à la perte du focus, pas à chaque frappe : un avis se rédige,
 * il ne se saisit pas au kilomètre. L'état d'enregistrement est affiché — sans
 * quoi la directrice ne saurait pas si son texte est parti.
 */
function CouncilField({
  studentId, classId, termId, evaluationId, initial,
}: {
  studentId: string; classId: string; termId: string; evaluationId: string; initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<string>(initial);
  const [pending, start] = useTransition();

  const commit = () => {
    if (value.trim() === saved.trim()) return;
    start(async () => {
      const r = await saveCouncilComment({ studentId, classId, termId, evaluationId, comment: value });
      if (r?.error) { toast.error(r.error); return; }
      setSaved(value);
      toast.success("Avis du conseil enregistré.");
    });
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        rows={3}
        placeholder="Aucune appréciation renseignée."
        className="min-h-[64px] w-full rounded-lg border border-gray-200 p-3 text-xs italic leading-relaxed text-gray-800 outline-none transition-colors focus:border-gray-400 print:border-gray-300 print:focus:border-gray-300"
      />
      <span className="absolute bottom-2 right-2 text-[10px] text-gray-400 print:hidden">
        {pending
          ? <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
          : value.trim() === saved.trim() && saved.trim()
            ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> Enregistré</span>
            : null}
      </span>
    </div>
  );
}
