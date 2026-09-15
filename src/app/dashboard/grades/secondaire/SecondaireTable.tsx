"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import {
  saveDevoirGrade, saveCompositionGrade, saveSubjectAppreciation, type SecondaireContext,
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
  const [lignes, setLignes] = useState<Record<string, LigneEtat>>(() =>
    Object.fromEntries(
      ctx.lignes.map((l) => {
        const devoirs: (string | null)[] = [null, null, null];
        const devoirValues = ["", "", ""];
        l.devoirs.slice(0, 3).forEach((d, i) => { devoirs[i] = d.gradeId; devoirValues[i] = String(d.value); });
        return [l.studentId, {
          devoirs, devoirValues,
          compositionId: l.composition?.gradeId ?? null,
          compositionValue: l.composition ? String(l.composition.value) : "",
          appreciation: l.appreciation,
        }];
      }),
    ),
  );
  const [states, setStates] = useState<Record<string, CellState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setState = (key: string, s: CellState, err?: string) => {
    setStates((p) => ({ ...p, [key]: s }));
    setErrors((p) => { const n = { ...p }; if (err) n[key] = err; else delete n[key]; return n; });
  };

  const mmDe = useCallback(
    (studentId: string) => {
      const l = lignes[studentId];
      if (!l) return { md: null as number | null, mm: null as number | null };
      const devoirs = l.devoirValues.filter((v) => v.trim() !== "").map(Number).filter(Number.isFinite);
      const composition = l.compositionValue.trim() === "" ? null : Number(l.compositionValue);
      const r = calculerMatiereSecondaire({ subjectId: ctx.subjectId, name: ctx.subjectName, coefficient: ctx.coefficient, devoirs, composition });
      return { md: r.md, mm: r.mm };
    },
    [lignes, ctx.subjectId, ctx.subjectName, ctx.coefficient],
  );

  const commitDevoir = async (studentId: string, slot: number, raw: string) => {
    const key = `d${slot}:${studentId}`;
    const text = raw.trim().replace(",", ".");
    const value = text === "" ? null : Number(text);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 20)) {
      setState(key, "error", "Entre 0 et 20"); return;
    }
    setState(key, "saving");
    const res = await saveDevoirGrade({
      gradeId: lignes[studentId]?.devoirs[slot] ?? null,
      studentId, classId: ctx.classId, subjectId: ctx.subjectId, termId: ctx.termId, value,
    });
    if (!res.ok) { setState(key, "error", res.error); return; }
    setLignes((p) => {
      const l = { ...p[studentId] };
      l.devoirs = [...l.devoirs]; l.devoirs[slot] = res.gradeId;
      return { ...p, [studentId]: l };
    });
    setState(key, "saved");
  };

  const commitComposition = async (studentId: string, raw: string) => {
    const key = `c:${studentId}`;
    const text = raw.trim().replace(",", ".");
    const value = text === "" ? null : Number(text);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 20)) {
      setState(key, "error", "Entre 0 et 20"); return;
    }
    setState(key, "saving");
    const res = await saveCompositionGrade({
      gradeId: lignes[studentId]?.compositionId ?? null,
      studentId, classId: ctx.classId, subjectId: ctx.subjectId, termId: ctx.termId, value,
    });
    if (!res.ok) { setState(key, "error", res.error); return; }
    setLignes((p) => ({ ...p, [studentId]: { ...p[studentId], compositionId: res.gradeId } }));
    setState(key, "saved");
  };

  const commitAppreciation = async (studentId: string, comment: string) => {
    const key = `a:${studentId}`;
    setState(key, "saving");
    const res = await saveSubjectAppreciation({ studentId, classId: ctx.classId, subjectId: ctx.subjectId, termId: ctx.termId, comment });
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
      <div>
        <h1 className="text-xl font-bold text-gray-900">{ctx.subjectName} — {ctx.className}</h1>
        <p className="text-sm text-gray-500">{ctx.termName} · coefficient {ctx.coefficient}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-auto max-h-[70vh]">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th className="sticky left-0 z-30 bg-white border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">Élève</th>
              {SLOTS.map((s) => (
                <th key={s} className="border-b border-l border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[72px]">Devoir {s + 1}</th>
              ))}
              <th className="border-b border-l border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[80px]">Composition</th>
              <th className="border-b border-l border-gray-200 px-2 py-2 text-center text-xs font-bold text-primary bg-primary/5 min-w-[64px]">MM</th>
              <th className="border-b border-l border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-600 min-w-[220px]">Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {ctx.lignes.map((ligne) => {
              const l = lignes[ligne.studentId];
              const { mm } = mmDe(ligne.studentId);
              return (
                <tr key={ligne.studentId} className="hover:bg-gray-50/60">
                  <td className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap">
                    {ligne.lastName} {ligne.firstName}
                  </td>
                  {SLOTS.map((slot) => (
                    <td key={slot} className="border-l border-b border-gray-100 p-1 relative">
                      <input
                        type="text" inputMode="decimal"
                        className="w-14 h-9 rounded-lg border border-gray-200 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={l?.devoirValues[slot] ?? ""}
                        onChange={(e) => setLignes((p) => {
                          const nl = { ...p[ligne.studentId] };
                          nl.devoirValues = [...nl.devoirValues]; nl.devoirValues[slot] = e.target.value;
                          return { ...p, [ligne.studentId]: nl };
                        })}
                        onBlur={(e) => commitDevoir(ligne.studentId, slot, e.target.value)}
                      />
                      <span className="absolute top-1 right-1"><Indicator k={`d${slot}:${ligne.studentId}`} /></span>
                    </td>
                  ))}
                  <td className="border-l border-b border-gray-100 p-1 relative">
                    <input
                      type="text" inputMode="decimal"
                      className="w-16 h-9 rounded-lg border border-gray-200 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={l?.compositionValue ?? ""}
                      onChange={(e) => setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], compositionValue: e.target.value } }))}
                      onBlur={(e) => commitComposition(ligne.studentId, e.target.value)}
                    />
                    <span className="absolute top-1 right-1"><Indicator k={`c:${ligne.studentId}`} /></span>
                  </td>
                  <td className="border-l border-b border-gray-100 px-2 py-1.5 text-center text-sm font-bold text-primary bg-primary/5 tabular-nums">
                    {mm ?? "—"}
                  </td>
                  <td className="border-l border-b border-gray-100 p-1 relative">
                    <input
                      type="text"
                      className="w-full min-w-[200px] h-9 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Appréciation…"
                      value={l?.appreciation ?? ""}
                      onChange={(e) => setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], appreciation: e.target.value } }))}
                      onBlur={(e) => commitAppreciation(ligne.studentId, e.target.value)}
                    />
                    <span className="absolute top-1 right-1"><Indicator k={`a:${ligne.studentId}`} /></span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        MM = (moyenne des devoirs + composition) / 2. Une composition est obligatoire pour compter dans la moyenne générale.
      </p>
    </div>
  );
}
