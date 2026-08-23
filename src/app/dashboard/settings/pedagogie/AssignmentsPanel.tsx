"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Trash2, Plus, TriangleAlert, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createAssignment, deleteAssignment } from "@/app/dashboard/grades/actions";

type ClasseLigne = {
  classId: string;
  className: string;
  /** Professeur principal (`Class.teacherId`) — le filet, quand il existe. */
  teacher: { id: string; firstName: string; lastName: string } | null;
  subjects: { id: string; name: string; groupName: string | null }[];
};
type Enseignant = { id: string; firstName: string; lastName: string; role: string };
type Affectation = {
  id: string;
  classId: string;
  teacher: { id: string; firstName: string; lastName: string };
  subject: { id: string; name: string } | null;
};

/**
 * **Qui enseigne quoi, dans quelle classe.**
 *
 * ═══ CE QUE CETTE TABLE DÉCIDE RÉELLEMENT ═══
 *
 * Elle n'est pas décorative : `editableSubjectIds()` (dans
 * `src/lib/gradeEntry.ts`) s'en sert pour **borner le droit d'écrire des
 * notes**. Une affectation sans matière (`subjectId` nul) = maître unique de
 * l'élémentaire, il couvre toute la classe ; une affectation par matière =
 * professeur de collège, il ne saisit que la sienne.
 *
 * ⚠️ **`Class.teacherId` reste un filet, et il ne disparaît pas.** Tant
 * qu'aucune affectation n'est saisie, le professeur principal titulaire garde
 * l'accès à sa classe — sinon on l'enfermerait dehors le jour où l'école n'a
 * pas encore rempli ce tableau. La configuration ne doit jamais casser ce qui
 * marchait avant elle.
 */
export default function AssignmentsPanel({
  classes, teachers, assignments,
}: {
  classes: ClasseLigne[];
  teachers: Enseignant[];
  assignments: Affectation[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const pourClasse = (classId: string) => assignments.filter((a) => a.classId === classId);

  const affecter = (classId: string) => {
    if (!teacherId) { setErreur("Choisissez un enseignant."); return; }
    setErreur(null);
    startTransition(async () => {
      const res = await createAssignment(classId, teacherId, subjectId || null);
      if (res?.error) { setErreur(res.error); return; }
      setTeacherId("");
      setSubjectId("");
      setOuvert(null);
      router.refresh();
    });
  };

  const retirer = (id: string) => {
    setErreur(null);
    startTransition(async () => {
      const res = await deleteAssignment(id);
      if (res?.error) { setErreur(res.error); return; }
      router.refresh();
    });
  };

  const CHAMP =
    "rounded-control border border-rule bg-surface px-2 py-1.5 text-role-meta text-text outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30";

  return (
    <section id="affectations" className="scroll-mt-24">
      <Card
        title={
          <span className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 text-text-faint" />
            Enseignants et affectations
          </span>
        }
        description="Ce tableau décide qui peut saisir quelles notes. Sans matière précisée, l'enseignant couvre toute la classe."
        actions={
          <Link
            href="/dashboard/team"
            className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-surface px-3 py-2 text-role-meta font-medium text-text-soft transition-colors hover:border-primary/30 hover:text-primary"
          >
            <UserPlus aria-hidden="true" className="h-3.5 w-3.5" />
            Inviter un enseignant
          </Link>
        }
      >
        {erreur && (
          <p role="alert" className="mb-4 flex items-start gap-1.5 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-role-meta text-danger">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {erreur}
          </p>
        )}

        {teachers.length === 0 && (
          <p className="mb-4 rounded-control border border-rule bg-sunk px-3 py-2.5 text-role-meta leading-relaxed text-text-soft">
            Aucun compte enseignant. Votre école fonctionne quand même — la direction saisit
            toutes les notes. Invitez vos enseignants pour qu&apos;ils saisissent les leurs.
          </p>
        )}

        {classes.length === 0 ? (
          <p className="rounded-control border border-dashed border-rule bg-sunk px-4 py-6 text-center text-role-body text-text-soft">
            Aucune classe à affecter pour l&apos;instant.
          </p>
        ) : (
          <ul className="divide-y divide-rule">
            {classes.map((c) => {
              const liste = pourClasse(c.classId);
              return (
                <li key={c.classId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-role-body font-semibold text-text">{c.className}</span>
                    {liste.length === 0 && !c.teacher && (
                      <span className="text-role-meta text-text-faint">Personne n&apos;est affecté</span>
                    )}
                  </div>

                  {/* ⚠️ Le titulaire est montré comme ce qu'il est : un filet.
                      Il couvre TOUTE la classe tant qu'aucune affectation n'est
                      saisie, et cesse de le faire dès la première — sinon un
                      professeur de matière verrait les notes de ses collègues. */}
                  {c.teacher && (
                    <p className="mt-1 text-role-meta text-text-soft">
                      Titulaire :{" "}
                      <span className="font-medium text-text">
                        {c.teacher.firstName} {c.teacher.lastName}
                      </span>
                      {liste.length === 0
                        ? " — il couvre toutes les matières tant qu'aucune affectation n'est saisie."
                        : " — les affectations ci-dessous font foi pour la saisie."}
                    </p>
                  )}

                  {liste.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {liste.map((a) => (
                        <li
                          key={a.id}
                          className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-sunk py-1 pl-2.5 pr-1 text-role-meta text-text-soft"
                        >
                          <span className="font-medium text-text">
                            {a.teacher.firstName} {a.teacher.lastName}
                          </span>
                          <span className="text-text-faint">
                            {/* « toutes matières » n'est pas un défaut par
                                défaut : c'est le maître unique, et il faut que
                                ça se lise comme une décision. */}
                            {a.subject ? a.subject.name : "toutes matières"}
                          </span>
                          <button
                            onClick={() => retirer(a.id)}
                            disabled={pending}
                            title="Retirer l'affectation"
                            className="rounded-pill p-1 text-text-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                          >
                            <Trash2 aria-hidden="true" className="h-3 w-3" />
                            <span className="sr-only">
                              Retirer {a.teacher.firstName} {a.teacher.lastName}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {ouvert === c.classId ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`ens-${c.classId}`}>Enseignant</label>
                      <select
                        id={`ens-${c.classId}`}
                        autoFocus
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        className={CHAMP}
                      >
                        <option value="">Choisir un enseignant…</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName}
                            {t.role !== "TEACHER" ? " (direction)" : ""}
                          </option>
                        ))}
                      </select>

                      <label className="sr-only" htmlFor={`mat-${c.classId}`}>Matière</label>
                      <select
                        id={`mat-${c.classId}`}
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className={CHAMP}
                      >
                        <option value="">Toutes les matières (maître unique)</option>
                        {c.subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.groupName ? `${s.groupName} · ${s.name}` : s.name}
                          </option>
                        ))}
                      </select>

                      <Button size="sm" loading={pending} onClick={() => affecter(c.classId)}>
                        Affecter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOuvert(null)} disabled={pending}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setOuvert(c.classId); setTeacherId(""); setSubjectId(""); setErreur(null); }}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-role-meta font-medium text-primary transition-colors hover:underline"
                    >
                      <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                      Affecter un enseignant
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
