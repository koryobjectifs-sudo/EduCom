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

  const activeColorInfo = useMemo(() => {
    for (const hue of SHARED_PALETTE_HUES) {
      if (hue.colors.light.hex.toUpperCase() === normalizedValue) return hue.colors.light;
      if (hue.colors.medium.hex.toUpperCase() === normalizedValue) return hue.colors.medium;
      if (hue.colors.dark.hex.toUpperCase() === normalizedValue) return hue.colors.dark;
    }
    return null;
  }, [normalizedValue]);

  const handleHexInput = (raw: string) => {
    let clean = raw.trim();
    if (!clean.startsWith("#")) {
      clean = "#" + clean;
    }
    onChange(clean);
  };

  return (
    <div className="space-y-2.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 tracking-tight">{label}</label>
          <span className="font-mono text-[11px] font-bold text-slate-500">
            {value || "Non défini"}
          </span>
        </div>
      )}

      {/* Bouton Couleur École (Spécifique au bulletin) */}
      {mode === "bulletin" && defaultSchoolColor && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(defaultSchoolColor)}
            className={`h-7 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              normalizedValue === defaultSchoolColor.trim().toUpperCase()
                ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary shadow-2xs"
                : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
            title="Reprendre la couleur officielle de l'établissement"
          >
            <span
              className="h-3 w-3 rounded-full border border-black/20 shrink-0"
              style={{ backgroundColor: defaultSchoolColor }}
            />
            <span>Couleur École ({defaultSchoolColor})</span>
            {normalizedValue === defaultSchoolColor.trim().toUpperCase() && (
              <Check className="h-3 w-3 text-primary ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Nuancier ultra-compact (36 teintes en 12 colonnes × 3 rangées) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px]">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">
            Palette calibrée (Claire · Moyenne · Foncée)
          </span>
          {activeColorInfo && (
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full border border-black/10 inline-block"
                style={{ backgroundColor: activeColorInfo.hex }}
              />
              <span>{activeColorInfo.name}</span>
              <span className="font-mono text-[10px] text-slate-400">({activeColorInfo.hex})</span>
            </span>
          )}
        </div>

        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/90 overflow-x-auto">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 min-w-[320px]">
            {SHARED_PALETTE_HUES.map((hue) => (
              <div key={hue.id} className="flex flex-col gap-1 items-center">
                {(
                  [hue.colors.light, hue.colors.medium, hue.colors.dark] as PaletteColor[]
                ).map((col) => {
                  const isSelected = col.hex.toUpperCase() === normalizedValue;
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => onChange(col.hex)}
                      className={`h-5 w-full rounded relative flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-purple-600 ring-offset-1 z-10 scale-105 shadow-2xs font-bold"
                          : "border border-black/10 hover:shadow-2xs"
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={`${col.name} (${col.hex})`}
                      aria-label={col.name}
                    >
                      {isSelected && (
                        <Check
                          className={`h-2.5 w-2.5 drop-shadow-sm ${
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
            ))}
          </div>
        </div>
      </div>

      {/* Saisie directe & pipette sur une ligne compacte */}
      <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <label
            htmlFor="hexCustomInput"
            className="text-[11px] font-semibold text-slate-700 flex items-center gap-1"
          >
            <Pipette className="h-3 w-3 text-slate-500" />
            <span>Personnalisé :</span>
          </label>
          <div className="flex items-center gap-1">
            <input
              id="nativeColorPicker"
              type="color"
              value={isValidHexColor(value) ? value : "#581C87"}
              onChange={(e) => onChange(e.target.value)}
              className="h-7 w-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              title="Sélecteur natif"
              aria-label="Sélecteur natif"
            />
            <input
              id="hexCustomInput"
              type="text"
              value={value}
              onChange={(e) => handleHexInput(e.target.value)}
              placeholder="#581C87"
              maxLength={7}
              className="h-7 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs font-mono font-semibold uppercase text-slate-900 focus:border-purple-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Contrôle de contraste en direct (compact) */}
        {mode === "shell" ? (
          contrast.warning ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 flex items-center gap-1.5 text-[10.5px] text-amber-900">
              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
              <span>Contraste texte blanc faible ({contrast.ratio}:1, reco &ge; 4.5:1)</span>
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 flex items-center gap-1 text-[10.5px] text-emerald-800">
              <Check className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>Lisibilité optimale ({contrast.ratio}:1 WCAG AA)</span>
            </div>
          )
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 flex items-center gap-1 text-[10.5px] text-slate-500">
            <Info className="h-3 w-3 text-primary shrink-0" />
            <span>Texte noir préservé sur le bulletin</span>
          </div>
        )}
      </div>
    </div>
  );
}
