"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Loader2, Check, TriangleAlert, Plus, Minus, Sparkles, Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { addSubjectToClass, removeSubjectFromClass } from "@/app/dashboard/grades/actions";
import { applyCurriculumAction, setSubjectCoefficient } from "./actions";
import type { ProgrammeRow } from "@/lib/pedagogy";

type Subject = { id: string; name: string; parentId: string | null };

/**
 * **Programme et coefficients, classe par classe.**
 *
 * ═══ LES DEUX RÈGLES QUI GOUVERNENT CET ÉCRAN ═══
 *
 * ① **Le modèle sénégalais s'applique, il ne s'impose pas.** Le bouton
 *    « Compléter avec le programme officiel » est *additif* : il ajoute ce qui
 *    manque et ne retire jamais rien (voir `applyCurriculum()` dans
 *    `src/lib/pedagogy.ts`). Une école qui a ajouté « Coran » le garde. C'est
 *    la différence avec `scripts/seed-subjects.ts`, qui SYNCHRONISE et supprime.
 *
 * ② **Retirer une matière notée est refusé, pas confirmé.** Le retrait rendrait
 *    les notes invisibles au bulletin sans les supprimer — pire qu'une erreur,
 *    parce que silencieux. Le serveur refuse ; l'écran le dit avant même le clic
 *    en affichant le nombre de notes.
 */
export default function ProgrammePanel({
  rows,
  subjects,
  proposal,
  missingFromModel,
}: {
  rows: ProgrammeRow[];
  subjects: Subject[];
  proposal: {
    totals: { subjects: number; links: number; terms: number; evaluations: number };
    uncovered: { classId: string; className: string; reason: string }[];
  };
  missingFromModel: number;
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(rows[0]?.classId ?? "");
  const [pending, startTransition] = useTransition();
  const [busySubject, setBusySubject] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rapport, setRapport] = useState<string | null>(null);
  const [withControls, setWithControls] = useState(true);

  const row = rows.find((r) => r.classId === classId) ?? null;
  const attached = useMemo(() => new Set(row?.subjects.map((s) => s.subjectId) ?? []), [row]);

  const appliquer = () => {
    setErreur(null);
    setRapport(null);
    startTransition(async () => {
      const res = await applyCurriculumAction({ withControls });
      if ("error" in res && res.error) { setErreur(res.error); return; }
      const r = (res as { data: NonNullable<Awaited<ReturnType<typeof applyCurriculumAction>>["data"]> }).data;
      // ⚠️ On annonce ce qui a été CRÉÉ, et on distingue « rien à faire » de
      // « échec ». Un bouton qui répond « appliqué » sans rien avoir écrit
      // laisse croire à une action qui n'a pas eu lieu.
      const total = r.subjectsCreated + r.linksCreated + r.termsCreated + r.evaluationsCreated;
      setRapport(
        total === 0
          ? "Tout était déjà en place — rien n'a été modifié."
          : `${r.subjectsCreated} matière(s), ${r.linksCreated} rattachement(s), ${r.termsCreated} trimestre(s) et ${r.evaluationsCreated} évaluation(s) ajoutés. Rien n'a été supprimé.`,
      );
      router.refresh();
    });
  };

  const basculer = async (subjectId: string, estRattachee: boolean) => {
    if (!row) return;
    setBusySubject(subjectId);
    setErreur(null);
    const res = estRattachee
      ? await removeSubjectFromClass(row.classId, subjectId)
      : await addSubjectToClass(row.classId, subjectId);
    setBusySubject(null);
    if (res?.error) { setErreur(res.error); return; }
    router.refresh();
  };

  const parents = subjects.filter((s) => !s.parentId);
  const enfantsDe = (id: string) => subjects.filter((s) => s.parentId === id);
  const nonRattachees = subjects.filter((s) => !attached.has(s.id));

  return (
    // `scroll-mt` : l'ancre `#programme` de la liste de validation ne doit pas
    // s'arrêter sous l'en-tête collant du tableau de bord.
    <section id="programme" className="scroll-mt-24">
    <Card
      title={
        <span className="flex items-center gap-2">
          <BookOpen aria-hidden="true" className="h-4 w-4 text-text-faint" />
          Programme et coefficients
        </span>
      }
      description="Les matières enseignées dans chaque classe, et le poids de chacune sur le bulletin."
    >
      {/* ── Le modèle sénégalais, proposé ── */}
      <div className="rounded-control border border-rule bg-sunk px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-role-body font-semibold text-text">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />
              Programme officiel sénégalais
            </p>
            <p className="mt-0.5 text-role-meta leading-relaxed text-text-soft">
              {missingFromModel > 0
                ? `${missingFromModel} matière${missingFromModel > 1 ? "s" : ""} du programme type ${missingFromModel > 1 ? "manquent" : "manque"} encore à vos classes.`
                : "Vos classes couvrent déjà tout le programme type."}{" "}
              L&apos;application <span className="font-medium text-text">ajoute seulement</span> — elle
              ne supprime jamais ce que vous avez ajusté.
            </p>
          </div>
          <Button size="md" variant="secondary" loading={pending} onClick={appliquer}>
            {pending ? "Application…" : "Compléter avec le programme officiel"}
          </Button>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-role-meta text-text-soft">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={withControls}
            onChange={() => setWithControls((v) => !v)}
          />
          Créer aussi un contrôle par trimestre (les compositions, elles, font partie du socle)
        </label>

        {rapport && (
          <p className="mt-3 flex items-start gap-1.5 text-role-meta font-medium text-success">
            <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {rapport}
          </p>
        )}
        {proposal.uncovered.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-role-meta leading-relaxed text-text-faint">
            <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Non couvert par le modèle : {proposal.uncovered.map((u) => u.className).join(", ")}.{" "}
            {proposal.uncovered[0].reason}
          </p>
        )}
      </div>

      {erreur && (
        <p role="alert" className="mt-4 flex items-start gap-1.5 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-role-meta text-danger">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {erreur}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-5 rounded-control border border-dashed border-rule bg-sunk px-4 py-6 text-center text-role-body text-text-soft">
          Aucune classe n&apos;est encore créée. Créez-les d&apos;abord depuis l&apos;Annuaire.
        </p>
      ) : (
        <>
          {/* ── Choix de la classe ── */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {rows.map((r) => {
              const actif = r.classId === classId;
              return (
                <button
                  key={r.classId}
                  onClick={() => { setClassId(r.classId); setErreur(null); }}
                  aria-current={actif ? "true" : undefined}
                  className={`rounded-control border px-2.5 py-1.5 text-role-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    actif
                      ? "border-primary bg-primary text-white"
                      : "border-rule bg-surface text-text-soft hover:border-primary/30 hover:text-primary"
                  }`}
                >
                  {r.className}
                  <span className={`ml-1.5 tabular-nums ${actif ? "opacity-80" : "text-text-faint"}`}>
                    {r.subjects.length}
                  </span>
                </button>
              );
            })}
          </div>

          {row && (
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* ── Matières au programme, avec leur coefficient ── */}
              <div>
                <p className="mb-2 text-role-meta font-semibold uppercase tracking-wider text-text-faint">
                  Au programme de {row.className} · {row.subjects.length} matière{row.subjects.length > 1 ? "s" : ""}
                </p>

                {row.subjects.length === 0 ? (
                  <p className="rounded-control border border-dashed border-rule bg-sunk px-3 py-5 text-center text-role-meta text-text-soft">
                    Aucune matière rattachée. Utilisez le programme officiel ci-dessus, ou
                    ajoutez-les une par une.
                  </p>
                ) : (
                  <ul className="divide-y divide-rule rounded-control border border-rule">
                    {row.subjects.map((s) => (
                      <li key={s.subjectId} className="flex items-center gap-2 px-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-role-body text-text">{s.name}</span>
                          {s.groupName && (
                            <span className="block text-role-meta text-text-faint">{s.groupName}</span>
                          )}
                        </span>

                        <CoefficientField
                          classId={row.classId}
                          subjectId={s.subjectId}
                          value={s.coefficient}
                          onError={setErreur}
                        />

                        <button
                          onClick={() => basculer(s.subjectId, true)}
                          disabled={busySubject === s.subjectId || s.gradeCount > 0}
                          title={
                            s.gradeCount > 0
                              ? `${s.gradeCount} note(s) saisie(s) : retrait impossible`
                              : "Retirer du programme"
                          }
                          className="shrink-0 rounded-control p-1.5 text-text-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {busySubject === s.subjectId
                            ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                            : <Minus aria-hidden="true" className="h-3.5 w-3.5" />}
                          <span className="sr-only">Retirer {s.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-2 text-role-meta leading-relaxed text-text-faint">
                  {/* Le « pourquoi 1 » est écrit ici, une fois, plutôt que supposé. */}
                  Le coefficient pèse la matière au bulletin. Tout arrive à 1 : il n&apos;existe pas
                  de barème national, chaque école a le sien.
                </p>
              </div>

              {/* ── Matières disponibles ── */}
              <div>
                <p className="mb-2 text-role-meta font-semibold uppercase tracking-wider text-text-faint">
                  Ajouter une matière
                </p>

                {row.missingFromModel.length > 0 && (
                  <p className="mb-2 rounded-control border border-rule bg-sunk px-3 py-2 text-role-meta leading-relaxed text-text-soft">
                    Le programme type de {row.className} prévoit aussi :{" "}
                    <span className="font-medium text-text">{row.missingFromModel.join(", ")}</span>.
                  </p>
                )}

                {nonRattachees.length === 0 ? (
                  <p className="rounded-control border border-dashed border-rule bg-sunk px-3 py-5 text-center text-role-meta text-text-soft">
                    Toutes les matières de l&apos;école sont déjà au programme de cette classe.
                  </p>
                ) : (
                  <div className="max-h-[360px] space-y-1 overflow-y-auto rounded-control border border-rule p-1.5">
                    {parents.map((parent) => {
                      const enfants = enfantsDe(parent.id);
                      const visibles = [parent, ...enfants].filter((s) => !attached.has(s.id));
                      if (visibles.length === 0) return null;
                      return (
                        <div key={parent.id}>
                          {visibles.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => basculer(s.id, false)}
                              disabled={busySubject === s.id}
                              className={`flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-role-meta text-text-soft transition-colors hover:bg-sunk hover:text-text disabled:opacity-50 ${
                                s.parentId ? "pl-6" : "font-medium"
                              }`}
                            >
                              {busySubject === s.id
                                ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin" />
                                : <Plus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-faint" />}
                              <span className="truncate">{s.name}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
    </section>
  );
}

/**
 * Le coefficient d'une matière — **enregistré à la sortie du champ, pas à la frappe.**
 *
 * ⚠️ Un `onChange` par caractère enverrait « 1 », puis « 1. », puis « 1.5 » :
 * les deux premiers sont des états intermédiaires que le serveur refuserait ou,
 * pire, enregistrerait. On attend donc `blur` ou `Entrée`. C'est la différence
 * avec `TermDates`, où un `<input type="date">` n'émet qu'une valeur complète.
 *
 * ⚠️ **Aucun `useEffect` de resynchronisation sur `value`.** Même piège que
 * `FastEntry` : après le `router.refresh()`, il écraserait la saisie en cours.
 */
function CoefficientField({
  classId, subjectId, value, onError,
}: {
  classId: string; subjectId: string; value: number;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [texte, setTexte] = useState(String(value));
  const [etat, setEtat] = useState<"idle" | "saving" | "saved">("idle");

  const valider = async () => {
    const n = Number(texte.replace(",", "."));
    if (!Number.isFinite(n) || n === value) { setTexte(String(value)); return; }

    setEtat("saving");
    onError(null);
    const res = await setSubjectCoefficient(classId, subjectId, n);
    if (res?.error) {
      setEtat("idle");
      setTexte(String(value));   // on ne laisse jamais à l'écran une valeur non enregistrée
      onError(res.error);
      return;
    }
    setEtat("saved");
    router.refresh();
  };

  return (
    <span className="flex shrink-0 items-center gap-1">
      <label className="sr-only" htmlFor={`coef-${classId}-${subjectId}`}>Coefficient</label>
      <span aria-hidden="true" className="text-role-meta text-text-faint">×</span>
      <input
        id={`coef-${classId}-${subjectId}`}
        type="text"
        inputMode="decimal"
        value={texte}
        onChange={(e) => { setTexte(e.target.value); setEtat("idle"); }}
        onBlur={valider}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-12 rounded-control border border-rule bg-surface px-1.5 py-1 text-center text-role-meta tabular-nums text-text outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
      />
      <span className="w-3.5" aria-live="polite">
        {etat === "saving" && <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin text-text-faint" />}
        {etat === "saved" && <Check aria-hidden="true" className="h-3 w-3 text-success" />}
      </span>
    </span>
  );
}
