"use client";

import { Fragment } from "react";
import { formatDate } from "@/lib/dateUtils";
import type {
  OfficialElementaireStudent,
  OfficialSchoolMetadata,
} from "@/lib/bulletin/loadOfficialBulletin";
import { ORIENTATION_LABELS, DISTINCTION_LABELS } from "@/lib/notes/conseil";

const fmt = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? "—" : v.toFixed(digits));

function rankLabel(rank: number | null, headcount: number): string {
  if (rank === null) return "Non classé";
  return `${rank === 1 ? "1er" : `${rank}e`} / ${headcount}`;
}

export function BulletinElementaireSheet({
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
  student: OfficialElementaireStudent;
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
    : accentColor || school.bulletinAccentColor || school.primaryColor || "#047857";
  const effectiveWatermark = watermark ?? school.bulletinWatermark ?? false;
  const effectiveWatermarkOpacity = watermarkOpacity ?? school.bulletinWatermarkOpacity ?? 0.06;
  const effectiveLogoPosition = logoPosition || (school.bulletinLogoPosition as "LEFT" | "CENTER" | "RIGHT") || "CENTER";

  const allSubj = student.domains.flatMap((d) => d.subDisciplines);
  const totalMatieres = allSubj.length;
  const matieresNotees = allSubj.filter(
    (s) => s.note !== null && s.note !== undefined
  ).length;
  const isIncomplete = matieresNotees > 0 && matieresNotees < totalMatieres;

  const distinctionLabel = student.distinctionRetenue
    ? DISTINCTION_LABELS[student.distinctionRetenue as keyof typeof DISTINCTION_LABELS] || student.distinctionRetenue
    : null;

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
                BULLETIN DU {termName.toUpperCase()} · ÉLÉMENTAIRE
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

      {/* ── TABLEAU PAR DOMAINES (SANS COLONNE COEFFICIENT) ── */}
      <div className="relative z-10 mt-2.5">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr style={{ backgroundColor: accent, color: "#ffffff" }}>
              <th className="border border-gray-900 py-1 px-2 text-left font-black uppercase w-[55%]">
                Domaines &amp; Activités d&apos;apprentissage
              </th>
              <th className="border border-gray-900 py-1 px-1 text-center font-bold uppercase w-[15%]">
                Barème
              </th>
              <th className="border border-gray-900 py-1 px-1 text-center font-black uppercase w-[15%]">
                Note obtenue
              </th>
              <th className="border border-gray-900 py-1 px-2 text-center font-bold uppercase w-[15%]">
                Appréciation
              </th>
            </tr>
          </thead>
          <tbody>
            {student.domains.map((dom) => (
              <Fragment key={dom.id}>
                {/* En-tête du Domaine avec sa moyenne de domaine en sous-total */}
                <tr className="bg-gray-100/60 font-bold border-t border-b border-gray-300">
                  <td className="border-x border-gray-300 py-1 px-2 text-[10.5px] uppercase font-black text-gray-900">
                    {dom.name}
                  </td>
                  <td className="border-r border-gray-300 py-1 px-1 text-center text-[9px] uppercase font-bold text-gray-600">
                    Moy. Domaine
                  </td>
                  <td className="border-r border-gray-300 py-1 px-1 text-center font-black text-gray-900 bg-gray-200/60 tabular-nums">
                    {fmt(dom.moyenneSur10)} / 10
                  </td>
                  <td className="border-r border-gray-300 py-1 px-2 text-center text-[9px] text-gray-500 italic">
                    Sous-total
                  </td>
                </tr>

                {/* Sous-disciplines du domaine en retrait */}
                {dom.subDisciplines.map((sd) => (
                  <tr key={sd.id} className="hover:bg-gray-50/50">
                    <td className="border border-gray-300 py-0.5 px-2 pl-5 text-[10px] text-gray-800 font-medium">
                      ↳ {sd.name}
                    </td>
                    <td className="border border-gray-300 py-0.5 px-1 text-center text-[9px] tabular-nums text-gray-500">
                      /{sd.scale}
                    </td>
                    <td className="border border-gray-300 py-0.5 px-1 text-center text-[10px] font-bold tabular-nums text-gray-900">
                      {fmt(sd.note)}
                    </td>
                    <td className="border border-gray-300 py-0.5 px-2 text-center text-[9px] text-gray-400">
                      {sd.note !== null
                        ? sd.note >= sd.scale / 2
                          ? "Acquis"
                          : "En cours"
                        : "Non noté"}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            {/* Ligne TOTAL POINTS / MAXIMUM */}
            <tr className="bg-gray-100/60 font-bold text-gray-900 border-t-2 border-gray-900">
              <td className="border border-gray-300 py-1 px-2 text-right uppercase tracking-wider text-[10px]">
                Total des points obtenus sur le barème maximal
              </td>
              <td className="border border-gray-300 py-1 px-1 text-center font-bold tabular-nums text-xs">
                /{student.totalMaximum ?? "—"}
              </td>
              <td className="border border-gray-300 py-1 px-1 text-center font-black tabular-nums text-sm bg-gray-200/50">
                {fmt(student.totalPoints)}
              </td>
              <td className="border border-gray-300" />
            </tr>

            {/* Ligne MOYENNE GÉNÉRALE & RANG */}
            <tr style={{ backgroundColor: accent, color: "#ffffff" }}>
              <td colSpan={2} className="border border-gray-900 py-1.5 px-3 text-left">
                <span className="text-[11.5px] font-black uppercase tracking-wider">
                  Moyenne Générale :{" "}
                  <span className="text-sm font-black">
                    {student.moyenneGeneraleSur10 !== null ? fmt(student.moyenneGeneraleSur10) : "—"} / 10
                  </span>
                  {student.moyenneGeneraleSur20 !== null && (
                    <span className="ml-2 text-[10.5px] font-semibold opacity-90">
                      ({fmt(student.moyenneGeneraleSur20)} / 20)
                    </span>
                  )}
                </span>
              </td>
              <td colSpan={2} className="border border-gray-900 py-1.5 px-3 text-right">
                <span className="text-[11.5px] font-black uppercase tracking-wider">
                  Rang : {rankLabel(student.rang, student.headcount)}
                </span>
              </td>
            </tr>

            {/* Avertissement Bulletin Incomplet */}
            {isIncomplete && (
              <tr className="bg-amber-50 text-amber-950 border-t-2 border-amber-400">
                <td colSpan={4} className="border border-gray-900 py-1.5 px-3 text-center">
                  <span className="text-[10px] font-bold text-amber-900">
                    ⚠️ Moyenne calculée sur {matieresNotees} matière{matieresNotees > 1 ? "s" : ""} sur {totalMatieres}. Bulletin incomplet.
                  </span>
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* ── BAS DE PAGE EN DEUX COLONNES (BILAN, APPRÉCIATION ET 3 VISAS) ── */}
      <div className="relative z-10 mt-2.5 grid grid-cols-2 gap-3 text-[10px] border-t border-gray-300 pt-2">
        {/* Colonne Gauche : Bilan, Assiduité, Orientation et Appréciation du Maître */}
        <div className="rounded border border-gray-300 bg-gray-50/40 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-600 text-[9px]">Distinction :</span>
            <span className="font-black text-gray-900">
              {distinctionLabel || "Aucune"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-600 text-[9px]">Assiduité du trimestre :</span>
            <span className="font-semibold text-gray-800">
              Justifiées : <span className="font-bold">{student.absencesJustifiees} j</span> · Non justifiées :{" "}
              <span className="font-bold text-rose-700">{student.absencesNonJustifiees} j</span>
            </span>
          </div>

          {isT3 && (
            <div className="flex items-center justify-between border-b border-gray-200 pb-1 bg-emerald-50/60 px-1 rounded">
              <span className="font-bold uppercase text-emerald-900 text-[9px]">Décision de passage :</span>
              <span className="font-black uppercase text-emerald-950">{orientationLabel}</span>
            </div>
          )}

          <div>
            <span className="font-bold uppercase text-gray-500 text-[9px]">
              Appréciation globale du Maître titulaire :
            </span>
            <p className="italic text-gray-800 pt-0.5 min-h-[36px] text-[9.5px]">
              {student.appreciationTitulaire?.trim() || "Aucune appréciation renseignée."}
            </p>
          </div>
        </div>

        {/* Colonne Droite : TROIS ZONES DE VISA (Enseignant, Directeur, Parents) */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* 1. Enseignant */}
          <div className="rounded border border-gray-300 p-1.5 flex flex-col justify-between min-h-[95px]">
            <div>
              <p className="font-bold uppercase text-[8.5px] text-gray-600">L&apos;Enseignant(e)</p>
              <p className="text-[9px] font-semibold text-gray-800 mt-0.5 truncate">
                {school.professeurPrincipal || "Le Maître"}
              </p>
            </div>
            <p className="text-[7.5px] text-gray-400 italic text-right">Signature</p>
          </div>

          {/* 2. Directeur (avec Signature et Cachet de l'école) */}
          <div className="relative rounded border border-gray-300 p-1.5 flex flex-col justify-between min-h-[95px]">
            <div>
              <p className="font-bold uppercase text-[8.5px] text-gray-600">Le Directeur</p>
              <p className="text-[9px] font-semibold text-gray-800 mt-0.5 truncate">
                {school.proviseurName || "La Direction"}
              </p>
            </div>

            <div className="relative h-11 w-full">
              {school.stamp && (
                <img
                  src={school.stamp}
                  alt="Cachet"
                  className="absolute bottom-0 right-3 h-10 object-contain opacity-60"
                />
              )}
              {school.signature && (
                <img
                  src={school.signature}
                  alt="Signature"
                  className="absolute bottom-0 right-0 h-8 object-contain"
                />
              )}
            </div>
          </div>

          {/* 3. Parents / Tuteur */}
          <div className="rounded border border-gray-300 p-1.5 flex flex-col justify-between min-h-[95px]">
            <div>
              <p className="font-bold uppercase text-[8.5px] text-gray-600">Les Parents</p>
              <p className="text-[8px] text-gray-500 mt-0.5">Vu et pris connaissance</p>
            </div>
            <p className="text-[7.5px] text-gray-400 italic text-right">Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
