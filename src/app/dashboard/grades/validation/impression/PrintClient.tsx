"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { OfficialBulletinData } from "@/lib/bulletin/loadOfficialBulletin";
import { BulletinSecondaireSheet } from "@/components/grades/BulletinSecondaireSheet";
import { BulletinElementaireSheet } from "@/components/grades/BulletinElementaireSheet";

export default function PrintClient({
  data,
  focusStudentId = null,
}: {
  data: OfficialBulletinData;
  focusStudentId?: string | null;
}) {
  const [printOnly, setPrintOnly] = useState<string | null>(focusStudentId);

  const students = printOnly
    ? (data.students as any[]).filter((s) => s.studentId === printOnly)
    : (data.students as any[]);

  return (
    <div className="space-y-4 pb-12">
      <div className="print:hidden">
        <Link
          href="/dashboard/grades/validation"
          className="inline-flex items-center gap-1.5 text-role-meta font-medium text-text-soft transition-colors hover:text-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Retour à la validation
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-rule bg-surface px-4 py-3 shadow-card print:hidden">
        <div className="min-w-0">
          <p className="text-role-body font-semibold text-text">
            {data.classe.name} — {data.term.name}
          </p>
          <p className="text-role-meta text-text-soft">
            {data.students.length} élève{data.students.length > 1 ? "s" : ""} · {data.cycle === "ELEMENTAIRE" ? "Élémentaire (Domaines)" : "Secondaire (Coefficients)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {printOnly && (
            <button
              onClick={() => setPrintOnly(null)}
              className="rounded-control border border-rule bg-surface px-3 py-2 text-role-meta font-medium text-text-soft transition-colors hover:text-primary"
            >
              Tout afficher ({data.students.length})
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover"
          >
            <Printer aria-hidden="true" className="h-4 w-4" />
            Imprimer {printOnly ? "ce bulletin" : "tous les bulletins"}
          </button>
        </div>
      </div>

      {students.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-surface border border-rule bg-surface p-2.5 shadow-card print:hidden">
          <span className="text-role-meta font-medium text-text-soft">Accès direct :</span>
          {students.map((s: any) => (
            <button
              key={s.studentId}
              onClick={() => setPrintOnly(printOnly === s.studentId ? null : s.studentId)}
              className={`rounded-control px-2.5 py-1 text-role-meta font-medium transition-colors ${
                printOnly === s.studentId
                  ? "bg-primary text-white"
                  : "bg-surface-sunk text-text hover:bg-rule"
              }`}
            >
              {s.student.lastName} {s.student.firstName}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6 print:space-y-0">
        {students.map((st: any) => {
          if (data.cycle === "ELEMENTAIRE") {
            return (
              <div key={st.studentId} className="print:break-after-page">
                <BulletinElementaireSheet
                  student={st}
                  school={data.school}
                  className={data.classe.name}
                  termName={data.term.name}
                  isT3={data.term.isT3}
                />
              </div>
            );
          }

          return (
            <div key={st.studentId} className="print:break-after-page">
              <BulletinSecondaireSheet
                student={st}
                school={data.school}
                className={data.classe.name}
                termName={data.term.name}
                isT3={data.term.isT3}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
