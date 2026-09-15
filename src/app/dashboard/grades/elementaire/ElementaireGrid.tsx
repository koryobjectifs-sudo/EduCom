"use client";

import { Fragment, memo, useCallback, useMemo, useRef, useState } from "react";
import { Check, Loader2, TriangleAlert, Award, Search } from "lucide-react";
import { saveSubDisciplineGrade, saveTitulaireAppreciation, type ElementaireContext } from "./actions";
import { calculerEleveElementaire, type SousDisciplineInput } from "@/lib/notes/elementaire";

type Ctx = Extract<ElementaireContext, { ok: true }>;
type CellState = "idle" | "saving" | "saved" | "error";

/**
 * Grille de saisie élémentaire — élèves en lignes, sous-disciplines en
 * colonnes groupées par domaine.
 *
 * ⚠️ **Calculs du lot 2 branchés directement** : `calculerEleveElementaire`
 * assure le recalcul en direct des moyennes de domaine et de la moyenne générale.
 *
 * ⚠️ **Une case vide reste vide.** `""` efface la note (chemin `value: null`),
 * jamais un 0 — les sous-disciplines non notées sont exclues du calcul.
 *
 * ⚠️ **Optimisation 60 élèves × 15 matières** : Chaque ligne élève est isolée
 * et mémorisée. La saisie d'une cellule ne ré-évalue que sa propre ligne, sans
 * saccade sur les 900 cellules du tableau.
 */
export default function ElementaireGrid({ ctx }: { ctx: Ctx }) {
  const [notes, setNotes] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(
      ctx.eleves.map((e) => [
        e.studentId,
        Object.fromEntries(Object.entries(e.notes).map(([sdId, v]) => [sdId, String(v)])),
      ]),
    ),
  );

  const [gradeIds, setGradeIds] = useState<Record<string, Record<string, string | null>>>(() =>
    Object.fromEntries(ctx.eleves.map((e) => [e.studentId, { ...e.gradeIds }])),
  );

  const [states, setStates] = useState<Record<string, CellState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const cellKey = (studentId: string, sdId: string) => `${studentId}:${sdId}`;

  const commit = useCallback(
    async (studentId: string, sdId: string, raw: string, scale: number) => {
      const key = cellKey(studentId, sdId);
      const text = raw.trim().replace(",", ".");
      const value = text === "" ? null : Number(text);

      if (value !== null && (!Number.isFinite(value) || value < 0 || value > scale)) {
        setStates((s) => ({ ...s, [key]: "error" }));
        setErrors((e) => ({ ...e, [key]: `Entre 0 et ${scale}` }));
        return;
      }

      setStates((s) => ({ ...s, [key]: "saving" }));
      setErrors((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      });

      const res = await saveSubDisciplineGrade({
        gradeId: gradeIds[studentId]?.[sdId] ?? null,
        studentId,
        classId: ctx.classId,
        subDisciplineId: sdId,
        termId: ctx.termId,
        value,
      });

      if (!res.ok) {
        setStates((s) => ({ ...s, [key]: "error" }));
        setErrors((e) => ({ ...e, [key]: res.error }));
        return;
      }
      setGradeIds((g) => ({ ...g, [studentId]: { ...g[studentId], [sdId]: res.gradeId } }));
      setStates((s) => ({ ...s, [key]: "saved" }));
    },
    [ctx.classId, ctx.termId, gradeIds],
  );

  const onChange = useCallback(
    (studentId: string, sdId: string, scale: number, raw: string) => {
      setNotes((n) => ({ ...n, [studentId]: { ...n[studentId], [sdId]: raw } }));
      const key = cellKey(studentId, sdId);
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => commit(studentId, sdId, raw, scale), 600);
    },
    [commit],
  );

  const onBlur = useCallback(
    (studentId: string, sdId: string, scale: number, raw: string) => {
      clearTimeout(timers.current[cellKey(studentId, sdId)]);
      commit(studentId, sdId, raw, scale);
    },
    [commit],
  );

  // Navigation fluide au clavier (Entrée/Bas -> élève suivant, Haut -> élève précédent)
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, studentIndex: number, sdId: string) => {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextInput = document.querySelector<HTMLInputElement>(
          `input[data-student-idx="${studentIndex + 1}"][data-sd-id="${sdId}"]`,
        );
        nextInput?.focus();
        nextInput?.select();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevInput = document.querySelector<HTMLInputElement>(
          `input[data-student-idx="${studentIndex - 1}"][data-sd-id="${sdId}"]`,
        );
        prevInput?.focus();
        prevInput?.select();
      }
    },
    [],
  );

  const totalColonnes = useMemo(
    () => ctx.domaines.reduce((a, d) => a + d.sousDisciplines.length, 0),
    [ctx.domaines],
  );

  const filteredEleves = useMemo(() => {
    if (!search.trim()) return ctx.eleves;
    const q = search.toLowerCase().trim();
    return ctx.eleves.filter(
      (e) => e.lastName.toLowerCase().includes(q) || e.firstName.toLowerCase().includes(q),
    );
  }, [ctx.eleves, search]);

  return (
    <div className="space-y-4">
      {/* En-tête de classe & résumé */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{ctx.className}</h1>
            <span className="inline-flex items-center rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Élémentaire (CI à CM2)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {ctx.termName} · {totalColonnes} sous-disciplines réparties en {ctx.domaines.length} domaines · {ctx.eleves.length} élèves
          </p>
        </div>

        {/* Filtre de recherche rapide */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrer un élève..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Grille défilable optimisée tablette */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-auto max-h-[68vh] shadow-xs">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            {/* Ligne 1 : Domaines officiels */}
            <tr>
              <th className="sticky left-0 z-30 bg-white border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">
                Élève
              </th>
              {ctx.domaines.map((d) => (
                <th
                  key={d.domainId}
                  colSpan={d.sousDisciplines.length + 1}
                  className="border-b border-l border-gray-200 px-3 py-2 text-center font-bold text-gray-800 bg-gray-50/80 text-xs tracking-wide"
                >
                  {d.name}
                </th>
              ))}
              <th className="border-b border-l border-gray-200 px-3 py-2 text-center font-bold text-gray-900 bg-primary/10 min-w-[70px]">
                Moy. Gén.
              </th>
            </tr>
            {/* Ligne 2 : Sous-disciplines & barèmes */}
            <tr>
              <th className="sticky left-0 z-30 bg-white border-b border-r border-gray-200 px-3 py-1 text-left text-[11px] font-normal text-gray-400">
                {filteredEleves.length} affiché(s)
              </th>
              {ctx.domaines.map((d) => (
                <Fragment key={d.domainId}>
                  {d.sousDisciplines.map((sd) => (
                    <th
                      key={sd.id}
                      className="border-b border-l border-gray-200 px-2 py-1.5 text-center text-[11px] font-medium text-gray-600 whitespace-nowrap min-w-[72px]"
                    >
                      <div className="truncate max-w-[110px]" title={sd.name}>
                        {sd.name}
                      </div>
                      <span className="text-[9.5px] text-gray-400 font-normal">/{sd.scale}</span>
                    </th>
                  ))}
                  <th
                    key={`${d.domainId}-moy`}
                    className="border-b border-l border-gray-200 px-2 py-1.5 text-center text-[11px] font-bold text-primary bg-primary/5 min-w-[60px]"
                  >
                    Moy. /10
                  </th>
                </Fragment>
              ))}
              <th className="border-b border-l border-gray-200 px-2 py-1.5 text-center text-[11px] font-bold text-primary bg-primary/10 min-w-[70px]">
                /20
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEleves.map((eleve, studentIdx) => (
              <EleveRow
                key={eleve.studentId}
                eleve={eleve}
                studentIdx={studentIdx}
                domaines={ctx.domaines}
                studentNotes={notes[eleve.studentId] ?? {}}
                states={states}
                errors={errors}
                onChange={onChange}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Guide & raccourcis */}
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 px-1 gap-2">
        <span>
          💡 <strong>Enregistrement automatique</strong>. Une case vide reste vide (hors calcul).
        </span>
        <span className="hidden sm:inline text-gray-400">
          Raccourcis : <kbd className="rounded border bg-gray-50 px-1.5 py-0.5 text-[10px]">Entrée</kbd> ou <kbd className="rounded border bg-gray-50 px-1.5 py-0.5 text-[10px]">↓</kbd> pour l&apos;élève suivant.
        </span>
      </div>

      {/* Appréciation globale du maître titulaire */}
      <AppreciationTitulaire ctx={ctx} />
    </div>
  );
}

// -------------------------------------------------------------
// LIGNE ÉLÈVE MÉMOÏSÉE (Optimisation 60 élèves = 0 lag)
// -------------------------------------------------------------
type EleveRowProps = {
  eleve: Ctx["eleves"][number];
  studentIdx: number;
  domaines: Ctx["domaines"];
  studentNotes: Record<string, string>;
  states: Record<string, CellState>;
  errors: Record<string, string>;
  onChange: (studentId: string, sdId: string, scale: number, raw: string) => void;
  onBlur: (studentId: string, sdId: string, scale: number, raw: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, studentIndex: number, sdId: string) => void;
};

const EleveRow = memo(function EleveRow({
  eleve,
  studentIdx,
  domaines,
  studentNotes,
  states,
  errors,
  onChange,
  onBlur,
  onKeyDown,
}: EleveRowProps) {
  // Calcul via le moteur officiel élémentaire (Lot 2)
  const calcul = useMemo(() => {
    const inputs: SousDisciplineInput[] = domaines.flatMap((d) =>
      d.sousDisciplines.map((sd) => {
        const raw = studentNotes[sd.id];
        const hasValue =
          raw !== undefined &&
          raw.trim() !== "" &&
          Number.isFinite(Number(raw.trim().replace(",", ".")));
        return {
          subDisciplineId: sd.id,
          name: sd.name,
          domainId: d.domainId,
          domainName: d.name,
          scale: sd.scale,
          note: hasValue ? Number(raw.trim().replace(",", ".")) : null,
        };
      }),
    );
    return calculerEleveElementaire(eleve.studentId, inputs);
  }, [eleve.studentId, domaines, studentNotes]);

  return (
    <tr className="hover:bg-gray-50/70 transition-colors">
      <td className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 px-3 py-2 font-medium text-gray-900 whitespace-nowrap shadow-2xs">
        <div className="font-semibold text-xs text-gray-900">
          {eleve.lastName} {eleve.firstName}
        </div>
      </td>
      {domaines.map((d) => {
        const domaineRes = calcul.domaines.find((res) => res.domainId === d.domainId);
        return (
          <Fragment key={d.domainId}>
            {d.sousDisciplines.map((sd) => {
              const key = `${eleve.studentId}:${sd.id}`;
              const state = states[key] ?? "idle";
              const val = studentNotes[sd.id] ?? "";
              const err = errors[key];

              return (
                <td key={sd.id} className="border-l border-b border-gray-100 p-1 text-center relative">
                  <div className="relative inline-block">
                    <input
                      type="text"
                      inputMode="decimal"
                      data-student-idx={studentIdx}
                      data-sd-id={sd.id}
                      className={`w-14 h-9 rounded-lg border text-center text-xs font-semibold tabular-nums transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        state === "error"
                          ? "border-red-400 bg-red-50 text-red-700"
                          : state === "saved"
                            ? "border-emerald-300 bg-emerald-50/20 text-gray-900"
                            : "border-gray-200 bg-white text-gray-900 hover:border-gray-300"
                      }`}
                      value={val}
                      title={err}
                      onChange={(e) => onChange(eleve.studentId, sd.id, sd.scale, e.target.value)}
                      onBlur={(e) => onBlur(eleve.studentId, sd.id, sd.scale, e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, studentIdx, sd.id)}
                    />
                    <span className="absolute -top-1 -right-1 pointer-events-none">
                      {state === "saving" && (
                        <span className="flex h-3 w-3 items-center justify-center rounded-full bg-white shadow-xs">
                          <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                        </span>
                      )}
                      {state === "saved" && (
                        <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                          <Check className="h-2 w-2 stroke-[3]" />
                        </span>
                      )}
                      {state === "error" && (
                        <span className="flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-white shadow-xs">
                          <TriangleAlert className="h-2 w-2 stroke-[3]" />
                        </span>
                      )}
                    </span>
                  </div>
                </td>
              );
            })}
            {/* Moyenne du domaine (sur 10) calculée en temps réel via le moteur officiel */}
            <td
              key={`${d.domainId}-moy-${eleve.studentId}`}
              className="border-l border-b border-gray-100 px-2 py-1.5 text-center text-xs font-bold text-primary bg-primary/5 tabular-nums"
            >
              {domaineRes?.moyenne !== null && domaineRes?.moyenne !== undefined
                ? domaineRes.moyenne.toFixed(2)
                : "—"}
            </td>
          </Fragment>
        );
      })}

      {/* Moyenne générale ramenée sur 20 */}
      <td className="border-l border-b border-gray-100 px-2 py-1.5 text-center text-xs font-extrabold text-primary bg-primary/10 tabular-nums">
        {calcul.moyenneGenerale !== null && calcul.moyenneGenerale !== undefined
          ? calcul.moyenneGenerale.toFixed(2)
          : "—"}
      </td>
    </tr>
  );
});

// -------------------------------------------------------------
// BLOC APPRÉCIATION DU MAÎTRE TITULAIRE
// -------------------------------------------------------------
function AppreciationTitulaire({ ctx }: { ctx: Ctx }) {
  const [studentId, setStudentId] = useState(ctx.eleves[0]?.studentId ?? "");
  const [appreciations, setAppreciations] = useState<Record<string, string>>(() =>
    Object.fromEntries(ctx.eleves.map((e) => [e.studentId, e.appreciation ?? ""])),
  );
  const [state, setState] = useState<CellState>("idle");

  const currentComment = appreciations[studentId] ?? "";

  const save = async (commentToSave: string) => {
    setState("saving");
    const res = await saveTitulaireAppreciation({
      studentId,
      classId: ctx.classId,
      termId: ctx.termId,
      comment: commentToSave,
    });
    setState(res.ok ? "saved" : "error");
  };

  const handleTextChange = (text: string) => {
    setAppreciations((prev) => ({ ...prev, [studentId]: text }));
    setState("idle");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 max-w-2xl shadow-xs">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-gray-900">Appréciation du maître titulaire</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-60 shrink-0"
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setState("idle");
          }}
        >
          {ctx.eleves.map((e) => (
            <option key={e.studentId} value={e.studentId}>
              {e.lastName} {e.firstName}
            </option>
          ))}
        </select>

        <div className="flex-1 space-y-1.5">
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[72px]"
            placeholder="Appréciation synthétique pour l'élève sur l'ensemble du trimestre..."
            value={currentComment}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={(e) => save(e.target.value)}
          />
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>Enregistré automatiquement à la sortie du champ.</span>
            <span className="flex items-center gap-1 font-medium">
              {state === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" /> Enregistrement…
                </>
              )}
              {state === "saved" && (
                <>
                  <Check className="h-3 w-3 text-emerald-500" /> Enregistré
                </>
              )}
              {state === "error" && (
                <>
                  <TriangleAlert className="h-3 w-3 text-red-500" /> Échec
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
