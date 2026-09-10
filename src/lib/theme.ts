import type { CSSProperties } from "react";

/**
 * Thème par établissement.
 *
 * `School.primaryColor` est la SEULE couleur persistée. Survol, état actif et
 * accent sont dérivés en CSS depuis `--color-primary` et `--color-rail-accent`.
 *
 * ⚠️ La valeur vient de la base et finit dans un attribut `style`. Sans
 * validation, une chaîne comme `red; background: url(...)` serait injectée
 * telle quelle dans la feuille de style du document. Seul un hexadécimal
 * strict est accepté ; toute autre valeur est ignorée et l'école retombe sur
 * la charte EduCom par défaut.
 */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Palette de 8 teintes d'accent prédéfinies et harmonieuses pour l'éducation */
export const PRESET_SCHOOL_COLORS = [
  { hex: "#9C0F15", label: "Bordeaux EduCom (Défaut)", default: true },
  { hex: "#0E7490", label: "Bleu Océan" },
  { hex: "#1D4ED8", label: "Bleu Royal" },
  { hex: "#047857", label: "Vert Émeraude" },
  { hex: "#B45309", label: "Ambre Cuivré" },
  { hex: "#6D28D9", label: "Violet Impérial" },
  { hex: "#0F766E", label: "Sarcelle Profonde" },
  { hex: "#334155", label: "Ardoise Sombre" },
] as const;

/** Vrai si la chaîne est un hexadécimal CSS sûr (`#abc` ou `#aabbcc`). */
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value.trim());
}

/**
 * Calcule la luminance relative d'une couleur hexadécimale sRGB (norme WCAG 2.1).
 */
export function getRelativeLuminance(hex: string): number {
  if (!isValidHexColor(hex)) return 0;
  let clean = hex.trim().replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calcule le ratio de contraste entre la couleur fournie et le blanc (#ffffff).
 * Seuil WCAG AA pour texte normal : 4.5:1.
 */
export function getContrastRatioAgainstWhite(hex: string): number {
  const lum = getRelativeLuminance(hex);
  const whiteLum = 1.0;
  return Number(((whiteLum + 0.05) / (lum + 0.05)).toFixed(2));
}

/**
 * Traduit la couleur d'une école en surcharge de variables CSS.
 *
 * @returns Un objet `style` portant `--color-primary` et `--color-rail-accent`,
 *   ou `undefined` quand l'école n'a pas de couleur propre — auquel cas aucune
 *   surcharge n'est émise et la valeur par défaut de `:root` s'applique.
 */
export function schoolThemeStyle(primaryColor?: string | null): CSSProperties | undefined {
  if (!isValidHexColor(primaryColor)) return undefined;
  const color = primaryColor.trim();
  return {
    "--color-primary": color,
    "--color-rail-accent": color,
  } as CSSProperties;
}

