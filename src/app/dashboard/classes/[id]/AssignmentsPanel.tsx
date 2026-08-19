"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Loader2, TriangleAlert, Users, BookOpen } from "lucide-react";
import { createAssignment, deleteAssignment } from "../../grades/actions";

type Assignment = {
  id: string;
  subjectId: string | null;
  teacher: { id: string; firstName: string; lastName: string };
  subject: { id: string; name: string } | null;
};

/**
 * Qui enseigne quoi dans cette classe.
 *
 * Une affectation sans matière signifie « toutes les matières de la classe » —
 * c'est le maître unique de l'élémentaire. Plusieurs affectations avec matière
 * permettent à deux maîtres de se partager le programme.
 */
export default function AssignmentsPanel({
  classId,
  assignments,
  teachers,
  subjects,
  canEdit,
}: {
  classId: string;
  assignments: Assignment[];
  teachers: { id: string; firstName: string; lastName: string }[];
  subjects: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!teacherId) { setError("Choisissez un enseignant."); return; }
    setIsBusy(true); setError(null);
    const res = await createAssignment(classId, teacherId, subjectId || null);
    setIsBusy(false);
    if (res?.error) { setError(res.error); return; }
    setTeacherId(""); setSubjectId("");
    router.refresh();
  };

  const remove = async (id: string) => {
    setIsBusy(true); setError(null);
    const res = await deleteAssignment(id);
    setIsBusy(false);
    if (res?.error) { setError(res.error); return; }
    router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Enseignants et matières
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Détermine qui peut saisir quoi dans cette classe. Sans matière précisée,
        l'enseignant couvre tout le programme.
      </p>

      {error && (
        <p className="mb-3 text-[13px] text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      <div className="space-y-1.5 mb-4">
        {assignments.length === 0 && (
          <p className="text-[13px] text-gray-400 italic bg-gray-50 border border-dashed border-gray-200 rounded-lg px-3 py-2.5">
            Aucune affectation. Le professeur principal garde la main sur toutes les matières.
          </p>
        )}
        {assignments.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
          >
            <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-[10px] font-bold">
              {a.teacher.firstName[0]}{a.teacher.lastName[0]}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-medium text-gray-800 truncate">
                {a.teacher.firstName} {a.teacher.lastName}
              </span>
              <span className="block text-[11px] text-gray-500 truncate flex items-center gap-1">
                <BookOpen className="w-3 h-3 shrink-0" />
                {a.subject ? a.subject.name : "Toutes les matières"}
              </span>
            </span>
            {canEdit && (
              <button
                onClick={() => remove(a.id)}
                disabled={isBusy}
                className="text-gray-300 hover:text-red-500 transition-colors p-1 disabled:opacity-40"
                title="Retirer cette affectation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <select
            value={teacherId}
            onChange={(e) => { setTeacherId(e.target.value); setError(null); }}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px] bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Enseignant...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </select>

          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px] bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Toutes les matières de la classe</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            onClick={add}
            disabled={isBusy || !teacherId}
            className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Affecter
          </button>
        </div>
      )}
    </div>
  );
}
