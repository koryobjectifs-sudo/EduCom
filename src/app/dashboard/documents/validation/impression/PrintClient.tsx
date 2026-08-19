"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { buildBlocks, type SubjectRow } from "@/lib/bulletin";

type Grade = { subjectId: string; value: number; coefficient: number; comment: string | null };
type Student = {
  id: string; firstName: string; lastName: string;
  dateOfBirth: string | null; status: string; grades: Grade[];
};

const ACADEMIC_YEAR = "2023-2024";

function average(grades: Grade[], subjectIds: Set<string>) {
  let pts = 0, coefs = 0;
  for (const g of grades) {
    if (!subjectIds.has(g.subjectId)) continue;
    pts += g.value * g.coefficient;
    coefs += g.coefficient;
  }
  return coefs === 0 ? null : pts / coefs;
}

export default function PrintClient({
  school, className, termName, evaluationName, evaluationType, students, subjects,
}: {
  school: any; className: string; termName: string; evaluationName: string;
  evaluationType: string; students: Student[]; subjects: SubjectRow[];
}) {
  // `printOnly` ne masque qu'à l'impression : l'écran reste inchangé, ce qui
  // évite un clignotement entre le clic et la boîte d'impression.
  const [printOnly, setPrintOnly] = useState<string | null>(null);

  const blocks = buildBlocks(subjects);
  const allIds = new Set(subjects.map((s) => s.id));

  const classAverage = (() => {
    const values = students
      .map((s) => average(s.grades, allIds))
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  })();

  const launchPrint = (studentId: string | null) => {
    setPrintOnly(studentId);
    // Laisse React appliquer les classes `print:hidden` avant d'ouvrir la boîte.
    setTimeout(() => {
      window.print();
      setPrintOnly(null);
    }, 60);
  };

  return (
    <div className="space-y-4 pb-12 print:p-0 print:m-0 print:space-y-0">
      {/* ═══ Barre d'actions, invisible à l'impression ═══ */}
      <div className="print:hidden bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50/60 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/documents/validation"
              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 shrink-0"
              title="Retour à la validation"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">
                {className} — {termName} · {evaluationName}
              </h1>
              <p className="text-xs text-gray-500">
                {students.length} bulletin{students.length > 1 ? "s" : ""} validé
                {students.length > 1 ? "s" : ""}, prêt{students.length > 1 ? "s" : ""} à imprimer
              </p>
            </div>
          </div>

          <button
            onClick={() => launchPrint(null)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
          >
            <Printer className="w-4 h-4" />
            Tout imprimer ({students.length})
          </button>
        </div>

        {/* Impression individuelle */}
        <div className="p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Ou imprimer individuellement
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {students.map((s) => {
              const moy = average(s.grades, allIds);
              return (
                <button
                  key={s.id}
                  onClick={() => launchPrint(s.id)}
                  className="group flex items-center justify-between gap-2 border border-gray-200 rounded-xl px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-gray-800 truncate">
                      {s.lastName.toUpperCase()} {s.firstName}
                    </span>
                    <span className="block text-[11px] text-gray-400 tabular-nums">
                      {moy === null ? "aucune note" : `${moy.toFixed(2)} / 20`}
                    </span>
                  </span>
                  <Printer className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-600 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Les bulletins ═══ */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[210mm] print:w-full space-y-10 print:space-y-0">
          {students.map((student, index) => {
            const hiddenAtPrint = printOnly !== null && printOnly !== student.id;
            const moy = average(student.grades, allIds);
            const gradeBySubject = new Map(student.grades.map((g) => [g.subjectId, g]));

            return (
              <div
                key={student.id}
                className={`bg-white w-full p-10 sm:p-12 shadow-sm border border-gray-200 rounded-xl flex flex-col text-sm relative print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none overflow-hidden ${
                  index > 0 ? "print:break-before-page" : ""
                } ${hiddenAtPrint ? "print:hidden" : ""}`}
                style={{ minHeight: "297mm" }}
              >
                {school?.logo && (
                  <div className="absolute inset-0 flex justify-center items-center pointer-events-none -z-10 opacity-[0.03]">
                    <img src={school.logo} alt="" className="w-2/3 object-contain grayscale" />
                  </div>
                )}

                {/* En-tête */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                  <div className="flex items-center gap-4">
                    {school?.logo ? (
                      <img src={school.logo} alt="Logo" className="h-16 object-contain" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-900 text-white font-semibold text-3xl">
                        {school?.name?.charAt(0) || "E"}
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {school?.name || "EduCom"}
                      </h2>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
                        Année Scolaire {ACADEMIC_YEAR}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                      {evaluationType === "EXAM" ? "Bulletin de Composition" : "Bulletin de Notes"}
                    </h1>
                    <p className="text-base font-semibold text-gray-500 uppercase tracking-widest mt-1">
                      {evaluationName} ({termName})
                    </p>
                  </div>
                </div>

                {/* Identité */}
                <div className="grid grid-cols-2 gap-8 bg-gray-50/50 border border-gray-200 p-6 rounded-lg mb-8 print:border-none print:bg-transparent print:p-0">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Nom de l'élève</p>
                    <p className="text-xl font-black text-gray-900">
                      {student.lastName.toUpperCase()} {student.firstName}
                    </p>
                    {student.dateOfBirth && (
                      <p className="text-sm text-gray-600 mt-1">
                        Né(e) le {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                  <div className="text-right grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Classe</p>
                      <p className="text-lg font-bold text-gray-900">{className}</p>
                      <p className="text-xs text-gray-500 mt-1">Effectif : {students.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Moy. élève</p>
                      <p className="text-lg font-black text-gray-900 tabular-nums">
                        {moy === null ? "--" : moy.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Moy. classe</p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums">
                        {classAverage === null ? "--" : classAverage.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="flex-grow">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="border-b-2 border-gray-900 py-2 px-2 font-bold text-gray-900 uppercase text-[10px] tracking-wider w-1/3">Matière</th>
                        <th className="border-b-2 border-gray-900 py-2 px-2 font-bold text-gray-900 uppercase text-[10px] tracking-wider text-center w-12">Coef</th>
                        <th className="border-b-2 border-gray-900 py-2 px-2 font-bold text-gray-900 uppercase text-[10px] tracking-wider text-center w-20">Note /20</th>
                        <th className="border-b-2 border-gray-900 py-2 px-2 font-bold text-gray-900 uppercase text-[10px] tracking-wider">Appréciations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocks.flatMap((block) => {
                        const rows = block.rows.map((sub) => {
                          const g = gradeBySubject.get(sub.id);
                          return (
                            <tr key={sub.id} className="border-b border-gray-100">
                              <td className={`py-1.5 px-2 text-gray-800 ${block.title ? "pl-6" : "font-semibold"}`}>
                                {sub.name}
                              </td>
                              <td className="py-1.5 px-2 text-center text-gray-600 tabular-nums">
                                {g ? g.coefficient : "—"}
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-gray-900 tabular-nums">
                                {g ? g.value.toFixed(2) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="py-1.5 px-2 text-gray-600 italic text-[13px]">
                                {g?.comment || ""}
                              </td>
                            </tr>
                          );
                        });

                        if (!block.title) return rows;

                        const ids = new Set(block.rows.map((r) => r.id));
                        const gAvg = average(student.grades, ids);
                        return [
                          <tr key={`${block.key}-h`} className="bg-gray-100 print:bg-gray-100">
                            <td className="py-1.5 px-2 font-black text-gray-900 uppercase text-[11px] tracking-wide">
                              {block.title}
                            </td>
                            <td />
                            <td className="py-1.5 px-2 text-center font-black text-gray-900 tabular-nums">
                              {gAvg === null ? "—" : gAvg.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2 text-[10px] text-gray-500 uppercase tracking-wider">
                              Moyenne du groupe
                            </td>
                          </tr>,
                          ...rows,
                        ];
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-900">
                        <td colSpan={2} className="py-2.5 px-2 font-black text-gray-900 uppercase text-xs tracking-wider">
                          Moyenne générale
                        </td>
                        <td className="py-2.5 px-2 text-center text-lg font-black text-gray-900 tabular-nums">
                          {moy === null ? "--" : moy.toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Pied : appréciation, cachet, signature */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1.5">
                    Appréciation générale
                  </p>
                  <div className="border border-gray-200 rounded-lg h-16 mb-6 print:border-gray-300" />

                  <div className="flex justify-between items-end">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-8">
                        Le professeur
                      </p>
                      <div className="w-40 border-t border-gray-400" />
                    </div>
                    <div className="text-center relative">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">
                        La direction
                      </p>
                      {school?.stamp && (
                        <img src={school.stamp} alt="" className="h-20 object-contain mx-auto opacity-80" />
                      )}
                      {school?.signature && (
                        <img src={school.signature} alt="" className="h-12 object-contain mx-auto -mt-4" />
                      )}
                      {!school?.stamp && !school?.signature && <div className="h-20" />}
                      <div className="w-40 border-t border-gray-400 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {students.length === 0 && (
            <div className="print:hidden text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun élève dans cette classe.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
