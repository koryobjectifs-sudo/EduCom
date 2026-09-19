"use client";

import React, { useMemo } from "react";
import { Check, AlertTriangle, Info, Pipette } from "lucide-react";
import {
  SHARED_PALETTE_HUES,
  checkColorContrast,
  type PaletteColor,
} from "@/lib/colorPalette";
import { isValidHexColor } from "@/lib/theme";

type SharedColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  mode: "shell" | "bulletin";
  defaultSchoolColor?: string;
  label?: string;
};

export default function SharedColorPicker({
  value,
  onChange,
  mode,
  defaultSchoolColor,
  label,
}: SharedColorPickerProps) {
  const normalizedValue = (value || "").trim().toUpperCase();

  const contrast = useMemo(() => {
    return checkColorContrast(value);
  }, [value]);

  const handleHexInput = (raw: string) => {
    let clean = raw.trim();
    if (!clean.startsWith("#")) {
      clean = "#" + clean;
    }
    onChange(clean);
  };

  return (
    <div className="space-y-3.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text">{label}</label>
          <span className="font-mono text-xs font-bold text-text-secondary">
            {value || "Non défini"}
          </span>
        </div>
      )}

      {/* Bouton École (Spécifique au bulletin) */}
      {mode === "bulletin" && defaultSchoolColor && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(defaultSchoolColor)}
            className={`h-8 px-3 rounded-control border text-xs font-medium flex items-center gap-2 transition-all ${
              normalizedValue === defaultSchoolColor.trim().toUpperCase()
                ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/30 shadow-2xs"
                : "border-rule bg-ground text-text-soft hover:text-text hover:bg-surface"
            }`}
            title="Reprendre la couleur officielle de l'établissement"
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
              style={{ backgroundColor: defaultSchoolColor }}
            />
            <span>Couleur École ({defaultSchoolColor})</span>
            {normalizedValue === defaultSchoolColor.trim().toUpperCase() && (
              <Check className="h-3.5 w-3.5 text-primary ml-1" />
            )}
          </button>
        </div>
      )}

      {/* Grille des 36 teintes (12 teintes de base × 3 intensités) */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-text-soft uppercase tracking-wider">
          Palette de teintes (12 teintes · Claire · Moyenne · Foncée)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {SHARED_PALETTE_HUES.map((hue) => {
            const isHueActive = [
              hue.colors.light.hex,
              hue.colors.medium.hex,
              hue.colors.dark.hex,
            ].some((h) => h.toUpperCase() === normalizedValue);

            return (
              <div
                key={hue.id}
                className={`rounded-control border p-1.5 transition-all ${
                  isHueActive
                    ? "border-primary/50 bg-primary/5 shadow-2xs"
                    : "border-rule bg-surface hover:border-rule-strong"
                }`}
              >
                <div className="flex items-center justify-between mb-1 px-0.5">
                  <span className="text-[10.5px] font-bold text-text truncate">
                    {hue.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      hue.colors.light,
                      hue.colors.medium,
                      hue.colors.dark,
                    ] as PaletteColor[]
                  ).map((col) => {
                    const isSelected =
                      col.hex.toUpperCase() === normalizedValue;
                    return (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => onChange(col.hex)}
                        className={`h-7 rounded-sm relative flex items-center justify-center transition-all hover:scale-105 ${
                          isSelected
                            ? "ring-2 ring-primary ring-offset-1 z-10 scale-105 shadow-xs"
                            : "border border-black/10 hover:shadow-2xs"
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={`${col.name} (${col.hex}) - Intensité ${col.intensity}`}
                        aria-label={col.name}
                      >
                        {isSelected && (
                          <Check
                            className={`h-3.5 w-3.5 drop-shadow-sm ${
                              col.intensity === "light"
                                ? "text-gray-950 font-extrabold"
                                : "text-white"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saisie libre : Hexadécimal + Sélecteur natif */}
      <div className="pt-2 border-t border-rule/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="hexCustomInput"
            className="text-xs font-semibold text-text flex items-center gap-1.5"
          >
            <Pipette className="h-3.5 w-3.5 text-text-soft" />
            <span>Couleur personnalisée :</span>
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="nativeColorPicker"
              type="color"
              value={isValidHexColor(value) ? value : "#0E2541"}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-8 rounded-control border border-rule cursor-pointer p-0.5 bg-ground"
              title="Sélecteur de couleur natif"
              aria-label="Sélecteur natif"
            />
            <input
              id="hexCustomInput"
              type="text"
              value={value}
              onChange={(e) => handleHexInput(e.target.value)}
              placeholder="#000000"
              maxLength={7}
              className="h-8 w-24 rounded-control border border-rule bg-surface px-2 text-xs font-mono font-semibold uppercase text-text focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Témoin visuel */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-soft">Aperçu :</span>
          <span
            className="h-7 w-12 rounded-control border border-black/15 shadow-2xs"
            style={{ backgroundColor: isValidHexColor(value) ? value : "transparent" }}
          />
        </div>
      </div>

      {/* Contrôle de contraste en direct */}
      {mode === "shell" ? (
        contrast.warning ? (
          <div className="rounded-control bg-amber-50 border border-amber-200 p-2.5 flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{contrast.warning}</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Le rail et la top bar utilisent du texte blanc. Un contraste supérieur à 4.5:1 assure une lisibilité optimale.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-control bg-emerald-50/80 border border-emerald-200 p-2 flex items-center gap-2 text-[11px] text-emerald-800">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              Contraste optimal avec le texte blanc du menu ({contrast.ratio}:1, conforme WCAG AA).
            </span>
          </div>
        )
      ) : (
        <div className="rounded-control bg-surface-subtle/80 border border-rule/70 p-2 flex items-center gap-2 text-[11px] text-text-soft">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Sur le bulletin, le texte du document reste toujours noir. Seuls les filets, bordures et en-têtes de tableau adoptent cette couleur.
          </span>
        </div>
      )}
    </div>
  );
}
