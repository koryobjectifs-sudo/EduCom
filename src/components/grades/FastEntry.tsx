"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, TriangleAlert, ChevronDown,
  GraduationCap, Send,
} from "lucide-react";
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

type RowState = "idle" | "saving" | "saved" | "error";

export default function FastEntry({ ctx }: { ctx: EntryContext }) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [rows, setRows] = useState(ctx.rows);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(ctx.rows.map((r) => [r.studentId, r.value === null ? "" : String(r.value)])),
  );
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inputs = useRef<(HTMLInputElement | null)[]>([]);
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

  const onBlur = (studentId: string) => {
    clearTimeout(timers.current[studentId]);
    void commit(studentId, drafts[studentId] ?? "");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, studentId: string) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    clearTimeout(timers.current[studentId]);
    void commit(studentId, drafts[studentId] ?? "");
    const next = e.shiftKey ? index - 1 : index + 1;
    inputs.current[next]?.focus();
    inputs.current[next]?.select();
  };

  const complete = total > 0 && filled === total;

  return (
    <div className="space-y-4 pb-12">
      {/* ═══ Le contexte, toujours visible ═══ */}
      <header className="rounded-surface border border-rule bg-surface px-5 py-4 shadow-card">
        <Link
          href="/dashboard/grades"
          className="inline-flex items-center gap-1.5 text-role-meta font-medium text-text-soft transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Mes classes
        </Link>

        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-text">
              {ctx.klass.name}
              <span className="text-text-faint"> · </span>
              {ctx.subject.groupName && (
                <span className="text-role-section font-medium text-text-soft">
                  {ctx.subject.groupName}{" "}
                  <span className="text-text-faint">›</span>{" "}
                </span>
              )}
              {ctx.subject.name}
            </h1>
            <p className="mt-1 text-role-body text-text-soft">
              {ctx.term.name} <span className="text-text-faint">·</span> {ctx.evaluation.name}
              {/* ⚠️ La date vient de la configuration pédagogique. Elle s'affiche
                  ICI parce que c'est l'écran où l'enseignant travaille : si la
                  direction déplace la composition, il le voit sans chercher.
                  Aucune date n'est inventée — absente, elle ne s'affiche pas. */}
              {ctx.evaluation.date && (
                <span className="text-text-faint">
                  {" · "}
                  {new Date(ctx.evaluation.date).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              )}
              <span className="text-text-faint"> · {total} élève{total > 1 ? "s" : ""}</span>
            </p>
          </div>

          {/* ⚠️ Les sélecteurs existent mais restent DISCRETS : ils servent les cas
              exceptionnels. Le comportement par défaut est déjà résolu. */}
          <div className="flex flex-wrap items-center gap-2">
            {ctx.subjectChoices.length > 1 && (
              <Picker
                label="Matière"
                value={ctx.subject.id}
                param="subject"
                options={ctx.subjectChoices.map((s) => ({
                  id: s.id,
                  label: s.groupName ? `${s.groupName} › ${s.name}` : s.name,
                }))}
                ctx={ctx}
              />
            )}
            {ctx.evaluationChoices.length > 1 && (
              <Picker label="Évaluation" value={ctx.evaluation.id} param="eval" options={ctx.evaluationChoices.map((e) => ({ id: e.id, label: e.name }))} ctx={ctx} />
            )}
            {ctx.termChoices.length > 1 && (
              <Picker label="Trimestre" value={ctx.term.id} param="term" options={ctx.termChoices.map((t) => ({ id: t.id, label: t.name }))} ctx={ctx} />
            )}
          </div>
        </div>

        {/* ═══ Progression ═══ */}
        <div className="mt-4 border-t border-rule pt-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-role-body font-semibold text-text">
              <span className="tabular-nums">{filled}</span>
              <span className="text-text-faint"> / {total}</span> note{total > 1 ? "s" : ""} saisie{filled > 1 ? "s" : ""}
            </p>
            <p className={`text-role-meta font-medium ${complete ? "text-success" : "text-text-soft"}`}>
              {complete ? "✓ Évaluation complète" : `${remaining} élève${remaining > 1 ? "s" : ""} reste${remaining > 1 ? "nt" : ""} à noter`}
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-sunk">
            <motion.div
              className={`h-full rounded-pill ${complete ? "bg-success" : "bg-primary"}`}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </header>

      {/* ═══ La liste ═══ */}
      <div className="overflow-hidden rounded-surface border border-rule bg-surface shadow-card">
        <table className="w-full">
          <caption className="sr-only">
            Notes de {ctx.subject.name} — {ctx.klass.name}, {ctx.evaluation.name}
          </caption>
          <thead>
            <tr className="border-b border-rule bg-ground/70 text-left">
              <th scope="col" className="px-3 sm:px-5 py-2.5 text-role-meta font-semibold uppercase tracking-wider text-text-faint">
                Élève
              </th>
              <th scope="col" className="w-[120px] sm:w-[168px] px-2 sm:px-3 py-2.5 text-role-meta font-semibold uppercase tracking-wider text-text-faint">
                Note <span className="normal-case text-text-faint">/ {ctx.defaultMax}</span>
              </th>
              <th scope="col" className="hidden sm:table-cell w-[92px] px-3 py-2.5 text-role-meta font-semibold uppercase tracking-wider text-text-faint">
                Coef.
              </th>
              <th scope="col" className="w-[40px] sm:w-[132px] px-2 sm:px-5 py-2.5 text-right sm:text-left text-role-meta font-semibold uppercase tracking-wider text-text-faint">
                <span className="sr-only">État</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((r, i) => {
              const state = states[r.studentId] ?? "idle";
              const err = errors[r.studentId];
              const value = drafts[r.studentId] ?? "";
              return (
                <tr key={r.studentId} className="transition-colors duration-150 hover:bg-sunk/40">
                  <th scope="row" className="px-3 sm:px-5 py-2 text-left font-normal truncate max-w-[120px] sm:max-w-none">
                    <span className="text-role-body font-medium text-text">
                      {r.lastName} <span className="hidden sm:inline">{r.firstName}</span><span className="sm:hidden">{r.firstName.charAt(0)}.</span>
                    </span>
                  </th>

                  <td className="px-2 sm:px-3 py-2">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <input
                        ref={(el) => { inputs.current[i] = el; }}
                        type="text"
                        inputMode="decimal"
                        aria-label={`Note de ${r.firstName} ${r.lastName}, sur ${r.max}`}
                        aria-invalid={state === "error"}
                        value={value}
                        onChange={(e) => onChange(r.studentId, e.target.value)}
                        onBlur={() => onBlur(r.studentId)}
                        onKeyDown={(e) => onKeyDown(e, i, r.studentId)}
                        onFocus={(e) => e.currentTarget.select()}
                        className={`h-11 w-[64px] sm:w-[76px] rounded-control border bg-surface px-2 sm:px-2.5 py-2 text-base font-semibold tabular-nums text-text transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          state === "error" ? "border-danger bg-danger/5" : "border-rule focus:border-primary/40"
                        }`}
                      />
                      <span className="text-[11px] sm:text-[13px] tabular-nums text-text-faint">/ {r.max}</span>
                    </div>
                    {err && <p className="mt-1 text-[11px] sm:text-role-meta font-medium text-danger">{err}</p>}
                  </td>

                  <td className="hidden sm:table-cell px-3 py-2 text-role-body tabular-nums text-text-soft">{r.coefficient}</td>

                  <td className="px-2 sm:px-5 py-2 text-right sm:text-left">
                    <StatusCell state={state} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-role-meta text-text-faint">
        <kbd className="rounded border border-rule bg-sunk px-1.5 py-0.5 font-sans">Entrée</kbd> passe à
        l&apos;élève suivant · <kbd className="rounded border border-rule bg-sunk px-1.5 py-0.5 font-sans">Maj</kbd>
        {" + "}
        <kbd className="rounded border border-rule bg-sunk px-1.5 py-0.5 font-sans">Entrée</kbd> revient en arrière ·
        chaque note est enregistrée automatiquement.
      </p>

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

/** L'état d'une ligne. Le mot double toujours l'icône. */
function StatusCell({ state }: { state: RowState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-role-meta text-text-faint" title="Enregistrement">
        <Loader2 aria-hidden="true" className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-spin" />
        <span className="hidden sm:inline">Enregistrement</span>
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-role-meta font-medium text-success" title="Enregistré">
        <Check aria-hidden="true" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className="hidden sm:inline">Enregistré</span>
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-role-meta font-medium text-danger" title="Erreur">
        <TriangleAlert aria-hidden="true" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className="hidden sm:inline">Erreur</span>
      </span>
    );
  }
  return null;
}

/**
 * Sélecteur d'exception — matière, évaluation ou trimestre.
 *
 * Il navigue par URL : l'état de saisie appartient au serveur, et une vue
 * choisie s'envoie par lien. C'est la même règle que le centre documentaire.
 */
function Picker({
  label, value, param, options, ctx,
}: {
  label: string; value: string; param: string;
  options: { id: string; label: string }[];
  ctx: EntryContext;
}) {
  const router = useRouter();

  return (
    <label className="group relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams({
            class: ctx.klass.id,
            subject: ctx.subject.id,
            term: ctx.term.id,
            eval: ctx.evaluation.id,
          });
          p.set(param, e.target.value);
          // Changer de trimestre invalide l'évaluation : elle appartient au
          // trimestre précédent et n'existe pas dans le nouveau.
          if (param === "term") p.delete("eval");
          router.push(`/dashboard/grades/saisie?${p.toString()}`);
        }}
        className="appearance-none rounded-control border border-rule bg-surface py-1.5 pl-2.5 pr-7 text-role-meta font-medium text-text-soft transition-colors duration-200 hover:border-primary/30 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-text-faint" />
    </label>
  );
}
