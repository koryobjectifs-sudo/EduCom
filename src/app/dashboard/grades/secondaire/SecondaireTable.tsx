"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, TriangleAlert, AlertCircle, BookOpen, Layers } from "lucide-react";
import {
  saveDevoirGrade,
  saveCompositionGrade,
  saveSubjectAppreciation,
  type SecondaireContext,
} from "./actions";
import { calculerMatiereSecondaire } from "@/lib/notes/secondaire";

type Ctx = Extract<SecondaireContext, { ok: true }>;
type CellState = "idle" | "saving" | "saved" | "error";
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

  const handleNavigate = (newClassId: string, newSubjectId: string, newTermId: string) => {
    router.push(`/dashboard/grades/secondaire?class=${newClassId}&subject=${newSubjectId}&term=${newTermId}`);
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

  const Indicator = ({ k }: { k: string }) => {
    const s = states[k] ?? "idle";
    if (s === "saving") return <Loader2 className="h-3 w-3 animate-spin text-gray-400" />;
    if (s === "saved") return <Check className="h-3 w-3 text-emerald-500" />;
    if (s === "error") return <TriangleAlert className="h-3 w-3 text-red-500" aria-label={errors[k]} />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Barre de navigation et sélecteurs de contexte */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{ctx.subjectName}</h1>
              <span className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Layers className="h-3 w-3" /> {ctx.className}
              </span>
              <span className="inline-flex items-center rounded-pill bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                Coefficient {ctx.coefficient}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {ctx.termName} · {ctx.lignes.length} élève{ctx.lignes.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Sélecteur de Trimestre */}
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 self-start sm:self-auto">
            {ctx.allTerms.map((t) => {
              const active = t.id === ctx.termId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleNavigate(ctx.classId, ctx.subjectId, t.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    active
                      ? "bg-white text-primary shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sélecteurs de Classe et Matière */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-gray-100">
          {ctx.allClasses.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 shrink-0">Classe :</span>
              <select
                value={ctx.classId}
                onChange={(e) => router.push(`/dashboard/grades/secondaire?class=${e.target.value}&term=${ctx.termId}`)}
                className="h-8.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ctx.allClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-medium text-gray-500 shrink-0">
              <BookOpen className="h-3 w-3 inline mr-1" />
              Matière :
            </span>
            {ctx.allSubjects.length > 1 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {ctx.allSubjects.map((s) => {
                  const active = s.id === ctx.subjectId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleNavigate(ctx.classId, s.id, ctx.termId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-primary text-white font-semibold shadow-2xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s.name} (coef {s.coefficient})
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                {ctx.subjectName} (coef {ctx.coefficient})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grille de saisie */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-auto max-h-[72vh] shadow-2xs">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="bg-gray-50/80">
              <th className="sticky left-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2.5 text-left font-bold text-gray-700 min-w-[180px]">
                Élève
              </th>
              {SLOTS.map((s) => (
                <th
                  key={s}
                  className="border-b border-l border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[76px]"
                >
                  Devoir {s + 1}
                </th>
              ))}
              <th className="border-b border-l border-gray-200 px-2 py-2 text-center text-xs font-bold text-gray-800 min-w-[110px] bg-amber-50/30">
                Composition *
              </th>
              <th className="border-b border-l border-gray-200 px-2 py-2 text-center text-xs font-bold text-primary bg-primary/5 min-w-[76px]">
                MM (Moy)
              </th>
              <th className="border-b border-l border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-600 min-w-[220px]">
                Appréciation du professeur
              </th>
            </tr>
          </thead>
          <tbody>
            {ctx.lignes.map((ligne) => {
              const l = lignes[ligne.studentId];
              const { mm, aDesDevoirs, incluse } = mmDe(ligne.studentId);
              const isMissingComposition = aDesDevoirs && !incluse;

              return (
                <tr key={ligne.studentId} className="hover:bg-gray-50/60 transition-colors">
                  <td className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 px-3 py-2 font-medium text-gray-900 whitespace-nowrap shadow-xs">
                    {ligne.lastName} {ligne.firstName}
                  </td>
                  {SLOTS.map((slot) => (
                    <td key={slot} className="border-l border-b border-gray-100 p-1.5 relative text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-14 h-9 rounded-lg border border-gray-200 text-center text-sm font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={l?.devoirValues[slot] ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          setLignes((p) => {
                            const nl = { ...p[ligne.studentId] };
                            nl.devoirValues = [...nl.devoirValues];
                            nl.devoirValues[slot] = e.target.value;
                            return { ...p, [ligne.studentId]: nl };
                          })
                        }
                        onBlur={(e) => commitDevoir(ligne.studentId, slot, e.target.value)}
                      />
                      <span className="absolute top-1.5 right-1.5">
                        <Indicator k={`d${slot}:${ligne.studentId}`} />
                      </span>
                    </td>
                  ))}
                  <td
                    className={`border-l border-b border-gray-100 p-1.5 relative text-center ${
                      isMissingComposition ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`w-16 h-9 rounded-lg border text-center text-sm font-bold tabular-nums focus:outline-none focus:ring-2 ${
                        isMissingComposition
                          ? "border-amber-400 bg-amber-50/60 text-amber-950 focus:ring-amber-400"
                          : "border-gray-200 focus:ring-primary/40"
                      }`}
                      placeholder="—"
                      value={l?.compositionValue ?? ""}
                      onChange={(e) =>
                        setLignes((p) => ({
                          ...p,
                          [ligne.studentId]: { ...p[ligne.studentId], compositionValue: e.target.value },
                        }))
                      }
                      onBlur={(e) => commitComposition(ligne.studentId, e.target.value)}
                    />
                    <span className="absolute top-1.5 right-1.5">
                      <Indicator k={`c:${ligne.studentId}`} />
                    </span>
                    {isMissingComposition && (
                      <span className="block text-[10px] font-semibold text-amber-700 leading-tight mt-0.5">
                        Compo requise
                      </span>
                    )}
                  </td>
                  <td className="border-l border-b border-gray-100 px-2 py-2 text-center text-sm font-bold bg-primary/5 tabular-nums">
                    {mm !== null ? (
                      <span className="text-primary font-bold text-sm">{mm.toFixed(2)}</span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-gray-400 font-medium">—</span>
                        {aDesDevoirs && (
                          <span className="text-[9.5px] font-medium text-amber-600">Non comptée</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="border-l border-b border-gray-100 p-1.5 relative">
                    <input
                      type="text"
                      className="w-full min-w-[200px] h-9 rounded-lg border border-gray-200 px-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Appréciation de l'élève…"
                      value={l?.appreciation ?? ""}
                      onChange={(e) =>
                        setLignes((p) => ({
                          ...p,
                          [ligne.studentId]: { ...p[ligne.studentId], appreciation: e.target.value },
                        }))
                      }
                      onBlur={(e) => commitAppreciation(ligne.studentId, e.target.value)}
                    />
                    <span className="absolute top-1.5 right-2">
                      <Indicator k={`a:${ligne.studentId}`} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Légende pédagogique */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-200/80">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <p>
          <strong>Règle de calcul :</strong> MM = (Moyenne des devoirs + Composition) / 2. Les devoirs (1 à 3) sont optionnels. La <strong>composition est obligatoire</strong> pour que la matière soit prise en compte dans la moyenne générale.
        </p>
      </div>
    </div>
  );
}
