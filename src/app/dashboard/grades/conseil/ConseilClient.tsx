"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  AlertTriangle,
  Compass,
  Calendar,
  Check,
  Loader2,
  Clock,
  ShieldAlert,
  Search,
  Users,
} from "lucide-react";
import {
  saveConseilReview,
  type ConseilContext,
  type ConseilEleveLigne,
} from "./actions";
import {
  DISTINCTION_LABELS,
  SANCTION_LABELS,
  ORIENTATION_LABELS,
  type DistinctionType,
  type SanctionType,
  type DecisionOrientationType,
} from "@/lib/notes/conseil";

type Ctx = Extract<ConseilContext, { ok: true }>;

export default function ConseilClient({ ctx }: { ctx: Ctx }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterSearch, setFilterSearch] = useState("");

  const [eleves, setEleves] = useState<ConseilEleveLigne[]>(ctx.eleves);
  const [savingState, setSavingState] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  const saveStudent = useCallback(
    async (studentId: string, updatedFields: Partial<ConseilEleveLigne>) => {
      setEleves((prev) =>
        prev.map((el) => (el.studentId === studentId ? { ...el, ...updatedFields } : el)),
      );

      setSavingState((s) => ({ ...s, [studentId]: "saving" }));
      setErrorMessages((e) => ({ ...e, [studentId]: "" }));

      const current = eleves.find((el) => el.studentId === studentId);
      if (!current) return;

      const payload = {
        classId: ctx.classId,
        termId: ctx.termId,
        studentId,
        distinctionRetenue:
          updatedFields.distinctionRetenue !== undefined
            ? updatedFields.distinctionRetenue
            : current.distinctionRetenue,
        sanctionTravail:
          updatedFields.sanctionTravail !== undefined
            ? updatedFields.sanctionTravail
            : current.sanctionTravail,
        sanctionConduite:
          updatedFields.sanctionConduite !== undefined
            ? updatedFields.sanctionConduite
            : current.sanctionConduite,
        decisionOrientation:
          updatedFields.decisionOrientation !== undefined
            ? updatedFields.decisionOrientation
            : current.decisionOrientation,
        absencesJustifiees:
          updatedFields.absencesJustifiees !== undefined
            ? updatedFields.absencesJustifiees
            : current.absencesJustifiees,
        absencesNonJustifiees:
          updatedFields.absencesNonJustifiees !== undefined
            ? updatedFields.absencesNonJustifiees
            : current.absencesNonJustifiees,
        observation:
          updatedFields.observation !== undefined
            ? updatedFields.observation
            : current.observation,
      };

      const res = await saveConseilReview(payload);
      if (res.ok) {
        setSavingState((s) => ({ ...s, [studentId]: "saved" }));
        setTimeout(() => {
          setSavingState((s) => ({ ...s, [studentId]: "idle" }));
        }, 2000);
      } else {
        setSavingState((s) => ({ ...s, [studentId]: "error" }));
        setErrorMessages((e) => ({ ...e, [studentId]: res.error }));
      }
    },
    [ctx.classId, ctx.termId, eleves],
  );

  const filteredEleves = eleves.filter((e) => {
    if (!filterSearch.trim()) return true;
    const q = filterSearch.toLowerCase();
    return `${e.firstName} ${e.lastName}`.toLowerCase().includes(q);
  });

  // Statistiques du conseil
  const totalEleves = eleves.length;
  const elevesAvecMoyenne = eleves.filter((e) => e.moyenneGenerale !== null);
  const moyenneClasse =
    elevesAvecMoyenne.length > 0
      ? (
          elevesAvecMoyenne.reduce((acc, e) => acc + (e.moyenneGenerale || 0), 0) /
          elevesAvecMoyenne.length
        ).toFixed(2)
      : null;

  const totalDistinctions = eleves.filter(
    (e) => e.distinctionRetenue && e.distinctionRetenue !== "AUCUNE",
  ).length;

  const totalSanctions = eleves.filter(
    (e) =>
      (e.sanctionTravail && e.sanctionTravail !== "AUCUNE") ||
      (e.sanctionConduite && e.sanctionConduite !== "AUCUNE"),
  ).length;

  return (
    <div className="space-y-4">
      {/* En-tête de configuration et sélecteurs */}
      <div className="rounded-surface border border-rule bg-surface p-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-pill bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-800">
                <ShieldAlert className="h-3 w-3" /> Instance Délibérative
              </span>
              <span className="inline-flex items-center rounded-pill bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-700">
                {ctx.cycle === "ELEMENTAIRE" ? "Élémentaire" : "Secondaire / Moyen"}
              </span>
              {ctx.isT3 && (
                <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <Compass className="h-3 w-3" /> Fin d&apos;année · Décisions d&apos;orientation actives
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold tracking-tight text-text">
              Conseil de classe — {ctx.className}
            </h1>
            <p className="text-xs text-text-soft">
              Délibération administrative : attribution des distinctions, sanctions, régularisation des absences et décisions d&apos;orientation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sélecteur de classe */}
            <select
              value={ctx.classId}
              onChange={(e) => {
                const newId = e.target.value;
                startTransition(() => {
                  router.push(`/dashboard/grades/conseil?class=${newId}&term=${ctx.termId}`);
                });
              }}
              className="h-8.5 rounded-control border border-rule bg-surface px-2.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
            >
              {ctx.allClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sélecteur de trimestre */}
            <select
              value={ctx.termId}
              onChange={(e) => {
                const newTerm = e.target.value;
                startTransition(() => {
                  router.push(`/dashboard/grades/conseil?class=${ctx.classId}&term=${newTerm}`);
                });
              }}
              className="h-8.5 rounded-control border border-rule bg-surface px-2.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
            >
              {ctx.allTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cartes KPI du Conseil */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-control border border-rule/70 bg-surface-subtle/50 p-2.5">
            <div className="flex items-center gap-1.5 text-text-soft text-[11px]">
              <Users className="h-3.5 w-3.5" /> Effectif
            </div>
            <div className="mt-1 text-sm font-bold text-text">{totalEleves} élèves</div>
          </div>

          <div className="rounded-control border border-rule/70 bg-surface-subtle/50 p-2.5">
            <div className="flex items-center gap-1.5 text-text-soft text-[11px]">
              <Compass className="h-3.5 w-3.5" /> Moyenne délibérée
            </div>
            <div className="mt-1 text-sm font-bold text-text">
              {moyenneClasse ? `${moyenneClasse} / 20` : "En attente"}
            </div>
          </div>

          <div className="rounded-control border border-rule/70 bg-surface-subtle/50 p-2.5">
            <div className="flex items-center gap-1.5 text-text-soft text-[11px]">
              <Award className="h-3.5 w-3.5 text-amber-500" /> Distinctions
            </div>
            <div className="mt-1 text-sm font-bold text-text">
              {totalDistinctions} retenue{totalDistinctions > 1 ? "s" : ""}
            </div>
          </div>

          <div className="rounded-control border border-rule/70 bg-surface-subtle/50 p-2.5">
            <div className="flex items-center gap-1.5 text-text-soft text-[11px]">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Sanctions
            </div>
            <div className="mt-1 text-sm font-bold text-text">
              {totalSanctions} sanction{totalSanctions > 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'action et recherche */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-soft" />
          <input
            type="text"
            placeholder="Filtrer par nom ou prénom..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="h-8.5 w-full rounded-control border border-rule bg-surface pl-8 pr-3 text-xs text-text placeholder:text-text-soft focus:border-primary focus:outline-none"
          />
        </div>
        <div className="text-[11px] text-text-soft">
          {filteredEleves.length} sur {eleves.length} élève{eleves.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Tableau du Conseil de Classe */}
      <div className="overflow-hidden rounded-surface border border-rule bg-surface shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text border-collapse">
            <thead className="border-b border-rule bg-surface-subtle/70 text-[11px] font-semibold text-text-soft uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 min-w-[160px]">Élève</th>
                <th className="py-2.5 px-2.5 text-center min-w-[70px]">Moyenne</th>
                <th className="py-2.5 px-3 min-w-[200px]">Distinction</th>
                <th className="py-2.5 px-3 min-w-[150px]">Sanction Travail</th>
                <th className="py-2.5 px-3 min-w-[150px]">Sanction Conduite</th>
                <th className="py-2.5 px-3 min-w-[120px]">Absences (J / NJ)</th>
                {ctx.isT3 && (
                  <th className="py-2.5 px-3 min-w-[160px] bg-emerald-50/50 text-emerald-900 border-x border-emerald-200/60">
                    Orientation T3
                  </th>
                )}
                <th className="py-2.5 px-3 min-w-[220px]">
                  {ctx.cycle === "ELEMENTAIRE" ? "Appréciation titulaire" : "Observations conseil"}
                </th>
                <th className="py-2.5 px-2 text-center w-10">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/60">
              {filteredEleves.map((el) => {
                const state = savingState[el.studentId] || "idle";
                const error = errorMessages[el.studentId];

                // Badge de proposition automatique
                let propBadge = null;
                if (el.distinctionProposee === "FELICITATIONS") {
                  propBadge = (
                    <span className="inline-flex items-center rounded-pill bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200">
                      Suggéré : Félicitations
                    </span>
                  );
                } else if (el.distinctionProposee === "ENCOURAGEMENTS") {
                  propBadge = (
                    <span className="inline-flex items-center rounded-pill bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 border border-sky-200">
                      Suggéré : Encouragements
                    </span>
                  );
                } else if (el.distinctionProposee === "TABLEAU_HONNEUR") {
                  propBadge = (
                    <span className="inline-flex items-center rounded-pill bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                      Suggéré : Tableau d&apos;honneur
                    </span>
                  );
                }

                return (
                  <tr key={el.studentId} className="hover:bg-surface-subtle/40 transition-colors">
                    {/* Élève */}
                    <td className="py-2.5 px-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text">
                          {el.lastName.toUpperCase()} {el.firstName}
                        </span>
                        {el.rang && (
                          <span className="text-[10px] text-text-soft">
                            ({el.rang}
                            <sup>{el.rang === 1 ? "er" : "e"}</sup>)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Moyenne */}
                    <td className="py-2.5 px-2.5 text-center">
                      {el.moyenneGenerale !== null ? (
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 font-bold font-mono text-xs ${
                            el.moyenneGenerale >= 10
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {el.moyenneGenerale.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-text-soft text-xs">—</span>
                      )}
                    </td>

                    {/* Distinction */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          {propBadge || <span className="text-[10px] text-text-soft italic">Sans suggestion</span>}
                          {el.distinctionProposee &&
                            el.distinctionRetenue !== el.distinctionProposee && (
                              <button
                                type="button"
                                onClick={() =>
                                  saveStudent(el.studentId, {
                                    distinctionRetenue: el.distinctionProposee,
                                  })
                                }
                                className="text-[10px] text-primary hover:underline"
                                title="Appliquer la suggestion automatique"
                              >
                                Appliquer
                              </button>
                            )}
                        </div>
                        <select
                          value={el.distinctionRetenue || "AUCUNE"}
                          onChange={(e) =>
                            saveStudent(el.studentId, {
                              distinctionRetenue: e.target.value as DistinctionType | "AUCUNE",
                            })
                          }
                          className={`h-7 w-full rounded border px-2 text-[11px] font-medium focus:outline-none ${
                            el.distinctionRetenue && el.distinctionRetenue !== "AUCUNE"
                              ? "border-amber-400 bg-amber-50/50 text-amber-900"
                              : "border-rule bg-surface text-text"
                          }`}
                        >
                          <option value="AUCUNE">Aucune distinction</option>
                          <option value="TABLEAU_HONNEUR">Tableau d&apos;honneur (≥12)</option>
                          <option value="ENCOURAGEMENTS">Encouragements (≥14)</option>
                          <option value="FELICITATIONS">Félicitations (≥16)</option>
                        </select>
                      </div>
                    </td>

                    {/* Sanction Travail */}
                    <td className="py-2.5 px-3">
                      <select
                        value={el.sanctionTravail || "AUCUNE"}
                        onChange={(e) =>
                          saveStudent(el.studentId, {
                            sanctionTravail: e.target.value as SanctionType | "AUCUNE",
                          })
                        }
                        className={`h-7 w-full rounded border px-2 text-[11px] font-medium focus:outline-none ${
                          el.sanctionTravail && el.sanctionTravail !== "AUCUNE"
                            ? "border-rose-400 bg-rose-50 text-rose-900"
                            : "border-rule bg-surface text-text"
                        }`}
                      >
                        <option value="AUCUNE">Aucune</option>
                        <option value="AVERTISSEMENT">Avertissement travail</option>
                        <option value="BLAME">Blâme travail</option>
                      </select>
                    </td>

                    {/* Sanction Conduite */}
                    <td className="py-2.5 px-3">
                      <select
                        value={el.sanctionConduite || "AUCUNE"}
                        onChange={(e) =>
                          saveStudent(el.studentId, {
                            sanctionConduite: e.target.value as SanctionType | "AUCUNE",
                          })
                        }
                        className={`h-7 w-full rounded border px-2 text-[11px] font-medium focus:outline-none ${
                          el.sanctionConduite && el.sanctionConduite !== "AUCUNE"
                            ? "border-rose-400 bg-rose-50 text-rose-900"
                            : "border-rule bg-surface text-text"
                        }`}
                      >
                        <option value="AUCUNE">Aucune</option>
                        <option value="AVERTISSEMENT">Avertissement conduite</option>
                        <option value="BLAME">Blâme conduite</option>
                      </select>
                    </td>

                    {/* Absences (Justifiées / Non Justifiées) */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min="0"
                            value={el.absencesJustifiees}
                            onChange={(e) =>
                              setEleves((prev) =>
                                prev.map((item) =>
                                  item.studentId === el.studentId
                                    ? { ...item, absencesJustifiees: Number(e.target.value) }
                                    : item,
                                ),
                              )
                            }
                            onBlur={(e) =>
                              saveStudent(el.studentId, {
                                absencesJustifiees: Number(e.target.value),
                              })
                            }
                            title="Absences justifiées"
                            className="h-7 w-12 rounded border border-rule bg-surface px-1 text-center text-xs text-text focus:border-primary focus:outline-none"
                          />
                          <span className="text-[9px] text-emerald-700 font-medium">Just.</span>
                        </div>
                        <span className="text-text-soft font-bold">/</span>
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min="0"
                            value={el.absencesNonJustifiees}
                            onChange={(e) =>
                              setEleves((prev) =>
                                prev.map((item) =>
                                  item.studentId === el.studentId
                                    ? { ...item, absencesNonJustifiees: Number(e.target.value) }
                                    : item,
                                ),
                              )
                            }
                            onBlur={(e) =>
                              saveStudent(el.studentId, {
                                absencesNonJustifiees: Number(e.target.value),
                              })
                            }
                            title="Absences non justifiées"
                            className="h-7 w-12 rounded border border-rule bg-surface px-1 text-center text-xs text-text focus:border-primary focus:outline-none"
                          />
                          <span className="text-[9px] text-rose-700 font-medium">Non J.</span>
                        </div>
                      </div>
                    </td>

                    {/* Décision d'Orientation (T3 UNIQUEMENT) */}
                    {ctx.isT3 && (
                      <td className="py-2.5 px-3 bg-emerald-50/20 border-x border-emerald-200/50">
                        <select
                          value={el.decisionOrientation || "EN_ATTENTE"}
                          onChange={(e) =>
                            saveStudent(el.studentId, {
                              decisionOrientation: e.target.value as DecisionOrientationType | "EN_ATTENTE",
                            })
                          }
                          className={`h-7 w-full rounded border px-2 text-[11px] font-semibold focus:outline-none ${
                            el.decisionOrientation === "PASSAGE"
                              ? "border-emerald-400 bg-emerald-100/70 text-emerald-900"
                              : el.decisionOrientation === "REDOUBLEMENT"
                              ? "border-amber-400 bg-amber-100/70 text-amber-900"
                              : el.decisionOrientation === "EXCLUSION"
                              ? "border-rose-400 bg-rose-100/70 text-rose-900"
                              : "border-rule bg-surface text-text-soft"
                          }`}
                        >
                          <option value="EN_ATTENTE">À délibérer</option>
                          <option value="PASSAGE">Passage</option>
                          <option value="REDOUBLEMENT">Redoublement</option>
                          <option value="EXCLUSION">Exclusion</option>
                        </select>
                      </td>
                    )}

                    {/* Observations */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={el.observation}
                        onChange={(e) =>
                          setEleves((prev) =>
                            prev.map((item) =>
                              item.studentId === el.studentId
                                ? { ...item, observation: e.target.value }
                                : item,
                            ),
                          )
                        }
                        onBlur={(e) => saveStudent(el.studentId, { observation: e.target.value })}
                        placeholder={
                          ctx.cycle === "ELEMENTAIRE"
                            ? "Appréciation globale du maître titulaire..."
                            : "Observations globales du conseil de classe..."
                        }
                        className="h-7 w-full rounded border border-rule bg-surface px-2 text-xs text-text placeholder:text-text-soft/60 focus:border-primary focus:outline-none"
                      />
                    </td>

                    {/* Indicateur d'enregistrement */}
                    <td className="py-2.5 px-2 text-center">
                      {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary mx-auto" />}
                      {state === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" />}
                      {state === "error" && (
                        <span title={error} className="inline-block cursor-help">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 mx-auto" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
