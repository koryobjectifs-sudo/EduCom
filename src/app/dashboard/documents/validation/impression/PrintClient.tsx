"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { OfficialBulletinData } from "@/lib/bulletin/loadOfficialBulletin";
import { BulletinSecondaireSheet } from "@/components/grades/BulletinSecondaireSheet";
import { BulletinElementaireSheet } from "@/components/grades/BulletinElementaireSheet";

/**
 * Impression des bulletins validés — secrétariat.
 *
 * ═══ BASCULE MOTEUR OFFICIEL UNIFIÉ (v18) ═══
 *
 * Ce composant consomme désormais `OfficialBulletinData` issu de `loadOfficialBulletin`.
 * Rendu étanche par cycle :
 *   - Secondaire / Moyen : BulletinSecondaireSheet (MD, Compo, MM, Coef, Points, Avis conseil)
 *   - Élémentaire : BulletinElementaireSheet (Domaines, Sous-disciplines, Barème /10 convertible /20, sans coef)
 */
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
          href="/dashboard/documents/validation"
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
              Tout afficher
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-role-body font-semibold text-white transition-all duration-200 hover:bg-primary-hover"
          >
            <Printer aria-hidden="true" className="h-4 w-4" />
            {printOnly ? "Imprimer ce bulletin" : "Tout imprimer"}
          </button>
        </div>
      </div>

      {/* Une pastille par élève, avec sa moyenne */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {(data.students as any[]).map((s) => {
          const avg = data.cycle === "ELEMENTAIRE" ? s.moyenneGeneraleSur10 : s.moyenneGenerale;
          const maxScale = data.cycle === "ELEMENTAIRE" ? "/10" : "/20";
          return (
            <button
              key={s.studentId}
              onClick={() => setPrintOnly(printOnly === s.studentId ? null : s.studentId)}
              className={`rounded-control border px-2.5 py-1.5 text-role-meta font-medium transition-all duration-200 ${
                printOnly === s.studentId
                  ? "border-primary bg-primary text-white"
                  : "border-rule bg-surface text-text-soft hover:border-primary/30 hover:text-primary"
              }`}
            >
              {s.lastName} {s.firstName}
              <span className="ml-1.5 tabular-nums opacity-70">
                {avg === null ? "—" : `${avg.toFixed(2)}${maxScale}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-6 print:space-y-0">
        {students.map((student) => (
          <div key={student.studentId} className="rounded-surface border border-rule shadow-card print:border-none print:shadow-none">
            {data.cycle === "ELEMENTAIRE" ? (
              <BulletinElementaireSheet
                student={student}
                school={data.school}
                className={data.classe.name}
                termName={data.term.name}
                isT3={data.term.isT3}
              />
            ) : (
              <BulletinSecondaireSheet
                student={student}
                school={data.school}
                className={data.classe.name}
                termName={data.term.name}
                isT3={data.term.isT3}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
