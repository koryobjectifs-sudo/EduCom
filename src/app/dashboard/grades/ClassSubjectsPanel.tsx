"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, TriangleAlert, BookOpen } from "lucide-react";
import { getClassSubjects, addSubjectToClass, removeSubjectFromClass } from "./actions";

type Subject = { id: string; name: string; parentId: string | null };

/**
 * Ajustement du programme d'une classe.
 *
 * Le programme de référence vit dans `scripts/seed-subjects.ts`, mais chaque
 * établissement a ses particularités : cet écran permet de l'ajuster sans
 * toucher au code.
 */
export default function ClassSubjectsPanel({
  classes,
  subjects,
}: {
  classes: any[];
  subjects: Subject[];
}) {
  const [classId, setClassId] = useState("");
  const [attached, setAttached] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) { setAttached(new Set()); return; }
    let cancelled = false;
    setIsLoading(true);
    getClassSubjects(classId).then((res) => {
      if (cancelled) return;
      setAttached(new Set((res.data ?? []).map((s: any) => s.id)));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [classId]);

  const toggle = async (subjectId: string) => {
    if (!classId) return;
    setPending(subjectId);
    setError(null);

    const isAttached = attached.has(subjectId);
    const res = isAttached
      ? await removeSubjectFromClass(classId, subjectId)
      : await addSubjectToClass(classId, subjectId);

    setPending(null);
    if (res?.error) { setError(res.error); return; }

    setAttached((prev) => {
      const next = new Set(prev);
      if (isAttached) next.delete(subjectId); else next.add(subjectId);
      return next;
    });
  };

  // Groupes d'abord, chaque parent suivi de ses enfants ; puis les matières seules.
  const parents = subjects.filter((s) => !s.parentId);
  const childrenOf = (id: string) => subjects.filter((s) => s.parentId === id);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-indigo-600" /> Programme par classe
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Choisissez les matières réellement enseignées dans chaque classe. Elles seules
        apparaîtront à la saisie et sur le bulletin.
      </p>

      <select
        value={classId}
        onChange={(e) => { setClassId(e.target.value); setError(null); }}
        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
      >
        <option value="">Sélectionner une classe...</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {error && (
        <p className="mb-3 text-[13px] text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      {!classId ? (
        <p className="text-center p-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          Sélectionnez une classe pour ajuster son programme.
        </p>
      ) : isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {attached.size} matière{attached.size > 1 ? "s" : ""} au programme
          </p>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {parents.map((parent) => {
              const kids = childrenOf(parent.id);
              return (
                <div key={parent.id}>
                  <Row
                    subject={parent}
                    checked={attached.has(parent.id)}
                    pending={pending === parent.id}
                    onToggle={toggle}
                    bold={kids.length > 0}
                  />
                  {kids.map((kid) => (
                    <Row
                      key={kid.id}
                      subject={kid}
                      checked={attached.has(kid.id)}
                      pending={pending === kid.id}
                      onToggle={toggle}
                      indent
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  subject, checked, pending, onToggle, indent, bold,
}: {
  subject: Subject; checked: boolean; pending: boolean;
  onToggle: (id: string) => void; indent?: boolean; bold?: boolean;
}) {
  return (
    <button
      onClick={() => onToggle(subject.id)}
      disabled={pending}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors hover:bg-gray-50 disabled:opacity-50 ${
        indent ? "pl-7" : ""
      }`}
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          checked ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white"
        }`}
      >
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
        ) : checked ? (
          <Check className="w-3 h-3 text-white" />
        ) : null}
      </span>
      <span className={`text-[13px] ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
        {subject.name}
      </span>
    </button>
  );
}
