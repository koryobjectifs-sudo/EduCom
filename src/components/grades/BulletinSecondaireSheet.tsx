"use client";

import { formatDate } from "@/lib/dateUtils";
import type {
  OfficialSecondaryStudent,
  OfficialSchoolMetadata,
} from "@/lib/bulletin/loadOfficialBulletin";
import { DISTINCTION_LABELS, SANCTION_LABELS, ORIENTATION_LABELS } from "@/lib/notes/conseil";

const fmt = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? "—" : v.toFixed(digits));

function rankLabel(rank: number | null, headcount: number): string {
  if (rank === null) return "Non classé";
  return `${rank === 1 ? "1er" : `${rank}e`} / ${headcount}`;
}

export function BulletinSecondaireSheet({
  student,
  school,
  className,
  termName,
  isT3,
  monochrome = false,
  hidden = false,
  accentColor,
  watermark,
  watermarkOpacity,
  logoPosition,
}: {
  student: OfficialSecondaryStudent;
  school: OfficialSchoolMetadata;
  className: string;
  termName: string;
  isT3: boolean;
  monochrome?: boolean;
  hidden?: boolean;
  accentColor?: string | null;
  watermark?: boolean;
  watermarkOpacity?: number;
  logoPosition?: "LEFT" | "CENTER" | "RIGHT";
}) {
  const accent = monochrome
    ? "#1f2937"
    : accentColor || school.bulletinAccentColor || school.primaryColor || "#1e40af";
  const effectiveWatermark = watermark ?? school.bulletinWatermark ?? false;
  const effectiveWatermarkOpacity = watermarkOpacity ?? school.bulletinWatermarkOpacity ?? 0.06;
  const effectiveLogoPosition = logoPosition || (school.bulletinLogoPosition as "LEFT" | "CENTER" | "RIGHT") || "CENTER";

  const totalMatieres = student.subjects.length;
  const matieresNotees = student.subjects.filter(
    (s) => s.mm !== null && s.mm !== undefined
  ).length;
  const isIncomplete = matieresNotees > 0 && matieresNotees < totalMatieres;

  const distinctionLabel = student.distinctionRetenue
    ? DISTINCTION_LABELS[student.distinctionRetenue as keyof typeof DISTINCTION_LABELS] || student.distinctionRetenue
    : null;

  const sanctionTravailLabel = student.sanctionTravail
    ? SANCTION_LABELS[student.sanctionTravail as keyof typeof SANCTION_LABELS] || student.sanctionTravail
    : "Néant";

  const sanctionConduiteLabel = student.sanctionConduite
    ? SANCTION_LABELS[student.sanctionConduite as keyof typeof SANCTION_LABELS] || student.sanctionConduite
    : "Néant";

  const orientationLabel = student.decisionOrientation
    ? ORIENTATION_LABELS[student.decisionOrientation as keyof typeof ORIENTATION_LABELS] || student.decisionOrientation
    : "En attente";

  return (
    <div
      className={`bulletin-sheet relative mx-auto flex flex-col bg-white text-gray-900 font-['Lato',sans-serif] ${
        hidden ? "hidden print:hidden" : ""
      } ${monochrome ? "monochrome" : ""}`}
    >
      {/* ── FILIGRANE DU LOGO SI ACTIVÉ (Centré sur page A4, 60-70% de largeur) ── */}
      {effectiveWatermark && school.logo && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 select-none print:flex"
        >
          <img
            src={school.logo}
            alt=""
            className="w-[65%] max-w-[65%] max-h-[65%] object-contain"
            style={{
              opacity: effectiveWatermarkOpacity,
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          />
        </div>
      )}

      {/* ── EN-TÊTE OFFICIEL SÉNÉGALAIS ── */}
      <div className="relative z-10 flex items-start justify-between border-b-2 border-gray-900 pb-2 text-[10px] leading-tight">
        {/* Colonne Gauche */}
        <div className="w-[45%] flex items-start gap-2.5 space-y-0.5">
          {effectiveLogoPosition === "LEFT" && school.logo && (
            <div className="flex h-14 w-16 shrink-0 items-center justify-center">
              <img src={school.logo} alt="" className="max-h-14 max-w-full object-contain" />
            </div>
          )}
          <div className="space-y-0.5">
            <p className="font-semibold uppercase tracking-wider text-gray-600">
              Région Académique : <span className="font-bold text-gray-900">{school.regionAcademique}</span>
            </p>
            <p className="font-semibold uppercase tracking-wider text-gray-600">
              Inspection d&apos;Académie : <span className="font-bold text-gray-900">{school.inspectionAcademique}</span>
            </p>
            <p className="font-semibold uppercase tracking-wider text-gray-600">
              IEF : <span className="font-bold text-gray-900">{school.inspectionIEF}</span>
            </p>
            <p className="font-black text-[12px] uppercase text-gray-900 pt-0.5">{school.name}</p>
            <p className="font-semibold text-gray-600">
              Année scolaire : <span className="font-bold text-gray-900">{school.activeAcademicYear}</span>
            </p>
          </div>
        </div>

        {/* Logo au centre si positionné au centre */}
        {effectiveLogoPosition === "CENTER" && school.logo && (
          <div className="flex h-14 w-20 items-center justify-center shrink-0">
            <img src={school.logo} alt="" className="max-h-14 max-w-full object-contain" />
          </div>
        )}

        {/* Colonne Droite */}
        <div className="w-[45%] flex items-start justify-end gap-2.5 text-right space-y-0.5">
          <div className="space-y-0.5">
            <p className="font-bold uppercase tracking-wider text-gray-900">RÉPUBLIQUE DU SÉNÉGAL</p>
            <p className="italic text-[9px] text-gray-600">Un Peuple - Un But - Une Foi</p>
            <p className="font-bold uppercase tracking-wider text-gray-800 text-[9px]">
              MINISTÈRE DE L&apos;ÉDUCATION NATIONALE
            </p>
            <div className="pt-1">
              <span
                className="inline-block px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white"
                style={{ backgroundColor: accent }}
              >
                BULLETIN DU {termName.toUpperCase()}
              </span>
            </div>
          </div>
          {effectiveLogoPosition === "RIGHT" && school.logo && (
            <div className="flex h-14 w-16 shrink-0 items-center justify-center">
              <img src={school.logo} alt="" className="max-h-14 max-w-full object-contain" />
            </div>
          )}
        </div>
      </div>

      {/* ── BLOC IDENTITÉ ÉLÈVE ── */}
      <div className="mt-2.5 rounded border border-gray-300 bg-gray-50/50 p-2 text-[10.5px]">
        <div className="grid grid-cols-4 gap-2">
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-500">IEN :</span>{" "}
            <span className="font-mono font-bold text-gray-900">{student.ien || "—"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[9px] font-bold uppercase text-gray-500">Nom & Prénom :</span>{" "}
            <span className="font-black text-gray-900 uppercase">
              {student.lastName} {student.firstName}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-500">Sexe :</span>{" "}
            <span className="font-semibold text-gray-800">
              {student.gender === "M" || student.gender === "MALE"
                ? "M"
                : student.gender === "F" || student.gender === "FEMALE"
                ? "F"
                : "—"}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase text-gray-500">Classe :</span>{" "}
            <span className="font-bold text-gray-900">{className}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-500">Effectif :</span>{" "}
            <span className="font-bold text-gray-900">{student.headcount}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[9px] font-bold uppercase text-gray-500">Né(e) le :</span>{" "}
            <span className="font-semibold text-gray-800">
              {student.dateOfBirth ? formatDate(student.dateOfBirth) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── TABLEAU DES DISCIPLINES (SECOND LE MODÈLE DE RÉFÉRENCE) ── */}
      <div className="relative z-10 mt-2.5">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr style={{ backgroundColor: accent, color: "#ffffff" }}>
              <th className="border border-gray-900 py-1 px-2 text-left font-black uppercase w-[30%]">
                Disciplines
              </th>
              <th className="border border-gray-900 py-1 px-1 text-center font-bold uppercase w-[10%]">
                Moy. Dev
              </th>
              <th className="border border-gray-900 py-1 px-1 text-center font-bold uppercase w-[10%]">
                Comp.
              </th>
              <th className="border border-gray-900 py-1 px-1 text-center font-black uppercase w-[10%]">
                Moy. Trim.
              </th>
              <th className="border border-gray-900 py-1 px-1 text-center font-bold uppercase w-[8%]">
                Coef.
              </th>
              <th className="border border-gray-900 py-1 px-1 text-center font-black uppercase w-[10%]">
                Points
              </th>
              <th className="border border-gray-900 py-1 px-2 text-left font-bold uppercase w-[22%]">
                Appréciations
              </th>
            </tr>
          </thead>
          <tbody>
            {student.subjects.map((sub, idx) => (
              <tr
                key={sub.id}
                className={idx % 2 === 1 ? "bg-gray-100/40" : "bg-transparent"}
                style={{ pageBreakInside: "avoid" }}
              >
                <td className="border border-gray-300 py-1 px-2 font-bold text-gray-900 text-[10.5px]">
                  {sub.name}
                </td>
                <td className="border border-gray-300 py-1 px-1 text-center tabular-nums text-gray-700">
                  {fmt(sub.md)}
                </td>
                <td className="border border-gray-300 py-1 px-1 text-center tabular-nums text-gray-700">
                  {fmt(sub.compo)}
                </td>
                <td className="border border-gray-300 py-1 px-1 text-center font-bold tabular-nums text-gray-900 bg-gray-50/40">
                  {fmt(sub.mm)}
                </td>
                <td className="border border-gray-300 py-1 px-1 text-center font-semibold tabular-nums text-gray-800">
                  {sub.coefficient}
                </td>
                <td className="border border-gray-300 py-1 px-1 text-center font-black tabular-nums text-gray-900 bg-gray-50/40">
                  {fmt(sub.points)}
                </td>
                <td className="border border-gray-300 py-1 px-2 text-[9.5px] italic text-gray-700 truncate max-w-[140px]">
                  {sub.appreciation || "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Ligne TOTAUX */}
            <tr className="bg-gray-100/60 font-bold text-gray-900 border-t-2 border-gray-900">
              <td colSpan={4} className="border border-gray-300 py-1.5 px-2 text-right uppercase tracking-wider text-[10px]">
                Totaux des coefficients et points
              </td>
              <td className="border border-gray-300 py-1.5 px-1 text-center font-black tabular-nums text-base">
                {student.totalCoefficients}
              </td>
              <td className="border border-gray-300 py-1.5 px-1 text-center font-black tabular-nums text-base">
                {fmt(student.totalPoints)}
              </td>
              <td className="border border-gray-300" />
            </tr>

            {/* Ligne MOYENNE GÉNÉRALE (sur fond accentué) */}
            <tr style={{ backgroundColor: accent, color: "#ffffff" }}>
              <td colSpan={4} className="border border-gray-900 py-2 px-3 text-left">
                <span className="text-[12px] font-black uppercase tracking-wider">
                  Moyenne Générale :{" "}
                  <span className="text-base font-black">
                    {student.moyenneGenerale !== null ? fmt(student.moyenneGenerale) : "—"} / 20
                  </span>
                </span>
              </td>
              <td colSpan={3} className="border border-gray-900 py-2 px-3 text-right">
                <span className="text-[12px] font-black uppercase tracking-wider">
                  Rang : {rankLabel(student.rang, student.headcount)}
                </span>
              </td>
            </tr>

            {/* Avertissement Bulletin Incomplet */}
            {isIncomplete && (
              <tr className="bg-amber-50 text-amber-950 border-t-2 border-amber-400">
                <td colSpan={7} className="border border-gray-900 py-1.5 px-3 text-center">
                  <span className="text-[10px] font-bold text-amber-900">
                    ⚠️ Moyenne calculée sur {matieresNotees} matière{matieresNotees > 1 ? "s" : ""} sur {totalMatieres}. Bulletin incomplet.
                  </span>
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* ── BAS DE PAGE EN DEUX COLONNES (AVIS CONSEIL & VISAS) ── */}
      <div className="relative z-10 mt-2.5 grid grid-cols-2 gap-3 text-[10px] border-t border-gray-300 pt-2">
        {/* Colonne Gauche : Délibérations du conseil */}
        <div className="rounded border border-gray-300 bg-gray-50/40 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-600 text-[9px]">Distinction :</span>
            <span className="font-black text-gray-900">
              {distinctionLabel || "Aucune distinction"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-gray-200 pb-1">
            <div>
              <span className="font-bold uppercase text-gray-500 text-[9px]">Sanction Travail :</span>
              <p className="font-semibold text-gray-800">{sanctionTravailLabel}</p>
            </div>
            <div>
              <span className="font-bold uppercase text-gray-500 text-[9px]">Sanction Conduite :</span>
              <p className="font-semibold text-gray-800">{sanctionConduiteLabel}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-600 text-[9px]">Assiduité :</span>
            <span className="font-semibold text-gray-800">
              Justifiées : <span className="font-bold">{student.absencesJustifiees}</span> · Non justifiées :{" "}
              <span className="font-bold text-rose-700">{student.absencesNonJustifiees}</span>
            </span>
          </div>

          {isT3 && (
            <div className="flex items-center justify-between border-b border-gray-200 pb-1 bg-emerald-50/60 px-1 rounded">
              <span className="font-bold uppercase text-emerald-900 text-[9px]">Décision fin d&apos;année :</span>
              <span className="font-black uppercase text-emerald-950">{orientationLabel}</span>
            </div>
          )}

          <div>
            <span className="font-bold uppercase text-gray-500 text-[9px]">
              Observations du Conseil de classe :
            </span>
            <p className="italic text-gray-800 pt-0.5 min-h-[28px] text-[9.5px]">
              {student.observationsConseil?.trim() || "Aucune observation particulière."}
            </p>
          </div>
        </div>

        {/* Colonne Droite : Visas (Professeur Principal & Proviseur) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Visa Professeur Principal */}
          <div className="rounded border border-gray-300 p-2 flex flex-col justify-between min-h-[95px]">
            <div>
              <p className="font-bold uppercase text-[9px] text-gray-600">Le Professeur Principal</p>
              <p className="text-[10px] font-semibold text-gray-800 mt-0.5">
                {school.professeurPrincipal || "—"}
              </p>
            </div>
            <p className="text-[8px] text-gray-400 italic text-right">Signature</p>
          </div>

          {/* Visa Proviseur */}
          <div className="relative rounded border border-gray-300 p-2 flex flex-col justify-between min-h-[95px]">
            <div>
              <p className="font-bold uppercase text-[9px] text-gray-600">Le Proviseur</p>
              <p className="text-[10px] font-semibold text-gray-800 mt-0.5">
                {school.proviseurName || "La Direction"}
              </p>
            </div>

            {/* Cachet et Signature de l'école (Paramètres) */}
            <div className="relative h-12 w-full">
              {school.stamp && (
                <img
                  src={school.stamp}
                  alt="Cachet"
                  className="absolute bottom-0 right-6 h-12 object-contain opacity-60"
                />
              )}
              {school.signature && (
                <img
                  src={school.signature}
                  alt="Signature"
                  className="absolute bottom-0 right-0 h-10 object-contain"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
