"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Loader2, Check, TriangleAlert, Trash2, Plus, FileText, ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import TermDates from "@/components/grades/TermDates";
import { createTerm, deleteTerm, deleteEvaluation } from "@/app/dashboard/grades/actions";
import { setEvaluationDate, createDatedEvaluation } from "./actions";
import type { SchoolCalendar } from "@/lib/pedagogy";

/**
 * **Le calendrier scolaire — trimestres, contrôles et compositions.**
 *
 * ═══ CE QUE CET ÉCRAN CHANGE ═══
 *
 * `Evaluation.date` existait au schéma depuis le début et **aucune interface ne
 * l'écrivait**. Conséquence invisible mais réelle : `pickEvaluation()` (dans
 * `src/lib/gradeEntry.ts`) s'en sert pour décider quelle évaluation s'ouvre
 * devant l'enseignant, et retombait donc systématiquement sur son dernier
 * recours — la dernière évaluation créée. Dater les évaluations range l'année
 * dans le bon ordre pour tout le monde d'un seul geste.
 *
 * ⚠️ **Les dates sont propres à chaque école, sans exception.** Ni valeur par
 * défaut, ni suggestion, ni « rentrée habituelle en octobre ». Une date
 * inventée orienterait la saisie des notes vers la mauvaise période sans que
 * personne ne s'en aperçoive — un silence est réparable, une fiction non.
 */
export default function CalendarPanel({ calendar }: { calendar: SchoolCalendar }) {
  const router = useRouter();
  const [nouveauTrimestre, setNouveauTrimestre] = useState("");
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const ajouterTrimestre = () => {
    const nom = nouveauTrimestre.trim();
    if (!nom) return;
    setErreur(null);
    startTransition(async () => {
      const res = await createTerm(nom);
      if (res?.error) { setErreur(res.error); return; }
      setNouveauTrimestre("");
      router.refresh();
    });
  };

  const jour = (d: Date | string | null) => {
    if (!d) return null;
    const date = d instanceof Date ? d : new Date(d);
    return Number.isNaN(date.getTime())
      ? null
      : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <section id="calendrier" className="scroll-mt-24">
      <Card
        title={
          <span className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-text-faint" />
            Calendrier de l&apos;année
          </span>
        }
        description="Vos trimestres et leurs évaluations. Les dates décident du trimestre qu'EduCom ouvre par défaut à vos enseignants."
        actions={
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="nouveau-trimestre">Nom du trimestre</label>
            <input
              id="nouveau-trimestre"
              value={nouveauTrimestre}
              onChange={(e) => setNouveauTrimestre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ajouterTrimestre(); }}
              placeholder="Ex : 1er Trimestre"
              className="w-44 rounded-control border border-rule bg-surface px-2.5 py-1.5 text-role-meta text-text outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
            />
            <Button size="sm" variant="secondary" loading={pending} onClick={ajouterTrimestre}>
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
        }
      >
        {erreur && (
          <p role="alert" className="mb-4 flex items-start gap-1.5 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-role-meta text-danger">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {erreur}
          </p>
        )}

        {/* ⚠️ Dit UNE fois, en tête, plutôt que répété sous chaque trimestre :
            c'est une conséquence globale, pas le défaut d'une ligne. */}
        {calendar.noDatedTerm && (
          <p className="mb-5 rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5 text-role-meta leading-relaxed text-text-soft">
            Aucun trimestre n&apos;est daté. EduCom ouvre donc à vos enseignants le dernier
            trimestre de la liste, faute de pouvoir situer la période — ce qui peut les
            envoyer en juin alors qu&apos;on est en octobre. Renseignez les dates ci-dessous.
          </p>
        )}

        {/* ── Prochaines échéances : le calendrier vu comme un agenda ── */}
        {calendar.upcoming.length > 0 && (
          <div className="mb-5 rounded-control border border-rule bg-sunk px-4 py-3">
            <p className="text-role-meta font-semibold uppercase tracking-wider text-text-faint">
              Prochaines échéances
            </p>
            <ul className="mt-1.5 space-y-1">
              {calendar.upcoming.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 text-role-body text-text-soft">
                  <span className="font-medium tabular-nums text-text">{jour(e.date)}</span>
                  <span>{e.name}</span>
                  <span className="text-role-meta text-text-faint">· {e.termName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {calendar.terms.length === 0 ? (
          <p className="rounded-control border border-dashed border-rule bg-sunk px-4 py-6 text-center text-role-body text-text-soft">
            Aucun trimestre déclaré. Ajoutez-les ci-dessus, ou appliquez le programme officiel
            dans la section précédente — il crée les trois trimestres d&apos;un coup.
          </p>
        ) : (
          <div className="space-y-4">
            {calendar.terms.map((t) => (
              <div key={t.id} className="overflow-hidden rounded-control border border-rule">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-sunk px-3 py-2">
                  <span className="flex items-center gap-2 text-role-body font-semibold text-text">
                    {t.name}
                    {/* Le trimestre courant est un FAIT calculé (`pickCurrentTerm`),
                        pas un réglage : l'afficher évite la question « lequel
                        EduCom va-t-il ouvrir ? ». */}
                    {t.isCurrent && (
                      <span className="rounded-pill bg-primary/10 px-2 py-0.5 text-role-meta font-semibold text-primary">
                        en cours
                      </span>
                    )}
                    {/* ⚠️ Un repli n'est PAS un trimestre en cours. Le dire
                        autrement contredirait, deux lignes plus bas, le message
                        « sans dates, ce trimestre ne peut pas être choisi ». */}
                    {t.isFallback && (
                      <span
                        className="rounded-pill bg-warning/10 px-2 py-0.5 text-role-meta font-semibold text-warning"
                        title="Aucun trimestre n'étant daté, EduCom se rabat sur le dernier de la liste."
                      >
                        ouvert par défaut
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        const res = await deleteTerm(t.id);
                        if (res?.error) { setErreur(res.error); return; }
                        router.refresh();
                      });
                    }}
                    title={`Supprimer ${t.name}`}
                    className="rounded-control p-1 text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="sr-only">Supprimer {t.name}</span>
                  </button>
                </div>

                {/* Le MÊME composant que la configuration historique — extrait,
                    pas recopié : c'est la donnée qui décide du trimestre courant. */}
                <TermDates
                  term={{ id: t.id, startDate: t.startDate, endDate: t.endDate }}
                  onSaved={() => router.refresh()}
                />

                <ul className="divide-y divide-rule">
                  {t.evaluations.map((e) => (
                    /*
                      ⚠️ **Le nom passe sur SA PROPRE LIGNE sous 640 px.** Mesuré
                      au pilote Chrome à 390 px : dans une rangée unique, la
                      pastille de type et le champ de date consommaient toute la
                      largeur et « Composition du 1er trimestre » se réduisait à
                      « C… ». Un nom tronqué à une lettre n'est plus un nom.
                    */
                    <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2">
                      <span className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
                        {e.isComposition
                          ? <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                          : <ClipboardList aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-faint" />}
                        <span className="min-w-0 flex-1 truncate text-role-body text-text">{e.name}</span>
                      </span>
                      <span className="shrink-0 rounded-pill bg-sunk px-1.5 py-0.5 text-role-meta font-semibold uppercase text-text-faint">
                        {e.isComposition ? "Composition" : "Contrôle"}
                      </span>

                      <EvaluationDate
                        evaluationId={e.id}
                        value={e.date}
                        outsideTerm={e.outsideTerm}
                        onError={setErreur}
                      />

                      <button
                        onClick={() => {
                          startTransition(async () => {
                            const res = await deleteEvaluation(e.id);
                            if (res?.error) { setErreur(res.error); return; }
                            router.refresh();
                          });
                        }}
                        title={`Supprimer ${e.name}`}
                        className="shrink-0 rounded-control p-1 text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        <span className="sr-only">Supprimer {e.name}</span>
                      </button>
                    </li>
                  ))}

                  {t.evaluations.length === 0 && (
                    <li className="px-3 py-3 text-role-meta italic text-text-faint">
                      Aucune évaluation : vos enseignants n&apos;ont rien à remplir sur ce trimestre.
                    </li>
                  )}
                </ul>

                <div className="border-t border-rule px-3 py-2">
                  {ouvert === t.id ? (
                    <NouvelleEvaluation
                      termId={t.id}
                      onDone={() => { setOuvert(null); router.refresh(); }}
                      onCancel={() => setOuvert(null)}
                      onError={setErreur}
                    />
                  ) : (
                    <button
                      onClick={() => { setOuvert(t.id); setErreur(null); }}
                      className="inline-flex items-center gap-1.5 text-role-meta font-medium text-primary transition-colors hover:underline"
                    >
                      <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                      Ajouter un contrôle ou une composition
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {calendar.undated > 0 && (
          <p className="mt-4 text-role-meta leading-relaxed text-text-faint">
            {calendar.undated} évaluation{calendar.undated > 1 ? "s" : ""} sans date. Elles restent
            utilisables — mais EduCom ne peut pas les situer dans l&apos;année, ni proposer la
            bonne d&apos;office à vos enseignants.
          </p>
        )}
      </Card>
    </section>
  );
}

/* ───────────────────────────── date d'une évaluation ───────────────────────────── */

/**
 * ⚠️ Même discipline que `TermDates` : un `<input type="date">` n'émet qu'une
 * date complète ou une chaîne vide, donc on enregistre à la volée — et **aucun
 * `useEffect` de resynchronisation sur les props**, qui écraserait la saisie
 * après le `router.refresh()`.
 */
function EvaluationDate({
  evaluationId, value, outsideTerm, onError,
}: {
  evaluationId: string;
  value: Date | string | null;
  outsideTerm: boolean;
  onError: (m: string | null) => void;
}) {
  const router = useRouter();
  const versInput = (v: Date | string | null): string => {
    if (!v) return "";
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };

  const [date, setDate] = useState(() => versInput(value));
  const [etat, setEtat] = useState<"idle" | "saving" | "saved">("idle");

  const enregistrer = async (valeur: string) => {
    const precedent = date;
    setDate(valeur);
    setEtat("saving");
    onError(null);
    const res = await setEvaluationDate(evaluationId, valeur || null);
    if (res?.error) {
      setEtat("idle");
      setDate(precedent);  // jamais une valeur refusée laissée à l'écran
      onError(res.error);
      return;
    }
    setEtat("saved");
    router.refresh();
  };

  return (
    <span className="flex shrink-0 items-center gap-1">
      <label className="sr-only" htmlFor={`date-${evaluationId}`}>Date de l&apos;évaluation</label>
      <input
        id={`date-${evaluationId}`}
        type="date"
        value={date}
        onChange={(e) => void enregistrer(e.target.value)}
        className={`rounded-control border bg-surface px-2 py-1 text-role-meta text-text outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30 ${
          outsideTerm ? "border-warning/50" : "border-rule"
        }`}
        title={outsideTerm ? "Cette date sort de l'intervalle du trimestre" : undefined}
      />
      <span className="w-3.5" aria-live="polite">
        {etat === "saving" && <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin text-text-faint" />}
        {etat === "saved" && <Check aria-hidden="true" className="h-3 w-3 text-success" />}
      </span>
    </span>
  );
}

/* ───────────────────────────── création d'une évaluation ───────────────────────────── */

function NouvelleEvaluation({
  termId, onDone, onCancel, onError,
}: {
  termId: string;
  onDone: () => void;
  onCancel: () => void;
  onError: (m: string | null) => void;
}) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<"QUIZ" | "EXAM">("QUIZ");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const creer = async () => {
    setBusy(true);
    onError(null);
    const res = await createDatedEvaluation({ name: nom, termId, type, date: date || null });
    setBusy(false);
    if ("error" in res && res.error) { onError(res.error); return; }
    onDone();
  };

  const CHAMP =
    "rounded-control border border-rule bg-surface px-2 py-1.5 text-role-meta text-text outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`nom-${termId}`}>Nom de l&apos;évaluation</label>
      <input
        id={`nom-${termId}`}
        autoFocus
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Ex : Contrôle 2"
        className={`${CHAMP} min-w-[10rem] flex-1`}
      />
      <label className="sr-only" htmlFor={`type-${termId}`}>Type</label>
      <select
        id={`type-${termId}`}
        value={type}
        onChange={(e) => setType(e.target.value as "QUIZ" | "EXAM")}
        className={CHAMP}
      >
        <option value="QUIZ">Contrôle / Devoir</option>
        <option value="EXAM">Composition / Examen</option>
      </select>
      <label className="sr-only" htmlFor={`quand-${termId}`}>Date</label>
      <input
        id={`quand-${termId}`}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={CHAMP}
        // La date est facultative dès la création : une école qui ne l'a pas
        // encore arrêtée ne doit pas être bloquée pour autant.
      />
      <Button size="sm" loading={busy} onClick={creer} disabled={!nom.trim()}>Créer</Button>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Annuler</Button>
    </div>
  );
}
