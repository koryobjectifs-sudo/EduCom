"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Save, ArrowRight, ArrowLeft, Check, CheckCircle2, CircleDashed, Circle,
  UserRound, TriangleAlert, Lock, Unlock, Send, X, Undo2, Search, Plus,
} from "lucide-react";
import { statusLabel } from "@/lib/status";
import {
  getClassRoster, getClassSubjects, getReportCardData, saveGrades,
  getReportCardStates, validateStudentReportCard, reopenStudentReportCard,
  submitClassToSecretariat, submitStudentToSecretariat, validateClassReportCards,
} from "./actions";
import { buildBlocks, type SubjectRow } from "@/lib/bulletin";
import { triggerCelebration } from "@/lib/celebration";

/** Une matière de la classe, avec le droit de saisie de l'utilisateur courant. */
type ScopedSubject = SubjectRow & { editable?: boolean };

/**
 * ⚠️ `max` — le barème RÉEL de la note.
 *
 * Il manquait : `buildPayload` envoyait `max: "20"` en dur. Conséquence
 * silencieuse — corriger une note saisie sur 10 la réenregistrait sur 20, donc
 * **divisait par deux le résultat de l'élève** sans que rien ne l'annonce. Le
 * barème existant est désormais rechargé avec la note et renvoyé tel quel.
 */
type Entry = { id?: string; value: string; coefficient: string; comment: string; max: string };
type EntryMap = Record<string, Record<string, Entry>>;
type StatusMap = Record<string, string>;

const EMPTY_ENTRY: Entry = { value: "", coefficient: "1", comment: "", max: "20" };
const LOCKED = ["VALIDATED", "SUBMITTED", "APPROVED"];

/** Une note vide n'est pas une note à 0 : on ne garde que ce qui a été réellement saisi. */
function isFilled(value: string) {
  return value.trim() !== "" && !Number.isNaN(Number(value));
}

const initials = (s: any) =>
  `${s.firstName?.[0] ?? ""}${s.lastName?.[0] ?? ""}`.toUpperCase();

/** Teinte d'une moyenne : sous 10 on alerte, au-dessus de 14 on félicite. */
function toneOf(v: number | null) {
  if (v === null) return "text-gray-300 border-transparent";
  if (v >= 14) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v >= 10) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

/** Teinte du champ de note : l'ambre signale une case vide, pas une mauvaise note. */
function inputTone(value: string, locked: boolean) {
  if (locked) return "border-gray-200 bg-gray-50 text-gray-500";
  if (!isFilled(value)) return "border-amber-200 bg-amber-50/50";
  const n = Number(value);
  if (n >= 14) return "border-emerald-200 bg-emerald-50/60 text-emerald-900";
  if (n >= 10) return "border-gray-200 bg-white";
  return "border-rose-200 bg-rose-50/60 text-rose-900";
}

const LABEL = "block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1";
const SELECT =
  "w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-shadow disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";
const FIELD =
  "w-full border rounded-md px-2 py-1 text-[13px] focus:ring-2 focus:ring-indigo-500 outline-none transition-colors disabled:cursor-not-allowed";

/**
 * ⚠️ **LES TROIS SÉLECTEURS ARRIVENT DÉJÀ REMPLIS — 22 août 2026.**
 *
 * Cet écran ouvrait sur « Choisir… » pour la classe, « — » pour le trimestre et
 * « — » pour l'évaluation, devant un enseignant dont EduCom connaît pourtant
 * *les trois*. Trois décisions imposées avant la première note, dont aucune
 * n'apportait d'information au produit.
 *
 * ⚠️ **La résolution est faite CÔTÉ SERVEUR** (`bulletin/page.tsx`) et arrive en
 * props, pour deux raisons qui ne se contournent pas :
 *   ① la règle du trimestre courant vit dans `pickCurrentTerm()`
 *      (`src/lib/terms.ts`), un module qui importe Prisma — donc inaccessible à
 *      un composant `"use client"`. La réécrire ici en produirait une **quatrième
 *      copie**, et c'est exactement le bug qui a effacé la moyenne de
 *      l'établissement le 21 août ;
 *   ② le périmètre de classes de l'utilisateur est déjà calculé par la page.
 *
 * Les sélecteurs restent visibles et libres : consulter une autre période est un
 * besoin réel. Ce sont des **défauts**, pas un verrouillage.
 */
export default function StudentEntryTab({
  terms, classes, defaults,
}: {
  terms: any[];
  classes: any[];
  /** Résolus par le serveur. Chaînes vides seulement si la donnée n'existe pas. */
  defaults?: { classId: string; termId: string; evaluationId: string };
}) {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState(defaults?.classId ?? "");
  const [selectedTerm, setSelectedTerm] = useState(defaults?.termId ?? "");
  const [selectedEvaluation, setSelectedEvaluation] = useState(defaults?.evaluationId ?? "");
  const [isNewEntryMode, setIsNewEntryMode] = useState(false);

  // Revenir au mode normal dès que l'enseignant change le trimestre ou l'évaluation
  useEffect(() => {
    setIsNewEntryMode(false);
  }, [selectedTerm, selectedEvaluation]);

  const [subjects, setSubjects] = useState<ScopedSubject[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [entries, setEntries] = useState<EntryMap>({});
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [returnedReason, setReturnedReason] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState("");
  const [query, setQuery] = useState("");

  const [isLoadingClass, setIsLoadingClass] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<null | "validate" | "submit">(null);
  const [submitPopup, setSubmitPopup] = useState<string | null>(null);

  const selectedTermObj = terms.find((t) => t.id === selectedTerm);
  const evaluations = selectedTermObj?.evaluations || [];
  const termHasNoEvaluations = Boolean(selectedTerm) && evaluations.length === 0;
  const selectedClassObj = classes.find((c) => c.id === selectedClass);
  const ready = Boolean(selectedClass && selectedTerm && selectedEvaluation);

  /**
   * Filet, pour le seul cas que le serveur ne peut pas trancher : aucun
   * trimestre n'est daté, donc aucun n'est « courant ».
   *
   * ⚠️ Il ne s'exécute QUE si rien n'est déjà choisi — sinon il écraserait le
   * défaut résolu par le serveur, et pire, la sélection en cours de
   * l'utilisateur à chaque rendu. C'est le piège `FastEntry`, déjà payé.
   */
  useEffect(() => {
    if (selectedTerm) return;
    const first = terms.find((t) => (t.evaluations?.length ?? 0) > 0);
    if (!first) return;
    setSelectedTerm(first.id);
    setSelectedEvaluation(first.evaluations[0].id);
  }, [terms, selectedTerm]);

  /**
   * Même filet pour la classe : si l'utilisateur n'en a qu'une, la lui faire
   * choisir n'est pas une question, c'est une formalité.
   */
  useEffect(() => {
    if (selectedClass || classes.length === 0) return;
    setSelectedClass(classes[0].id);
  }, [classes, selectedClass]);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]); setSubjects([]); setActiveStudentId("");
      return;
    }
    let cancelled = false;
    setIsLoadingClass(true);
    Promise.all([getClassRoster(selectedClass), getClassSubjects(selectedClass)]).then(
      ([roster, subj]) => {
        if (cancelled) return;
        const list = roster.data ?? [];
        setStudents(list);
        setSubjects((subj.data ?? []) as ScopedSubject[]);
        setActiveStudentId(list[0]?.id ?? "");
        setEntries({}); setStatuses({}); setQuery("");
        setIsLoadingClass(false);
      }
    );
    return () => { cancelled = true; };
  }, [selectedClass]);

  const reload = useCallback(async () => {
    if (!ready) return;
    const [gradeRes, stateRes] = await Promise.all([
      getReportCardData(selectedClass, selectedTerm, selectedEvaluation),
      getReportCardStates(selectedClass, selectedEvaluation),
    ]);
    if (gradeRes.data) {
      const map: EntryMap = {};
      for (const g of gradeRes.data.grades ?? []) {
        if (!map[g.studentId]) map[g.studentId] = {};
        map[g.studentId][g.subjectId] = {
          id: g.id,
          value: String(g.value ?? ""),
          coefficient: String(g.coefficient ?? "1"),
          comment: g.comment ?? "",
          max: String(g.max && g.max > 0 ? g.max : 20),
        };
      }
      setEntries(map);
    }
    setStatuses((stateRes.data?.statuses ?? {}) as StatusMap);
    setReturnedReason(stateRes.data?.returnedReason ?? null);
  }, [ready, selectedClass, selectedTerm, selectedEvaluation]);

  useEffect(() => {
    if (!ready) { setEntries({}); setStatuses({}); setReturnedReason(null); return; }
    reload();
  }, [ready, reload]);

  const entryFor = (sid: string, subId: string): Entry => entries[sid]?.[subId] ?? EMPTY_ENTRY;
  const statusOf = (sid: string) => statuses[sid] ?? "DRAFT";
  const isLocked = (sid: string) => LOCKED.includes(statusOf(sid));

  /** Une matière hors du périmètre de l'enseignant s'affiche, mais ne se saisit pas. */
  const canEdit = (subId: string) =>
    subjects.find((s) => s.id === subId)?.editable !== false;

  const outOfScope = subjects.filter((s) => s.editable === false).length;

  const updateEntry = (subId: string, field: keyof Entry, value: string) => {
    if (!activeStudentId || isLocked(activeStudentId) || !canEdit(subId)) return;
    setFeedback(null);
    setEntries((prev) => ({
      ...prev,
      [activeStudentId]: {
        ...prev[activeStudentId],
        [subId]: { ...(prev[activeStudentId]?.[subId] ?? EMPTY_ENTRY), [field]: value },
      },
    }));
  };

  const blocks = useMemo(() => buildBlocks(subjects), [subjects]);

  const averageOf = (sid: string, rows: SubjectRow[]) => {
    let pts = 0, coefs = 0;
    for (const r of rows) {
      const e = entryFor(sid, r.id);
      if (!isFilled(e.value)) continue;
      const c = Number(e.coefficient) || 1;
      pts += Number(e.value) * c; coefs += c;
    }
    return coefs === 0 ? null : pts / coefs;
  };

  const filledCount = (sid: string) => subjects.filter((s) => isFilled(entryFor(sid, s.id).value)).length;
  const missingFor = (sid: string) => subjects.filter((s) => !isFilled(entryFor(sid, s.id).value));

  const activeStudent = students.find((s) => s.id === activeStudentId);
  const activeLocked = activeStudentId ? isLocked(activeStudentId) : false;
  const average = activeStudentId ? averageOf(activeStudentId, subjects) : null;
  const idx = students.findIndex((s) => s.id === activeStudentId);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < students.length - 1;

  const validatedCount = students.filter((s) => isLocked(s.id)).length;
  const progress = students.length ? Math.round((validatedCount / students.length) * 100) : 0;
  const allValidated = students.length > 0 && validatedCount === students.length;
  const alreadySubmitted =
    students.length > 0 && students.every((s) => ["SUBMITTED", "APPROVED"].includes(statusOf(s.id)));

  const visibleStudents = query.trim()
    ? students.filter((s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(query.trim().toLowerCase())
      )
    : students;

  const buildPayload = (sid: string) =>
    subjects
      .filter((s) => isFilled(entryFor(sid, s.id).value) && s.editable !== false)
      .map((s) => {
        const e = entryFor(sid, s.id);
        return {
          id: e.id, value: e.value, max: e.max || "20", coefficient: e.coefficient || "1",
          type: "EXAM", comment: e.comment, studentId: sid, classId: selectedClass,
          subjectId: s.id, termId: selectedTerm, evaluationId: selectedEvaluation,
        };
      });

  const saveStudent = async (thenNext: boolean) => {
    if (!activeStudentId || !ready || activeLocked) return;
    const payload = buildPayload(activeStudentId);
    if (payload.length === 0) {
      setFeedback({ kind: "error", text: "Aucune note saisie pour cet élève." });
      return;
    }
    setIsBusy(true); setFeedback(null);
    const res = await saveGrades(payload);
    setIsBusy(false);
    if (res?.error) { setFeedback({ kind: "error", text: res.error }); return; }

    if (thenNext && hasNext) {
      setActiveStudentId(students[idx + 1].id);
      await reload();
      setFeedback({ kind: "ok", text: "Notes enregistrées." });
      return;
    }
    await reload();
    if (!hasNext) {
      router.push(
        `/dashboard/grades/termine?classId=${selectedClass}&termId=${selectedTerm}&evaluationId=${selectedEvaluation}`
      );
      return;
    }
    setFeedback({ kind: "ok", text: "Notes enregistrées." });
  };

  const doValidate = async () => {
    setConfirm(null);
    if (!activeStudentId || !ready) return;
    setIsBusy(true); setFeedback(null);
    const payload = buildPayload(activeStudentId);
    if (payload.length > 0) await saveGrades(payload);
    const res = await validateStudentReportCard(activeStudentId, selectedClass, selectedTerm, selectedEvaluation);
    setIsBusy(false);
    if (res?.error) { setFeedback({ kind: "error", text: res.error }); return; }
    await reload();
    
    // Célébration globale
    triggerCelebration();
    // Afficher le popup d'envoi
    setSubmitPopup(activeStudentId);
  };

  const doSubmitIndividual = async (submit: boolean) => {
    const sid = submitPopup;
    setSubmitPopup(null);
    
    if (submit && sid) {
      setIsBusy(true);
      const res = await submitStudentToSecretariat(sid, selectedClass, selectedTerm, selectedEvaluation);
      setIsBusy(false);
      if (res?.error) { setFeedback({ kind: "error", text: res.error }); return; }
      await reload();
      setFeedback({ kind: "ok", text: "Bulletin envoyé au secrétariat." });
    } else {
      setFeedback({ kind: "ok", text: "Bulletin enregistré en brouillon." });
    }
    
    if (hasNext) setActiveStudentId(students[idx + 1].id);
  };

  const doValidateAll = async () => {
    setIsBusy(true); setFeedback(null);
    const res = await validateClassReportCards(selectedClass, selectedTerm, selectedEvaluation);
    setIsBusy(false);
    if (res?.error) { setFeedback({ kind: "error", text: res.error }); return; }
    await reload();
    triggerCelebration();
    setFeedback({ kind: "ok", text: `${res.count} bulletin(s) validé(s).` });
  };

  const doReopen = async () => {
    if (!activeStudentId) return;
    setIsBusy(true); setFeedback(null);
    const res = await reopenStudentReportCard(activeStudentId, selectedEvaluation);
    setIsBusy(false);
    if (res?.error) { setFeedback({ kind: "error", text: res.error }); return; }
    await reload();
  };

  const doSubmit = async () => {
    setConfirm(null);
    setIsBusy(true); setFeedback(null);
    const res = await submitClassToSecretariat(selectedClass, selectedTerm, selectedEvaluation);
    setIsBusy(false);
    if (res?.error) { setFeedback({ kind: "error", text: res.error }); return; }
    await reload();
    setFeedback({ kind: "ok", text: `Classe déposée au secrétariat (${res.count} bulletins).` });
  };

  const activeMissing = activeStudentId ? missingFor(activeStudentId) : [];

  return (
    <div className="flex h-full bg-white relative">
      {/* ══════════════ Colonne de travail ══════════════ */}
      <aside className="w-64 shrink-0 border-r border-gray-200 flex flex-col bg-gradient-to-b from-gray-50/80 to-gray-50/40">
        <div className="p-3 space-y-2.5 border-b border-gray-200">
          <div>
            <label className={LABEL}>Classe</label>
            {/* ⚠️ Pas d'option vide quand il n'y a qu'une classe : proposer
                « Choisir… » à qui n'a rien à choisir est une fausse question. */}
            <select className={SELECT} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              {classes.length !== 1 && <option value="">Choisir...</option>}
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL}>Trimestre</label>
              <select
                className={SELECT}
                value={selectedTerm}
                onChange={(e) => { setSelectedTerm(e.target.value); setSelectedEvaluation(""); }}
              >
                <option value="">—</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Évaluation</label>
              <select
                className={`${SELECT} ${termHasNoEvaluations ? "border-amber-300 bg-amber-50 text-amber-800" : ""}`}
                value={selectedEvaluation}
                onChange={(e) => setSelectedEvaluation(e.target.value)}
                disabled={!selectedTerm || evaluations.length === 0}
              >
                <option value="">{termHasNoEvaluations ? "aucune" : "—"}</option>
                {evaluations.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Avancement */}
        {selectedClass && students.length > 0 && (
          <div className="px-3 py-2.5 border-b border-gray-200 bg-white">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Avancement
              </span>
              <span className="text-[13px] font-bold tabular-nums text-gray-900">
                {validatedCount}<span className="text-gray-300 font-medium">/{students.length}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allValidated ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-400 to-indigo-600"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">
              {alreadySubmitted
                ? "Déposé au secrétariat"
                : allValidated
                  ? "Prêt à déposer"
                  : `${students.length - validatedCount} élève(s) restant(s)`}
            </p>
          </div>
        )}

        {/* Recherche, utile dès une dizaine d'élèves */}
        {selectedClass && students.length > 6 && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un élève"
                className="w-full border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-[13px] bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-1.5">
          {!selectedClass ? (
            <p className="p-4 text-xs text-gray-400 text-center">Choisissez votre classe.</p>
          ) : isLoadingClass ? (
            <div className="space-y-2 animate-pulse">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col gap-2 p-3 border border-rule rounded-lg">
                  <div className="h-4 w-3/4 bg-sunk rounded-control"></div>
                  <div className="h-3 w-1/2 bg-sunk/50 rounded-control"></div>
                </div>
              ))}
            </div>
          ) : visibleStudents.length === 0 ? (
            <p className="p-4 text-xs text-gray-400 text-center">
              {students.length === 0 ? "Aucun élève inscrit." : "Aucun résultat."}
            </p>
          ) : (
            <div className="space-y-0.5">
              {visibleStudents.map((s) => {
                const active = s.id === activeStudentId;
                const done = filledCount(s.id);
                const moy = averageOf(s.id, subjects);
                const locked = isLocked(s.id);
                const pct = subjects.length ? (done / subjects.length) * 100 : 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setActiveStudentId(s.id); setFeedback(null); }}
                    className={`w-full text-left rounded-lg px-2 py-1.5 flex items-center gap-2 transition-all ${
                      active
                        ? "bg-white shadow-sm ring-1 ring-indigo-200"
                        : "hover:bg-white/70"
                    }`}
                    title={`${done}/${subjects.length} matières`}
                  >
                    <span
                      className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[10px] font-bold tracking-tight ${
                        active ? "bg-indigo-600 text-white" : "bg-gray-200/70 text-gray-600"
                      }`}
                    >
                      {initials(s)}
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className={`block truncate text-[13px] leading-tight ${active ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {s.firstName} {s.lastName}
                      </span>
                      <span className="mt-1 block h-0.5 rounded-full bg-gray-100 overflow-hidden">
                        <span
                          className={`block h-full rounded-full ${locked ? "bg-emerald-400" : "bg-indigo-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </span>

                    <span className={`shrink-0 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded border ${toneOf(moy)}`}>
                      {moy === null ? "--" : moy.toFixed(1)}
                    </span>

                    {locked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    ) : done === 0 ? (
                      <Circle className="w-3.5 h-3.5 shrink-0 text-gray-200" />
                    ) : (
                      <CircleDashed className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedClass && students.length > 0 && ready && (
          <div className="p-2.5 border-t border-gray-200 bg-white flex flex-col gap-2">
            {!alreadySubmitted && !allValidated && (
              <button
                onClick={doValidateAll}
                disabled={isBusy}
                className="w-full bg-[#539BEB] text-white px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-[#539BEB]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Tout valider d'un coup
              </button>
            )}
            <button
              onClick={() => setConfirm("submit")}
              disabled={!allValidated || alreadySubmitted || isBusy}
              className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              title={alreadySubmitted ? "Déjà déposé" : allValidated ? undefined : "Validez d'abord tous les élèves"}
            >
              <Send className="w-3.5 h-3.5" />
              {alreadySubmitted ? "Déjà déposé" : "Envoyer la classe au secrétariat"}
            </button>
          </div>
        )}
      </aside>

      {/* ══════════════ Bulletin ══════════════ */}
      <section className="flex-1 flex flex-col min-w-0">
        {!selectedClass || !activeStudent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-gray-50 rounded-2xl grid place-items-center mb-4">
              <UserRound className="w-7 h-7 text-indigo-300" />
            </div>
            <p className="text-gray-600 font-medium">Choisissez votre classe</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Vos élèves s'afficheront à gauche, leur bulletin ici.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-200">
              <span className="w-9 h-9 shrink-0 rounded-full bg-indigo-600 text-white grid place-items-center text-[12px] font-bold">
                {initials(activeStudent)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {activeStudent.firstName} {activeStudent.lastName}
                  </h3>
                  {activeLocked && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" />
                      {/* Libellé issu du vocabulaire d'état : le calcul en place
                          affichait « Validé » pour un bulletin APPROVED, alors
                          que `LOCKED` couvre bien les trois états. */}
                      {statusLabel("reportCard", statusOf(activeStudentId))}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 truncate">
                  {selectedClassObj?.name} · {selectedTermObj?.name} ·{" "}
                  {evaluations.find((e: any) => e.id === selectedEvaluation)?.name ?? "—"}
                  <span className="ml-2">élève {idx + 1} / {students.length}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Moyenne</div>
                <div className={`text-2xl font-bold tabular-nums leading-none ${
                  average === null ? "text-gray-300"
                    : average >= 14 ? "text-emerald-600"
                    : average >= 10 ? "text-indigo-600" : "text-rose-600"
                }`}>
                  {average === null ? "--" : average.toFixed(2)}
                  <span className="text-xs font-medium text-gray-300"> /20</span>
                </div>
              </div>
            </header>

            {returnedReason && (
              <div className="flex items-start gap-2 px-5 py-2 bg-amber-50 border-b border-amber-200 text-[12px] text-amber-900">
                <Undo2 className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                <span><strong>Renvoyé par la direction.</strong> Motif : {returnedReason}</span>
              </div>
            )}

            {outOfScope > 0 && (
              <div className="flex items-center gap-2 px-5 py-1.5 bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                <Lock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span>
                  <strong>{outOfScope}</strong> matière(s) hors de votre périmètre — affichées pour
                  le contexte, saisies par un autre enseignant.
                </span>
              </div>
            )}

            {ready && activeMissing.length > 0 && !activeLocked && (
              <div className="flex items-center gap-2 px-5 py-1.5 bg-amber-50/70 border-b border-amber-100 text-[12px] text-amber-900">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span className="truncate">
                  <strong>{activeMissing.length}</strong> matière(s) non saisie(s) — peut rester en
                  brouillon, mais ne sera pas imprimable tel quel.
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {!ready ? (
                <p className="text-center p-6 text-sm text-gray-400">
                  Choisissez un trimestre et une évaluation.
                </p>
              ) : subjects.length === 0 ? (
                <p className="text-center p-6 text-sm text-gray-400">
                  Aucune matière rattachée à «&nbsp;{selectedClassObj?.name}&nbsp;».
                </p>
              ) : isNewEntryMode ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white m-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl grid place-items-center mb-6 shadow-sm">
                    <Plus className="w-8 h-8 text-[#539BEB]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Prêt pour un nouveau bulletin</h2>
                  <p className="text-[14px] text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                    Pour démarrer une nouvelle saisie de notes, sélectionnez simplement un autre <strong>Trimestre</strong> et une autre <strong>Évaluation</strong> dans le panneau de gauche.
                  </p>
                  
                  <div className="bg-gray-50 rounded-xl p-5 text-left border border-gray-100 w-full max-w-md">
                    <h3 className="font-semibold text-gray-900 text-[13px] mb-2 flex items-center gap-2">
                      <TriangleAlert className="w-4 h-4 text-amber-500" />
                      L'évaluation n'existe pas encore ?
                    </h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed">
                      Si vous ne voyez pas l'évaluation souhaitée dans la liste, vous devez d'abord la créer depuis l'onglet <strong>Configuration</strong> en haut à droite.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {blocks.map((block) => {
                    const gAvg = block.title ? averageOf(activeStudentId, block.rows) : null;
                    return (
                      <div
                        key={block.key}
                        className={block.title ? "rounded-xl border border-gray-200 overflow-hidden" : ""}
                      >
                        {block.title && (
                          <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                            <span className="w-1 h-4 rounded-full bg-indigo-500 shrink-0" />
                            <span className="flex-1 text-[13px] font-bold text-gray-900">{block.title}</span>
                            <span className="text-[10px] uppercase tracking-wider text-gray-400">moyenne</span>
                            <span className={`text-[13px] font-bold tabular-nums px-1.5 py-0.5 rounded border ${toneOf(gAvg)}`}>
                              {gAvg === null ? "--" : gAvg.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <table className="w-full text-left border-collapse">
                          <tbody>
                            {block.rows.map((sub) => {
                              const e = entryFor(activeStudentId, sub.id);
                              const locked = activeLocked || sub.editable === false;
                              return (
                                <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-indigo-50/20">
                                  <td className={`py-1 pr-3 text-[13px] text-gray-700 ${block.title ? "pl-4" : "font-semibold text-gray-900"}`}>
                                    {sub.name}
                                  </td>
                                  <td className="py-1 pr-1.5 w-20">
                                    <input
                                      type="number" min="0" max="20" step="0.25" placeholder="--"
                                      value={e.value} disabled={locked}
                                      onChange={(ev) => updateEntry(sub.id, "value", ev.target.value)}
                                      className={`${FIELD} font-semibold text-center ${inputTone(e.value, locked)}`}
                                    />
                                  </td>
                                  <td className="py-1 pr-1.5 w-16">
                                    <input
                                      type="number" min="1" max="10" step="0.5"
                                      value={e.coefficient} disabled={locked}
                                      onChange={(ev) => updateEntry(sub.id, "coefficient", ev.target.value)}
                                      className={`${FIELD} border-gray-200 bg-white text-center text-gray-500 disabled:bg-gray-50`}
                                    />
                                  </td>
                                  <td className="py-1 pr-2">
                                    <input
                                      type="text" placeholder="Appréciation…"
                                      value={e.comment} disabled={locked}
                                      onChange={(ev) => updateEntry(sub.id, "comment", ev.target.value)}
                                      className={`${FIELD} border-transparent bg-transparent hover:border-gray-200 focus:border-gray-200 focus:bg-white disabled:bg-transparent`}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="px-5 py-2.5 border-t border-gray-200 bg-white flex items-center gap-2">
              <button
                onClick={() => { setActiveStudentId(students[idx - 1].id); setFeedback(null); }}
                disabled={!hasPrev}
                className="border border-gray-200 text-gray-500 p-2 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Élève précédent"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {feedback && (
                <span className={`text-[12px] flex items-center gap-1.5 truncate ${feedback.kind === "error" ? "text-red-600" : "text-emerald-600"}`}>
                  {feedback.kind === "error" ? <TriangleAlert className="w-3.5 h-3.5 shrink-0" /> : <Check className="w-3.5 h-3.5 shrink-0" />}
                  {feedback.text}
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                {activeLocked ? (
                  <>
                    <button
                      onClick={doReopen}
                      disabled={isBusy || statusOf(activeStudentId) !== "VALIDATED"}
                      className="border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 flex items-center gap-2"
                      title={statusOf(activeStudentId) !== "VALIDATED" ? "Déjà déposé au secrétariat" : "Rouvrir pour correction"}
                    >
                      <Unlock className="w-3.5 h-3.5" /> Rouvrir
                    </button>
                    <button
                      onClick={() => setIsNewEntryMode(true)}
                      className="bg-[#539BEB] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#539BEB]/90 transition-colors shadow-sm flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nouveau bulletin
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => saveStudent(false)}
                      disabled={isBusy || !ready}
                      className="border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Enregistrer au brouillon
                    </button>
                    <button
                      onClick={() => (activeMissing.length > 0 ? setConfirm("validate") : doValidate())}
                      disabled={isBusy || !ready}
                      className="bg-[#539BEB] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#539BEB]/90 transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" /> Valider
                    </button>
                  </>
                )}
              </div>
            </footer>
          </>
        )}
      </section>

      {/* ══════════════ Confirmations ══════════════ */}
      {confirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <h3 className="text-base font-semibold text-gray-900">
                {confirm === "submit" ? "Envoyer au secrétariat ?" : "Bulletin incomplet"}
              </h3>
              <button onClick={() => setConfirm(null)} className="text-gray-400 hover:bg-gray-200 hover:text-gray-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-sm text-gray-600 space-y-3">
              {confirm === "submit" ? (
                <>
                  <p>
                    Vous êtes sur le point de déposer les <strong>{students.length} bulletins</strong> de{" "}
                    <strong>{selectedClassObj?.name}</strong> ({selectedTermObj?.name} ·{" "}
                    {evaluations.find((e: any) => e.id === selectedEvaluation)?.name}) au secrétariat.
                  </p>
                  <p className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-900 text-[13px]">
                    Cette action vaut <strong>signature</strong> : vous attestez avoir saisi toutes les notes.
                    Les bulletins ne seront plus modifiables sans un renvoi du secrétariat.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>{activeMissing.length} matière(s)</strong> ne sont pas saisies pour{" "}
                    {activeStudent?.firstName} {activeStudent?.lastName} :
                  </p>
                  <p className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-[13px] text-gray-700 max-h-32 overflow-y-auto">
                    {activeMissing.map((s) => s.name).join(", ")}
                  </p>
                  <p>
                    Vous pouvez valider malgré tout — en cas d'absence par exemple — mais le bulletin sera
                    signalé comme incomplet et ne pourra pas être imprimé tel quel.
                  </p>
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/40">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirm === "submit" ? doSubmit : doValidate}
                className={`px-4 py-2 text-[13px] font-medium text-white rounded-lg ${
                  confirm === "submit" ? "bg-gray-900 hover:bg-gray-800" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirm === "submit" ? "Confirmer le dépôt" : "Valider quand même"}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Send className="w-8 h-8 text-[#539BEB]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Envoyer au secrétariat ?</h3>
              <p className="text-[14px] text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                Ce bulletin est désormais validé. Souhaitez-vous le transmettre immédiatement au secrétariat, ou le garder de côté pour l'instant ?
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => doSubmitIndividual(true)}
                  disabled={isBusy}
                  className="w-full bg-[#539BEB] text-white px-4 py-3 rounded-xl text-[14px] font-semibold hover:bg-[#539BEB]/90 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Oui, envoyer ce bulletin
                </button>
                <button
                  onClick={() => doSubmitIndividual(false)}
                  disabled={isBusy}
                  className="w-full bg-white text-gray-700 px-4 py-3 rounded-xl text-[14px] font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  Non, garder en brouillon pour le moment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
