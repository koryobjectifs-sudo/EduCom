"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  AppreciationCell,
  CalculationRule,
  ComputedCell,
  ContextChips,
  ContextField,
  ContextSelect,
  ContextValue,
  EntryHead,
  EntryHeader,
  EntryHelp,
  EntryRow,
  EntryTable,
  NoteCell,
  StudentCell,
  Th,
  type SaveState,
} from "@/components/grades/entry/GradeEntryKit";
import {
  saveDevoirGrade,
  saveCompositionGrade,
  saveSubjectAppreciation,
  type SecondaireContext,
} from "./actions";
import { calculerMatiereSecondaire } from "@/lib/notes/secondaire";

type Ctx = Extract<SecondaireContext, { ok: true }>;
type CellState = SaveState;
const SLOTS = [0, 1, 2] as const;

type LigneEtat = {
  devoirs: (string | null)[]; // gradeId par slot, null si vide
  devoirValues: string[]; // texte affiché par slot
  compositionId: string | null;
  compositionValue: string;
  appreciation: string;
};

export default function SecondaireTable({ ctx }: { ctx: Ctx }) {
  const router = useRouter();

  const [lignes, setLignes] = useState<Record<string, LigneEtat>>(() =>
    Object.fromEntries(
      ctx.lignes.map((l) => {
        const devoirs: (string | null)[] = [null, null, null];
        const devoirValues = ["", "", ""];
        l.devoirs.slice(0, 3).forEach((d, i) => {
          devoirs[i] = d.gradeId;
          devoirValues[i] = String(d.value);
        });
        return [
          l.studentId,
          {
            devoirs,
            devoirValues,
            compositionId: l.composition?.gradeId ?? null,
            compositionValue: l.composition ? String(l.composition.value) : "",
            appreciation: l.appreciation,
          },
        ];
      }),
    ),
  );

  // ⚠️ Aucun effet de resynchronisation sur `ctx` : la page remonte ce composant
  // par sa `key` (classe-matière-trimestre). Un tel effet écraserait une saisie
  // en cours — piège déjà payé dans `FastEntry` (voir context.md).

  const notesCount = useMemo(() => {
    let count = 0;
    for (const l of Object.values(lignes)) {
      for (const v of l.devoirValues) {
        if (v.trim() !== "") count++;
      }
      if (l.compositionValue.trim() !== "") count++;
    }
    return count;
  }, [lignes]);

  const [states, setStates] = useState<Record<string, CellState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setState = (key: string, s: CellState, err?: string) => {
    setStates((p) => ({ ...p, [key]: s }));
    setErrors((p) => {
      const n = { ...p };
      if (err) n[key] = err;
      else delete n[key];
      return n;
    });
  };

  const mmDe = useCallback(
    (studentId: string) => {
      const l = lignes[studentId];
      if (!l) return { md: null as number | null, mm: null as number | null, incluse: false, aDesDevoirs: false };
      const devoirs = l.devoirValues.filter((v) => v.trim() !== "").map(Number).filter(Number.isFinite);
      const composition = l.compositionValue.trim() === "" ? null : Number(l.compositionValue);
      const r = calculerMatiereSecondaire({
        subjectId: ctx.subjectId,
        name: ctx.subjectName,
        coefficient: ctx.coefficient,
        devoirs,
        composition,
      });
      return { md: r.md, mm: r.mm, incluse: r.incluse, aDesDevoirs: devoirs.length > 0 };
    },
    [lignes, ctx.subjectId, ctx.subjectName, ctx.coefficient],
  );

  const commitDevoir = async (studentId: string, slot: number, raw: string) => {
    const key = `d${slot}:${studentId}`;
    const text = raw.trim().replace(",", ".");
    const value = text === "" ? null : Number(text);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 20)) {
      setState(key, "error", "Entre 0 et 20");
      return;
    }
    setState(key, "saving");
    const res = await saveDevoirGrade({
      gradeId: lignes[studentId]?.devoirs[slot] ?? null,
      studentId,
      classId: ctx.classId,
      subjectId: ctx.subjectId,
      termId: ctx.termId,
      value,
    });
    if (!res.ok) {
      setState(key, "error", res.error);
      return;
    }
    setLignes((p) => {
      const l = { ...p[studentId] };
      l.devoirs = [...l.devoirs];
      l.devoirs[slot] = res.gradeId;
      return { ...p, [studentId]: l };
    });
    setState(key, "saved");
  };

  const commitComposition = async (studentId: string, raw: string) => {
    const key = `c:${studentId}`;
    const text = raw.trim().replace(",", ".");
    const value = text === "" ? null : Number(text);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 20)) {
      setState(key, "error", "Entre 0 et 20");
      return;
    }
    setState(key, "saving");
    const res = await saveCompositionGrade({
      gradeId: lignes[studentId]?.compositionId ?? null,
      studentId,
      classId: ctx.classId,
      subjectId: ctx.subjectId,
      termId: ctx.termId,
      value,
    });
    if (!res.ok) {
      setState(key, "error", res.error);
      return;
    }
    setLignes((p) => ({
      ...p,
      [studentId]: { ...p[studentId], compositionId: res.gradeId },
    }));
    setState(key, "saved");
  };

  const commitAppreciation = async (studentId: string, comment: string) => {
    const key = `a:${studentId}`;
    setState(key, "saving");
    const res = await saveSubjectAppreciation({
      studentId,
      classId: ctx.classId,
      subjectId: ctx.subjectId,
      termId: ctx.termId,
      comment,
    });
    setState(key, res.ok ? "saved" : "error", res.ok ? undefined : res.error);
  };

  const cell = (k: string) => ({ state: states[k] ?? ("idle" as const), error: errors[k] });
  const url = (classId: string, subjectId: string | null, termId: string) =>
    `/dashboard/grades/secondaire?class=${classId}${subjectId ? `&subject=${subjectId}` : ""}&term=${termId}`;

  const handleSubmit = () => {
    let missingCompo = 0;
    for (const l of Object.values(lignes)) {
      const devoirs = l.devoirValues.filter((v) => v.trim() !== "");
      if (devoirs.length > 0 && l.compositionValue.trim() === "") {
        missingCompo++;
      }
    }
    if (missingCompo > 0) {
      toast.warning(`${missingCompo} élève(s) ont des devoirs mais pas de note de composition.`);
    } else {
      toast.success(`Saisie de ${ctx.subjectName} validée et transmise à l'administration.`);
    }
  };

  return (
    <div className="space-y-4">
      {!ctx.canEdit && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 shadow-2xs">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold">Mode consultation active (lecture seule)</span>
            <span className="text-amber-700 ml-1.5">
              — Seul l&apos;enseignant affecté à cette matière peut saisir ou modifier les notes des élèves.
            </span>
          </div>
        </div>
      )}

      <EntryHeader
        title={ctx.subjectName}
        classLabel={ctx.className}
        coefficient={ctx.coefficient}
        notesCount={notesCount}
        meta={`${ctx.termName} · ${ctx.lignes.length} élève${ctx.lignes.length > 1 ? "s" : ""}`}
        terms={ctx.allTerms}
        activeTermId={ctx.termId}
        termHref={(termId) => url(ctx.classId, ctx.subjectId, termId)}
      >
        <ContextField label="Classe">
          {ctx.allClasses.length > 1 ? (
            <ContextSelect
              ariaLabel="Classe"
              value={ctx.classId}
              onChange={(classId) => router.push(url(classId, null, ctx.termId))}
              options={ctx.allClasses.map((c) => ({ id: c.id, label: c.name }))}
            />
          ) : (
            <ContextValue>{ctx.className}</ContextValue>
          )}
        </ContextField>
        <ContextField label="Matière" icon={<BookOpen aria-hidden="true" className="h-3 w-3" />}>
          {ctx.allSubjects.length > 1 ? (
            <ContextChips
              activeId={ctx.subjectId}
              href={(subjectId) => url(ctx.classId, subjectId, ctx.termId)}
              options={ctx.allSubjects.map((s) => ({
                id: s.id,
                label: `${s.name}${s.coefficient != null ? ` (coef ${s.coefficient})` : ""}`,
              }))}
            />
          ) : (
            <ContextValue>
              {ctx.subjectName}
              {ctx.coefficient != null ? ` (coef ${ctx.coefficient})` : ""}
            </ContextValue>
          )}
        </ContextField>

        {ctx.canEdit && (
          <div className="sm:ml-auto">
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Soumettre la saisie</span>
            </button>
          </div>
        )}
      </EntryHeader>

      <EntryTable caption={`Notes de ${ctx.subjectName} — ${ctx.className}, ${ctx.termName}`}>
        <EntryHead>
          <tr>
            <Th kind="student">Élève</Th>
            {SLOTS.map((s) => (
              <Th key={s} kind="note">
                Devoir {s + 1}
              </Th>
            ))}
            <Th kind="key">Composition *</Th>
            <Th kind="computed">MM (Moy)</Th>
            <Th kind="text">Appréciation du professeur</Th>
          </tr>
        </EntryHead>
        <tbody>
          {ctx.lignes.map((ligne, rowIdx) => {
            const l = lignes[ligne.studentId];
            const { mm, aDesDevoirs, incluse } = mmDe(ligne.studentId);
            const isMissingComposition = aDesDevoirs && !incluse;
            const nom = `${ligne.firstName} ${ligne.lastName}`;

            return (
              <EntryRow key={ligne.studentId}>
                <StudentCell lastName={ligne.lastName} firstName={ligne.firstName} />
                {SLOTS.map((slot) => (
                  <NoteCell
                    key={slot}
                    row={rowIdx}
                    col={`d${slot}`}
                    readOnly={!ctx.canEdit}
                    ariaLabel={`Devoir ${slot + 1} de ${nom}, sur 20`}
                    value={l?.devoirValues[slot] ?? ""}
                    {...cell(`d${slot}:${ligne.studentId}`)}
                    onChange={(raw) =>
                      setLignes((p) => {
                        const nl = { ...p[ligne.studentId] };
                        nl.devoirValues = [...nl.devoirValues];
                        nl.devoirValues[slot] = raw;
                        return { ...p, [ligne.studentId]: nl };
                      })
                    }
                    onBlur={(raw) => commitDevoir(ligne.studentId, slot, raw)}
                  />
                ))}
                <NoteCell
                  row={rowIdx}
                  col="compo"
                  emphasis="key"
                  readOnly={!ctx.canEdit}
                  warning={isMissingComposition}
                  hint="Compo requise"
                  ariaLabel={`Composition de ${nom}, sur 20`}
                  value={l?.compositionValue ?? ""}
                  {...cell(`c:${ligne.studentId}`)}
                  onChange={(raw) =>
                    setLignes((p) => ({
                      ...p,
                      [ligne.studentId]: { ...p[ligne.studentId], compositionValue: raw },
                    }))
                  }
                  onBlur={(raw) => commitComposition(ligne.studentId, raw)}
                />
                <ComputedCell value={mm} hint={aDesDevoirs ? "Non comptée" : undefined} />
                <AppreciationCell
                  ariaLabel={`Appréciation de ${nom}`}
                  value={l?.appreciation ?? ""}
                  readOnly={!ctx.canEdit}
                  {...cell(`a:${ligne.studentId}`)}
                  onChange={(text) =>
                    setLignes((p) => ({
                      ...p,
                      [ligne.studentId]: { ...p[ligne.studentId], appreciation: text },
                    }))
                  }
                  onBlur={(text) => commitAppreciation(ligne.studentId, text)}
                />
              </EntryRow>
            );
          })}
        </tbody>
      </EntryTable>

      <EntryHelp />

      {/* Règle de `calculerMatiereSecondaire` (lib/notes/secondaire.ts) — à garder alignée sur le moteur. */}
      <CalculationRule>
        MM = (Moyenne des devoirs + Composition) / 2. Les devoirs (1 à 3) sont optionnels : sans devoir, MM =
        Composition. La <strong>composition est obligatoire</strong> pour que la matière soit prise en compte dans la
        moyenne générale.
      </CalculationRule>
    </div>
  );
}
