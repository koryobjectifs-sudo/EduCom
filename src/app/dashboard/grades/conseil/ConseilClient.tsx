"use client";

import { useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { saveConseilDecision, type ConseilContext, type Distinction } from "./actions";

type Ctx = Extract<ConseilContext, { ok: true }>;
type State = "idle" | "saving" | "saved" | "error";

const LIBELLE_DISTINCTION: Record<Exclude<Distinction, null>, string> = {
  TABLEAU_HONNEUR: "Tableau d'honneur",
  ENCOURAGEMENTS: "Encouragements",
  FELICITATIONS: "Félicitations",
};

export default function ConseilClient({ ctx }: { ctx: Ctx }) {
  const [lignes, setLignes] = useState(() => Object.fromEntries(ctx.lignes.map((l) => [l.studentId, { ...l }])));
  const [states, setStates] = useState<Record<string, State>>({});

  type Champs = Omit<Parameters<typeof saveConseilDecision>[0], "studentId" | "classId" | "termId">;
  const patch = async (studentId: string, champs: Champs) => {
    setStates((s) => ({ ...s, [studentId]: "saving" }));
    const res = await saveConseilDecision({ studentId, classId: ctx.classId, termId: ctx.termId, ...champs });
    setStates((s) => ({ ...s, [studentId]: res.ok ? "saved" : "error" }));
  };

  const Indicator = ({ studentId }: { studentId: string }) => {
    const s = states[studentId] ?? "idle";
    if (s === "saving") return <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />;
    if (s === "saved") return <Check className="h-3.5 w-3.5 text-emerald-500" />;
    if (s === "error") return <TriangleAlert className="h-3.5 w-3.5 text-red-500" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Conseil de classe — {ctx.className}</h1>
        <p className="text-sm text-gray-500">{ctx.termName}</p>
        {!ctx.orientationActivable && (
          <p className="text-xs text-amber-700 mt-1">La décision d'orientation n'est saisissable qu'au 3e trimestre.</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Élève</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">Moyenne</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">Rang</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Distinction</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Sanction travail</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Sanction conduite</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Orientation</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">Abs. J.</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">Abs. N.J.</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Observations</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {ctx.lignes.map((ligne) => {
              const l = lignes[ligne.studentId];
              return (
                <tr key={ligne.studentId} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{ligne.lastName} {ligne.firstName}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{ligne.moyenneGenerale ?? "—"}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{ligne.rang ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="text-[11px] text-gray-400 mb-0.5">
                      Proposée : {ligne.distinctionProposee ? LIBELLE_DISTINCTION[ligne.distinctionProposee] : "aucune"}
                    </div>
                    <select
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      value={l.distinctionRetenue ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], distinctionRetenue: v } }));
                        patch(ligne.studentId, { distinctionRetenue: v });
                      }}
                    >
                      <option value="">Aucune</option>
                      <option value="TABLEAU_HONNEUR">Tableau d'honneur</option>
                      <option value="ENCOURAGEMENTS">Encouragements</option>
                      <option value="FELICITATIONS">Félicitations</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      value={l.sanctionTravail ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], sanctionTravail: v } }));
                        patch(ligne.studentId, { sanctionTravail: v });
                      }}
                    >
                      <option value="">Aucune</option>
                      <option value="AVERTISSEMENT">Avertissement</option>
                      <option value="BLAME">Blâme</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      value={l.sanctionConduite ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], sanctionConduite: v } }));
                        patch(ligne.studentId, { sanctionConduite: v });
                      }}
                    >
                      <option value="">Aucune</option>
                      <option value="AVERTISSEMENT">Avertissement</option>
                      <option value="BLAME">Blâme</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-40"
                      disabled={!ctx.orientationActivable}
                      value={l.decisionOrientation ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], decisionOrientation: v } }));
                        patch(ligne.studentId, { decisionOrientation: v });
                      }}
                    >
                      <option value="">—</option>
                      <option value="PASSAGE">Passage</option>
                      <option value="REDOUBLEMENT">Redoublement</option>
                      <option value="EXCLUSION">Exclusion</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min={0}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-xs text-center"
                      value={l.absencesJustifiees ?? ""}
                      onChange={(e) => setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], absencesJustifiees: e.target.value === "" ? null : Number(e.target.value) } }))}
                      onBlur={() => patch(ligne.studentId, { absencesJustifiees: lignes[ligne.studentId].absencesJustifiees })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min={0}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-xs text-center"
                      value={l.absencesNonJustifiees ?? ""}
                      onChange={(e) => setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], absencesNonJustifiees: e.target.value === "" ? null : Number(e.target.value) } }))}
                      onBlur={() => patch(ligne.studentId, { absencesNonJustifiees: lignes[ligne.studentId].absencesNonJustifiees })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className="w-40 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      value={l.observationsConseil ?? ""}
                      onChange={(e) => setLignes((p) => ({ ...p, [ligne.studentId]: { ...p[ligne.studentId], observationsConseil: e.target.value } }))}
                      onBlur={() => patch(ligne.studentId, { observationsConseil: lignes[ligne.studentId].observationsConseil })}
                    />
                  </td>
                  <td className="px-3 py-2"><Indicator studentId={ligne.studentId} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Les distinctions proposées (≥12 tableau d'honneur, ≥14 encouragements, ≥16 félicitations) ne sont jamais imposées : le conseil retient, modifie ou retire.
      </p>
    </div>
  );
}
