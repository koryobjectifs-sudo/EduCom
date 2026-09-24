"use client";

import { Fragment, memo, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Search, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  AppreciationCell,
  CalculationRule,
  ComputedCell,
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
import { saveSubDisciplineGrade, saveTitulaireAppreciation, type ElementaireContext } from "./actions";
import { calculerEleveElementaire, type SousDisciplineInput } from "@/lib/notes/elementaire";

type Ctx = Extract<ElementaireContext, { ok: true }>;
type CellState = SaveState;

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
  const router = useRouter();
  const [activeDomainId, setActiveDomainId] = useState<string>("ALL");
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

  // ⚠️ Aucun effet de resynchronisation sur `ctx` : la page remonte ce composant
  // par sa `key` (classe-trimestre). Un tel effet écraserait une saisie en cours.

  const totalNotes = useMemo(() => {
    let count = 0;
    for (const studentNotes of Object.values(notes)) {
      for (const val of Object.values(studentNotes)) {
        if (val.trim() !== "") count++;
      }
    }
    return count;
  }, [notes]);

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

  const totalColonnes = useMemo(
    () => ctx.domaines.reduce((a, d) => a + d.sousDisciplines.length, 0),
    [ctx.domaines],
  );

  const activeDomain = useMemo(
    () => (activeDomainId === "ALL" ? null : ctx.domaines.find((d) => d.domainId === activeDomainId) ?? null),
    [activeDomainId, ctx.domaines],
  );

  const displaySousDisciplinesCount = useMemo(
    () => (activeDomain ? activeDomain.sousDisciplines.length : totalColonnes),
    [activeDomain, totalColonnes],
  );

  const displayNotesCount = useMemo(() => {
    if (!activeDomain) return totalNotes;
    const sdIds = new Set(activeDomain.sousDisciplines.map((sd) => sd.id));
    let count = 0;
    for (const studentNotes of Object.values(notes)) {
      for (const [sdId, val] of Object.entries(studentNotes)) {
        if (sdIds.has(sdId) && val.trim() !== "") count++;
      }
    }
    return count;
  }, [activeDomain, notes, totalNotes]);

  const filteredEleves = useMemo(() => {
    if (!search.trim()) return ctx.eleves;
    const q = search.toLowerCase().trim();
    return ctx.eleves.filter(
      (e) => e.lastName.toLowerCase().includes(q) || e.firstName.toLowerCase().includes(q),
    );
  }, [ctx.eleves, search]);

  // ─── Appréciation du maître titulaire, sur la ligne de l'élève ───
  const [appreciations, setAppreciations] = useState<Record<string, string>>(() =>
    Object.fromEntries(ctx.eleves.map((e) => [e.studentId, e.appreciation ?? ""])),
  );

  const onAppreciationChange = useCallback((studentId: string, text: string) => {
    setAppreciations((p) => ({ ...p, [studentId]: text }));
  }, []);

  const onAppreciationBlur = useCallback(
    async (studentId: string, comment: string) => {
      const key = `a:${studentId}`;
      setStates((s) => ({ ...s, [key]: "saving" }));
      const res = await saveTitulaireAppreciation({ studentId, classId: ctx.classId, termId: ctx.termId, comment });
      setStates((s) => ({ ...s, [key]: res.ok ? "saved" : "error" }));
      setErrors((e) => {
        const n = { ...e };
        if (res.ok) delete n[key];
        else n[key] = res.error;
        return n;
      });
    },
    [ctx.classId, ctx.termId],
  );

  const url = (classId: string, termId: string) => `/dashboard/grades/elementaire?class=${classId}&term=${termId}`;

  const handleSubmit = () => {
    toast.success(`Saisie des notes de ${ctx.className} validée et transmise à l'administration.`);
  };

  return (
    <div className="space-y-4">
      {!ctx.canEdit && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 shadow-2xs">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold">Mode consultation active (lecture seule)</span>
            <span className="text-amber-700 ml-1.5">
              — Seul le maître titulaire de cette classe peut saisir ou modifier les notes des élèves.
            </span>
          </div>
        </div>
      )}

      <EntryHeader
        title={activeDomain ? activeDomain.name : "Toutes les disciplines"}
        classLabel={ctx.className}
        tag="Élémentaire (CI à CM2)"
        notesCount={displayNotesCount}
        meta={`${ctx.termName} · ${displaySousDisciplinesCount} sous-discipline${displaySousDisciplinesCount > 1 ? "s" : ""}${activeDomain ? ` du domaine ${activeDomain.name}` : ` réparties en ${ctx.domaines.length} domaines`} · ${ctx.eleves.length} élève${ctx.eleves.length > 1 ? "s" : ""}`}
        terms={ctx.allTerms}
        activeTermId={ctx.termId}
        termHref={(termId) => url(ctx.classId, termId)}
      >
        <ContextField label="Classe">
          {ctx.allClasses.length > 1 ? (
            <ContextSelect
              ariaLabel="Classe"
              value={ctx.classId}
              onChange={(classId) => router.push(url(classId, ctx.termId))}
              options={ctx.allClasses.map((c) => ({ id: c.id, label: c.name }))}
            />
          ) : (
            <ContextValue>{ctx.className}</ContextValue>
          )}
        </ContextField>

        <ContextField label="Domaine" icon={<BookOpen aria-hidden="true" className="h-3 w-3" />}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveDomainId("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                activeDomainId === "ALL"
                  ? "bg-primary text-white font-semibold shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium"
              }`}
            >
              Tous les domaines ({totalColonnes})
            </button>
            {ctx.domaines.map((d) => (
              <button
                key={d.domainId}
                type="button"
                onClick={() => setActiveDomainId(d.domainId)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                  activeDomainId === d.domainId
                    ? "bg-primary text-white font-semibold shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium"
                }`}
              >
                {d.name} ({d.sousDisciplines.length})
              </button>
            ))}
          </div>
        </ContextField>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <div className="relative w-full sm:w-56">
            <Search aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="search"
              aria-label="Filtrer un élève"
              placeholder="Filtrer un élève…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-full pl-8 pr-3 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {ctx.canEdit && (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Soumettre</span>
            </button>
          )}
        </div>
      </EntryHeader>

      <EntryTable caption={`Notes de ${ctx.className} — ${activeDomain ? activeDomain.name : "Toutes les disciplines"}, ${ctx.termName}`}>
        <EntryHead>
          {activeDomain ? (
            /* En-tête sur une seule ligne (structure identique à la référence secondaire) */
            <tr>
              <Th kind="student">
                Élève
                {search.trim() && (
                  <span className="block text-[10px] font-normal text-gray-400">{filteredEleves.length} affiché(s)</span>
                )}
              </Th>
              {activeDomain.sousDisciplines.map((sd) => (
                <Th key={sd.id} kind="note" sub={`/${sd.scale}`} title={sd.name}>
                  <span className="block truncate max-w-[120px] mx-auto">{sd.name}</span>
                </Th>
              ))}
              <Th kind="computed" sub={new Set(activeDomain.sousDisciplines.map((sd) => sd.scale)).size === 1 ? `/${activeDomain.sousDisciplines[0].scale}` : undefined}>
                Moy. {activeDomain.name}
              </Th>
              <Th kind="computed" sub="/20">
                Moy. Gén.
              </Th>
              <Th kind="text">
                Appréciation du maître titulaire
              </Th>
            </tr>
          ) : (
            /* Vue d'ensemble tous domaines — en-tête groupé à 2 niveaux */
            <>
              <tr>
                <Th kind="student" rowSpan={2}>
                  Élève
                  {search.trim() && (
                    <span className="block text-[10px] font-normal text-gray-400">{filteredEleves.length} affiché(s)</span>
                  )}
                </Th>
                {ctx.domaines.map((d) => (
                  <Th key={d.domainId} kind="group" colSpan={d.sousDisciplines.length + 1}>
                    {d.name}
                  </Th>
                ))}
                <Th kind="computed" rowSpan={2} sub="/20">
                  Moy. Gén.
                </Th>
                <Th kind="text" rowSpan={2}>
                  Appréciation du maître titulaire
                </Th>
              </tr>
              <tr>
                {ctx.domaines.map((d) => {
                  const baremes = new Set(d.sousDisciplines.map((sd) => sd.scale));
                  return (
                    <Fragment key={d.domainId}>
                      {d.sousDisciplines.map((sd) => (
                        <Th key={sd.id} kind="note" sub={`/${sd.scale}`} title={sd.name}>
                          <span className="block truncate max-w-[110px] mx-auto">{sd.name}</span>
                        </Th>
                      ))}
                      <Th kind="computed" sub={baremes.size === 1 ? `/${[...baremes][0]}` : undefined}>
                        Moy.
                      </Th>
                    </Fragment>
                  );
                })}
              </tr>
            </>
          )}
        </EntryHead>
        <tbody>
          {filteredEleves.map((eleve, studentIdx) => (
            <EleveRow
              key={eleve.studentId}
              eleve={eleve}
              studentIdx={studentIdx}
              readOnly={!ctx.canEdit}
              domaines={ctx.domaines}
              activeDomainId={activeDomainId}
              studentNotes={notes[eleve.studentId] ?? {}}
              appreciation={appreciations[eleve.studentId] ?? ""}
              states={states}
              errors={errors}
              onChange={onChange}
              onBlur={onBlur}
              onAppreciationChange={onAppreciationChange}
              onAppreciationBlur={onAppreciationBlur}
            />
          ))}
          {filteredEleves.length === 0 && (
            <tr>
              <td colSpan={activeDomain ? activeDomain.sousDisciplines.length + 4 : totalColonnes + ctx.domaines.length + 3} className="px-4 py-8 text-center text-sm text-gray-500">
                Aucun élève ne correspond à « {search} ».
              </td>
            </tr>
          )}
        </tbody>
      </EntryTable>

      <EntryHelp />

      {/* Règle de `calculerEleveElementaire` (lib/notes/elementaire.ts) — à garder alignée sur le moteur. */}
      <CalculationRule>
        Moyenne d&apos;un domaine = somme des notes du domaine / nombre de sous-disciplines notées. Moyenne générale
        = total des points obtenus / total maximum des sous-disciplines notées, ramenée sur 20. Pas de coefficient à
        l&apos;élémentaire, et une <strong>sous-discipline non notée est exclue du calcul</strong> (jamais comptée
        zéro).
      </CalculationRule>
    </div>
  );
}

// -------------------------------------------------------------
// LIGNE ÉLÈVE MÉMOÏSÉE (Optimisation 60 élèves = 0 lag)
// -------------------------------------------------------------
type EleveRowProps = {
  eleve: Ctx["eleves"][number];
  studentIdx: number;
  readOnly?: boolean;
  domaines: Ctx["domaines"];
  activeDomainId: string;
  studentNotes: Record<string, string>;
  appreciation: string;
  states: Record<string, CellState>;
  errors: Record<string, string>;
  onChange: (studentId: string, sdId: string, scale: number, raw: string) => void;
  onBlur: (studentId: string, sdId: string, scale: number, raw: string) => void;
  onAppreciationChange: (studentId: string, text: string) => void;
  onAppreciationBlur: (studentId: string, text: string) => void;
};

const EleveRow = memo(function EleveRow({
  eleve,
  studentIdx,
  readOnly = false,
  domaines,
  activeDomainId,
  studentNotes,
  appreciation,
  states,
  errors,
  onChange,
  onBlur,
  onAppreciationChange,
  onAppreciationBlur,
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

  const nom = `${eleve.firstName} ${eleve.lastName}`;
  const renderedDomaines = useMemo(
    () => (activeDomainId === "ALL" ? domaines : domaines.filter((d) => d.domainId === activeDomainId)),
    [activeDomainId, domaines],
  );

  return (
    <EntryRow>
      <StudentCell lastName={eleve.lastName} firstName={eleve.firstName} />
      {renderedDomaines.map((d) => {
        const domaineRes = calcul.domaines.find((res) => res.domainId === d.domainId);
        return (
          <Fragment key={d.domainId}>
            {d.sousDisciplines.map((sd) => {
              const key = `${eleve.studentId}:${sd.id}`;
              return (
                <NoteCell
                  key={sd.id}
                  row={studentIdx}
                  col={sd.id}
                  readOnly={readOnly}
                  ariaLabel={`${sd.name} de ${nom}, sur ${sd.scale}`}
                  value={studentNotes[sd.id] ?? ""}
                  state={states[key] ?? "idle"}
                  error={errors[key]}
                  onChange={(raw) => onChange(eleve.studentId, sd.id, sd.scale, raw)}
                  onBlur={(raw) => onBlur(eleve.studentId, sd.id, sd.scale, raw)}
                />
              );
            })}
            {/* Moyenne du domaine, calculée en temps réel via le moteur officiel */}
            <ComputedCell value={domaineRes?.moyenne} />
          </Fragment>
        );
      })}

      {/* Moyenne générale ramenée sur 20 */}
      <ComputedCell value={calcul.moyenneGenerale} strong />

      <AppreciationCell
        ariaLabel={`Appréciation du maître pour ${nom}`}
        placeholder="Appréciation du trimestre…"
        value={appreciation}
        readOnly={readOnly}
        state={states[`a:${eleve.studentId}`] ?? "idle"}
        error={errors[`a:${eleve.studentId}`]}
        onChange={(text) => onAppreciationChange(eleve.studentId, text)}
        onBlur={(text) => onAppreciationBlur(eleve.studentId, text)}
      />
    </EntryRow>
  );
});
