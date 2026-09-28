"use client";

import { useState } from "react";
import CourbeTendance, { type PointCourbe } from "./CourbeTendance";
import { fcfa } from "@/lib/calculs";
import { DollarSign, GraduationCap, PenTool } from "lucide-react";

export type SeriesTemporelle = {
  revenus: PointCourbe[];
  ecoles: PointCourbe[];
  notes: PointCourbe[];
};

export default function GraphiqueMultiMetriques({
  series,
  periodeLabel,
}: {
  series: SeriesTemporelle;
  periodeLabel: string;
}) {
  const [onglet, setOnglet] = useState<"revenus" | "ecoles" | "notes">("revenus");

  const totalRevenus = series.revenus.reduce((a, b) => a + b.valeur, 0);
  const totalEcoles = series.ecoles.reduce((a, b) => a + b.valeur, 0);
  const totalNotes = series.notes.reduce((a, b) => a + b.valeur, 0);

  return (
    <div className="space-y-2.5">
      {/* Barre d'onglets compacte et propre */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2">
        <div className="inline-flex items-center gap-1 rounded-lg border border-rule bg-sunk p-0.5">
          <button
            type="button"
            onClick={() => setOnglet("revenus")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] transition-colors ${
              onglet === "revenus"
                ? "bg-primary text-white font-semibold shadow-xs"
                : "text-text-soft hover:text-text"
            }`}
          >
            <DollarSign className="h-3 w-3" />
            <span>Revenus ({fcfa(totalRevenus)})</span>
          </button>

          <button
            type="button"
            onClick={() => setOnglet("ecoles")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] transition-colors ${
              onglet === "ecoles"
                ? "bg-emerald-700 text-white font-semibold shadow-xs"
                : "text-text-soft hover:text-text"
            }`}
          >
            <GraduationCap className="h-3 w-3" />
            <span>Écoles (+{totalEcoles})</span>
          </button>

          <button
            type="button"
            onClick={() => setOnglet("notes")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] transition-colors ${
              onglet === "notes"
                ? "bg-blue-700 text-white font-semibold shadow-xs"
                : "text-text-soft hover:text-text"
            }`}
          >
            <PenTool className="h-3 w-3" />
            <span>Notes ({totalNotes})</span>
          </button>
        </div>

        <span className="text-[11px] text-text-faint">
          Période : <b className="text-text">{periodeLabel}</b>
        </span>
      </div>

      {/* Rendu de la courbe selon l'onglet actif */}
      {onglet === "revenus" && (
        <CourbeTendance
          points={series.revenus}
          titre="Encaissements confirmés"
          sousTitre={`Paiements reçus sur ${periodeLabel}`}
          modeValeur="fcfa"
          couleur="violet"
        />
      )}

      {onglet === "ecoles" && (
        <CourbeTendance
          points={series.ecoles}
          titre="Inscriptions d'écoles"
          sousTitre={`Nouveaux comptes sur ${periodeLabel}`}
          modeValeur="nombre"
          couleur="emeraude"
        />
      )}

      {onglet === "notes" && (
        <CourbeTendance
          points={series.notes}
          titre="Volume de notes saisies"
          sousTitre={`Activité des professeurs sur ${periodeLabel}`}
          modeValeur="nombre"
          couleur="bleu"
        />
      )}
    </div>
  );
}
