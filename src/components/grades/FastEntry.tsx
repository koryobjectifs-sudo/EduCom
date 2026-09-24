"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, GraduationCap, Send } from "lucide-react";
import {
  CalculationRule,
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
import { saveOneGrade } from "@/app/dashboard/grades/saisie/actions";
import type { EntryContext } from "@/lib/gradeEntry";

/**
 * L'écran de saisie rapide — **élève → note → élève → note**.
 *
 * ═══ CE QUI EST OPTIMISÉ, ET POURQUOI ═══
 *
 * Un enseignant saisit 30 notes d'affilée. Chaque friction est donc multipliée
 * par trente : un clic sur « Enregistrer » par note, c'est trente clics ; une
 * confirmation, trente confirmations.
 *
 *   · **`Entrée` descend d'une ligne**, `Maj+Entrée` remonte. C'est le geste
 *     naturel d'une liste d'élèves, et il évite la souris entièrement.
 *   · **Sauvegarde automatique** à la sortie du champ et après une pause de
 *     frappe. Aucun bouton « Enregistrer ».
 *   · **L'état de sauvegarde est par ligne**, jamais global : savoir que
 *     « quelque chose » enregistre n'aide pas ; savoir que la ligne de Fatou est
 *     enregistrée, si.
 *
 * ⚠️ **Une case vide n'est pas un zéro.** L'ancienne grille « Par matière »
 * filtrait avec `if (!g.value)` : un élève à 0 était traité comme non noté et sa
 * note n'était jamais enregistrée. Ici, `""` supprime la note et `0` en écrit
 * une — deux chemins distincts, jusque dans l'action serveur.
 *
 * ⚠️ **Le barème vient du serveur**, déduit des notes déjà saisies pour la
 * matière. Écrire « / 20 » en dur fausserait les moyennes d'une école qui note
 * sur 10, sans que rien ne l'annonce.
 */

type RowState = SaveState;

export default function FastEntry({ ctx }: { ctx: EntryContext }) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [rows, setRows] = useState(ctx.rows);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(ctx.rows.map((r) => [r.studentId, r.value === null ? "" : String(r.value)])),
  );
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /**
   * ⚠️ PIÈGE CORRIGÉ — AUCUN EFFET DE RÉINITIALISATION ICI.
   *
   * La première version resynchronisait l'état sur `ctx.rows` à chaque rendu du
   * parent. Mesuré au pilote Chrome : après chaque sauvegarde, `router.refresh()`
   * renvoyait un nouveau tableau, l'effet repartait, et **le badge « Enregistré »
   * disparaissait aussitôt**. Bien pire : une note en cours de frappe dans un
   * autre champ aurait été remplacée par la valeur du serveur, en silence, au
   * milieu d'une saisie de trente notes.
   *
   * Le remontage est piloté par la `key` du composant, dans
   * `grades/saisie/page.tsx` : changer de matière, d'évaluation ou de trimestre
   * crée une instance neuve. C'est React qui gère le cycle de vie, pas un effet
   * qui court après les props.
   */

  useEffect(() => {
    const t = timers.current;
    return () => { for (const id of Object.keys(t)) clearTimeout(t[id]); };
  }, []);

  const filled = useMemo(
    () => Object.values(drafts).filter((v) => v.trim() !== "").length,
    [drafts],
  );
  const total = rows.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const remaining = total - filled;

  const commit = useCallback(
    async (studentId: string, raw: string) => {
      const row = rows.find((r) => r.studentId === studentId);
      if (!row) return;

      const text = raw.trim().replace(",", ".");
      // `""` efface la note ; `0` en écrit une. Deux chemins, jamais confondus.
      const value = text === "" ? null : Number(text);

      if (value !== null && (!Number.isFinite(value) || value < 0 || value > row.max)) {
        setStates((s) => ({ ...s, [studentId]: "error" }));
        setErrors((e) => ({ ...e, [studentId]: `Entre 0 et ${row.max}` }));
        return;
      }

      setStates((s) => ({ ...s, [studentId]: "saving" }));
      setErrors((e) => { const n = { ...e }; delete n[studentId]; return n; });

      const res = await saveOneGrade({
        gradeId: row.gradeId,
        studentId,
        classId: ctx.klass.id,
        subjectId: ctx.subject.id,
        termId: ctx.term.id,
        evaluationId: ctx.evaluation.id,
        value,
        max: row.max,
        coefficient: row.coefficient,
      });

      if (!res.ok) {
        setStates((s) => ({ ...s, [studentId]: "error" }));
        setErrors((e) => ({ ...e, [studentId]: res.error }));
        return;
      }

      setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, gradeId: res.gradeId, value } : r)));
      setStates((s) => ({ ...s, [studentId]: "saved" }));
    },
    [rows, ctx.klass.id, ctx.subject.id, ctx.term.id, ctx.evaluation.id],
  );

  const onChange = (studentId: string, raw: string) => {
    setDrafts((d) => ({ ...d, [studentId]: raw }));
    setStates((s) => ({ ...s, [studentId]: "idle" }));
    clearTimeout(timers.current[studentId]);
    timers.current[studentId] = setTimeout(() => commit(studentId, raw), 700);
  };

  const onBlur = (studentId: string, raw: string) => {
    clearTimeout(timers.current[studentId]);
    void commit(studentId, raw);
  };

  const complete = total > 0 && filled === total;

  // Un coefficient unique s'affiche dans l'en-tête, comme sur la saisie secondaire ;
  // s'il varie d'une ligne à l'autre, il reste visible en colonne.
  const coefs = new Set(rows.map((r) => r.coefficient));
  const uniformCoef = coefs.size === 1 ? [...coefs][0] : null;

  const url = (patch: Record<string, string>, dropEval = false) => {
    const p = new URLSearchParams({
      class: ctx.klass.id,
      subject: ctx.subject.id,
      term: ctx.term.id,
      eval: ctx.evaluation.id,
      ...patch,
    });
    // Changer de trimestre invalide l'évaluation : elle appartient au
    // trimestre précédent et n'existe pas dans le nouveau.
    if (dropEval) p.delete("eval");
    return `/dashboard/grades/saisie?${p.toString()}`;
  };

  const subjectLabel = ctx.subject.groupName ? `${ctx.subject.groupName} › ${ctx.subject.name}` : ctx.subject.name;

  return (
    <div className="space-y-4 pb-12">
      <Link
        href="/dashboard/grades"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Mes classes
      </Link>

      <EntryHeader
        title={subjectLabel}
        classLabel={ctx.klass.name}
        coefficient={uniformCoef}
        notesCount={filled}
        meta={
          <>
            {ctx.term.name} · {ctx.evaluation.name}
            {/* ⚠️ La date vient de la configuration pédagogique. Elle s'affiche
                ICI parce que c'est l'écran où l'enseignant travaille : si la
                direction déplace la composition, il le voit sans chercher.
                Aucune date n'est inventée — absente, elle ne s'affiche pas. */}
            {ctx.evaluation.date &&
              ` · ${new Date(ctx.evaluation.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
            {` · ${total} élève${total > 1 ? "s" : ""}`}
          </>
        }
        terms={ctx.termChoices.map((t) => ({ id: t.id, name: t.name }))}
        activeTermId={ctx.term.id}
        termHref={(termId) => url({ term: termId }, true)}
      >
        <ContextField label="Classe">
          <ContextValue>{ctx.klass.name}</ContextValue>
        </ContextField>
        <ContextField label="Matière" icon={<BookOpen aria-hidden="true" className="h-3 w-3" />}>
          {ctx.subjectChoices.length > 1 ? (
            <ContextSelect
              ariaLabel="Matière"
              value={ctx.subject.id}
              onChange={(id) => router.push(url({ subject: id }))}
              options={ctx.subjectChoices.map((s) => ({
                id: s.id,
                label: s.groupName ? `${s.groupName} › ${s.name}` : s.name,
              }))}
            />
          ) : (
            <ContextValue>{subjectLabel}</ContextValue>
          )}
        </ContextField>
        <ContextField label="Évaluation">
          {ctx.evaluationChoices.length > 1 ? (
            <ContextSelect
              ariaLabel="Évaluation"
              value={ctx.evaluation.id}
              onChange={(id) => router.push(url({ eval: id }))}
              options={ctx.evaluationChoices.map((e) => ({ id: e.id, label: e.name }))}
            />
          ) : (
            <ContextValue>{ctx.evaluation.name}</ContextValue>
          )}
        </ContextField>

        {/* ═══ Progression ═══ */}
        <div className="w-full sm:w-56 sm:ml-auto">
          <p className={`text-[11px] font-medium ${complete ? "text-emerald-700" : "text-gray-500"}`}>
            {complete
              ? "✓ Évaluation complète"
              : `${remaining} élève${remaining > 1 ? "s" : ""} reste${remaining > 1 ? "nt" : ""} à noter`}
          </p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-pill bg-gray-100">
            <motion.div
              className={`h-full rounded-pill ${complete ? "bg-emerald-500" : "bg-primary"}`}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </EntryHeader>

      <EntryTable caption={`Notes de ${ctx.subject.name} — ${ctx.klass.name}, ${ctx.evaluation.name}`}>
        <EntryHead>
          <tr>
            <Th kind="student">Élève</Th>
            <Th kind="note" sub={`/ ${ctx.defaultMax}`}>
              {ctx.evaluation.name}
            </Th>
            {uniformCoef === null && <Th kind="note">Coef.</Th>}
          </tr>
        </EntryHead>
        <tbody>
          {rows.map((r, i) => (
            <EntryRow key={r.studentId}>
              <StudentCell lastName={r.lastName} firstName={r.firstName} />
              <NoteCell
                row={i}
                col="note"
                ariaLabel={`Note de ${r.firstName} ${r.lastName}, sur ${r.max}`}
                value={drafts[r.studentId] ?? ""}
                state={states[r.studentId] ?? "idle"}
                error={errors[r.studentId]}
                onChange={(raw) => onChange(r.studentId, raw)}
                onBlur={(raw) => onBlur(r.studentId, raw)}
              />
              {uniformCoef === null && (
                <td className="border-l border-b border-gray-100 px-2 py-2 text-center text-sm tabular-nums text-gray-600">
                  {r.coefficient}
                </td>
              )}
            </EntryRow>
          ))}
        </tbody>
      </EntryTable>

      <EntryHelp />

      <CalculationRule>
        Évaluation notée sur {ctx.defaultMax}
        {uniformCoef != null ? ` (coefficient ${uniformCoef})` : ""}.
        Les notes sont enregistrées automatiquement à la sortie du champ et prises en compte dans le calcul du bulletin du {ctx.term.name}.
      </CalculationRule>

      <NextStep ctx={ctx} filled={filled} total={total} />
    </div>
  );
}

/**
 * **Et ensuite ?** — le bloc qui manquait au moment exact du WIN.
 *
 * ═══ LE CUL-DE-SAC QUE CECI SUPPRIME ═══
 *
 * L'écran affichait « ✓ Évaluation complète » et **ne proposait rien**. Or un
 * maître unique de l'élémentaire a HUIT matières à saisir pour la même
 * composition : il devait, huit fois, remonter à la liste, retrouver la ligne
 * suivante et cliquer. Le produit connaissait pourtant la réponse — c'est
 * `ctx.siblings`, calculé en une seule requête côté serveur.
 *
 * ⚠️ **Le bloc n'apparaît QUE lorsque la matière courante est terminée.** Le
 * montrer pendant la saisie inviterait à partir avant d'avoir fini : une
 * suggestion au mauvais moment est une distraction, pas un service.
 *
 * ⚠️ **Aucun automatisme.** On n'enchaîne pas sur la matière suivante tout
 * seul : l'enseignant peut vouloir relire. On lui met la porte devant les yeux,
 * il la pousse.
 */
function NextStep({ ctx, filled, total }: { ctx: EntryContext; filled: number; total: number }) {
  if (total === 0 || filled < total) return null;

  const url = (patch: Record<string, string>) => {
    const p = new URLSearchParams({
      class: ctx.klass.id, subject: ctx.subject.id,
      term: ctx.term.id, eval: ctx.evaluation.id, ...patch,
    });
    return `/dashboard/grades/saisie?${p.toString()}`;
  };

  // La prochaine matière incomplète de MON périmètre, dans l'ordre affiché.
  const suivante = ctx.siblings.find((s) => s.id !== ctx.subject.id && s.filled < s.total);
  const restantes = ctx.siblings.filter((s) => s.filled < s.total).length;
  const toutFini = restantes === 0;

  const bilan = new URLSearchParams({
    classId: ctx.klass.id, termId: ctx.term.id, evaluationId: ctx.evaluation.id,
  });

  return (
    <section className="rounded-surface border border-success/25 bg-success/5 px-5 py-4">
      <p className="flex items-center gap-2 text-role-card font-semibold text-text">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
        {ctx.subject.name} — {ctx.klass.name} : c&apos;est complet.
      </p>

      <p className="mt-1 text-role-body leading-relaxed text-text-soft">
        {toutFini
          ? `Toutes vos matières de ${ctx.klass.name} sont saisies pour « ${ctx.evaluation.name} ». Vous pouvez relire le bulletin, puis le déposer au secrétariat.`
          : `Il vous reste ${restantes} matière${restantes > 1 ? "s" : ""} à saisir sur cette évaluation.`}
      </p>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {suivante && (
          <Link
            href={url({ subject: suivante.id })}
            className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-2 text-role-body font-medium text-white shadow-card transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Matière suivante : {suivante.groupName ? `${suivante.groupName} › ${suivante.name}` : suivante.name}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}

        <Link
          href="/dashboard/grades/bulletin"
          className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-surface px-3.5 py-2 text-role-body font-medium text-text-soft transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <GraduationCap aria-hidden="true" className="h-4 w-4" />
          Voir le bulletin
        </Link>

        {/* La remise au secrétariat n'est proposée QUE si tout est saisi :
            déposer une classe incomplète ferait relire un travail inachevé. */}
        {toutFini && (
          <Link
            href={`/dashboard/grades/termine?${bilan.toString()}`}
            className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-surface px-3.5 py-2 text-role-body font-medium text-text-soft transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            Terminer et déposer
          </Link>
        )}
      </div>

      {/* ⚠️ L'avancement des AUTRES matières, en clair : sans cela l'enseignant
          ne sait pas s'il lui reste une matière ou sept. */}
      {ctx.siblings.length > 1 && (
        <ul className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-success/20 pt-3">
          {ctx.siblings.map((sib) => {
            const fini = sib.filled >= sib.total;
            return (
              <li key={sib.id} className="text-role-meta">
                <Link
                  href={url({ subject: sib.id })}
                  className={`inline-flex items-center gap-1 transition-colors hover:underline ${
                    fini ? "text-text-faint" : "text-text-soft hover:text-primary"
                  }`}
                >
                  {fini
                    ? <Check aria-hidden="true" className="h-3 w-3 text-success" />
                    : <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-warning" />}
                  {sib.name}
                  <span className="tabular-nums text-text-faint">{sib.filled}/{sib.total}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
