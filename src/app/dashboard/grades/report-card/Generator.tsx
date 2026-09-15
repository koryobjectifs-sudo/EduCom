"use client";

import { useState } from "react";
import { Printer, Users, Eye, Sparkles } from "lucide-react";
import type { OfficialBulletinData } from "@/lib/bulletin/loadOfficialBulletin";
import { BulletinSecondaireSheet } from "@/components/grades/BulletinSecondaireSheet";
import { BulletinElementaireSheet } from "@/components/grades/BulletinElementaireSheet";

export default function ReportCardGenerator({
  data,
  canPrint = true,
  focusStudentId = null,
  embed = false,
}: {
  data: OfficialBulletinData;
  canPrint?: boolean;
  focusStudentId?: string | null;
  embed?: boolean;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(focusStudentId);
  const [monochrome, setMonochrome] = useState<boolean>(false);

  const students = selectedStudentId
    ? (data.students as any[]).filter((s) => s.studentId === selectedStudentId)
    : (data.students as any[]);

  return (
    <div className="space-y-4">
      {/* ── BARRE D'ACTIONS ET CONTRÔLES D'IMPRESSION ── */}
      {!embed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-rule bg-surface px-4 py-3 shadow-2xs print:hidden">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-text">
                {students.length} bulletin{students.length > 1 ? "s" : ""} — {data.classe.name}
              </p>
              <span className="inline-flex items-center rounded-pill bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {data.cycle === "ELEMENTAIRE" ? "Élémentaire (Domaines)" : "Secondaire (Coefficients)"}
              </span>
              {data.term.isT3 && (
                <span className="inline-flex items-center rounded-pill bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  3e Trimestre · Orientation
                </span>
              )}
            </div>
            <p className="text-xs text-text-soft mt-0.5">
              {data.term.name} · Année scolaire {data.school.activeAcademicYear}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre par élève */}
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-text-soft" />
              <select
                value={selectedStudentId || ""}
                onChange={(e) => setSelectedStudentId(e.target.value || null)}
                className="h-8.5 rounded-control border border-rule bg-surface px-2.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
              >
                <option value="">Tous les élèves ({data.students.length})</option>
                {(data.students as any[]).map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.lastName.toUpperCase()} {s.firstName}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Monochrome */}
            <button
              type="button"
              onClick={() => setMonochrome(!monochrome)}
              className={`inline-flex items-center gap-1.5 h-8.5 rounded-control border px-2.5 text-xs font-medium transition-colors ${
                monochrome
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-rule bg-surface text-text hover:bg-surface-subtle"
              }`}
              title="Activer le mode monochrome noir & blanc pour économiser l'encre"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {monochrome ? "Noir & Blanc" : "Couleur École"}
            </button>

            {/* Bouton d'impression */}
            {canPrint && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 h-8.5 rounded-control bg-primary px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimer A4
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RENDU DES FEUILLES A4 ── */}
      {students.length === 0 ? (
        <div className="rounded-surface border border-dashed border-rule bg-surface-subtle/50 p-8 text-center text-xs text-text-soft print:hidden">
          Aucun élève à afficher pour cette sélection.
        </div>
      ) : (
        <div className="space-y-8 print:space-y-0">
          {students.map((student, idx) => (
            <div
              key={student.studentId}
              className="rounded-surface border border-rule bg-white shadow-sm overflow-hidden print:border-none print:shadow-none print:overflow-visible print:p-0"
              style={{
                pageBreakAfter: idx < students.length - 1 ? "always" : "auto",
                breakAfter: idx < students.length - 1 ? "page" : "auto",
              }}
            >
              {data.cycle === "SECONDAIRE" ? (
                <BulletinSecondaireSheet
                  student={student}
                  school={data.school}
                  className={data.classe.name}
                  termName={data.term.name}
                  isT3={data.term.isT3}
                  monochrome={monochrome}
                />
              ) : (
                <BulletinElementaireSheet
                  student={student}
                  school={data.school}
                  className={data.classe.name}
                  termName={data.term.name}
                  isT3={data.term.isT3}
                  monochrome={monochrome}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
