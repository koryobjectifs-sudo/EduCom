"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Info } from "lucide-react";
import { BulletinSheet } from "@/components/grades/BulletinSheet";
import type { Bulletin } from "@/lib/bulletin";

/**
 * Impression des bulletins déposés — secrétariat.
 *
 * ═══ CE QUI A CHANGÉ LE 21 AOÛT ═══
 *
 * Ce fichier portait **sa propre fonction `average()`** et **son propre rendu de
 * bulletin**, en parallèle de ceux du générateur. Deux documents officiels qui
 * ne disaient pas la même chose : celui-ci groupait les matières, l'autre non.
 * Le calcul est parti dans `buildBulletin()`, le rendu dans `BulletinSheet`.
 *
 * ⚠️ L'année scolaire était figée à `ACADEMIC_YEAR = "2023-2024"`. Elle vient
 * maintenant de `currentAcademicYear()`, résolue côté serveur.
 *
 * ⚠️ **L'écran ne redemande rien** : le dossier est déjà validé, tout vient de
 * l'URL. C'était vrai avant, ça le reste.
 *
 * ⚠️ `printOnly` ne masque qu'à l'impression : l'écran ne clignote pas entre le
 * clic et la boîte d'impression.
 */
export default function PrintClient({
  bulletin, school, className, termName, evaluationName, isComposition, academicYear,
}: {
  bulletin: Bulletin;
  school: { name?: string | null; logo?: string | null; signature?: string | null; stamp?: string | null } | null;
  className: string;
  termName: string;
  evaluationName: string;
  isComposition: boolean;
  academicYear: string;
}) {
  const [printOnly, setPrintOnly] = useState<string | null>(null);

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
            {className} — {termName} · {evaluationName}
          </p>
          <p className="text-role-meta text-text-soft">
            {bulletin.headcount} élève{bulletin.headcount > 1 ? "s" : ""} · barème /{bulletin.scale}
            {bulletin.classAverage !== null && ` · moyenne de classe ${bulletin.classAverage.toFixed(2)}`}
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

      {/* Une pastille par élève, avec sa moyenne : imprimer un seul bulletin
          reste possible sans quitter l'écran. */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {bulletin.students.map((s) => (
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
              {s.general === null ? "—" : s.general.toFixed(2)}
            </span>
          </button>
        ))}
      </div>

      {bulletin.mixedScales && (
        <p className="flex items-start gap-2 rounded-control border border-warning/20 bg-warning/10 px-3.5 py-2.5 text-role-meta text-warning print:hidden">
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Plusieurs barèmes cohabitent dans cette classe. Les moyennes sont ramenées sur /{bulletin.scale}.
        </p>
      )}

      <div className="space-y-6 print:space-y-0">
        {bulletin.students.map((s) => (
          <div key={s.studentId} className="rounded-surface border border-rule shadow-card print:border-none print:shadow-none">
            <BulletinSheet
              student={s}
              bulletin={bulletin}
              school={school}
              className={className}
              termName={termName}
              evaluationName={evaluationName}
              isComposition={isComposition}
              academicYear={academicYear}
              hidden={printOnly !== null && printOnly !== s.studentId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
