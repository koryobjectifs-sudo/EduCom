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

/** Palette enrichie de teintes d'accent prédéfinies et harmonieuses pour l'éducation */
export const PRESET_SCHOOL_COLORS = [
  // Classiques & Institutionnels
  { hex: "#0E2541", label: "EduCom Initial (Navy)", group: "Classiques" },
  { hex: "#9C0F15", label: "Bordeaux EduCom", group: "Classiques" },
  { hex: "#0B2B4A", label: "Marine Profond", group: "Classiques" },
  { hex: "#1E3A8A", label: "Bleu Nuit", group: "Classiques" },
  { hex: "#1D4ED8", label: "Bleu Royal", group: "Classiques" },
  { hex: "#2563EB", label: "Bleu Cobalt", group: "Classiques" },
  { hex: "#4338CA", label: "Indigo Majestueux", group: "Classiques" },

  // Océan, Nature & Émeraude
  { hex: "#0E7490", label: "Bleu Océan", group: "Nature & Frais" },
  { hex: "#0284C7", label: "Azur Céleste", group: "Nature & Frais" },
  { hex: "#0F766E", label: "Sarcelle Profonde", group: "Nature & Frais" },
  { hex: "#0D9488", label: "Sarcelle Vive", group: "Nature & Frais" },
  { hex: "#047857", label: "Vert Émeraude", group: "Nature & Frais" },
  { hex: "#15803D", label: "Vert Forêt", group: "Nature & Frais" },

  // Chauds & Dynamiques
  { hex: "#B45309", label: "Ambre Cuivré", group: "Chauds & Solaires" },
  { hex: "#D97706", label: "Ocre Doré", group: "Chauds & Solaires" },
  { hex: "#EA580C", label: "Orange Solaire", group: "Chauds & Solaires" },
  { hex: "#C2410C", label: "Terracotta", group: "Chauds & Solaires" },
  { hex: "#DC2626", label: "Rouge Vif", group: "Chauds & Solaires" },
  { hex: "#B91C1C", label: "Grenat Intense", group: "Chauds & Solaires" },

  // Modernes & Distinction
  { hex: "#6D28D9", label: "Violet Impérial", group: "Distinction & Prune" },
  { hex: "#7E22CE", label: "Pourpre Royal", group: "Distinction & Prune" },
  { hex: "#86198F", label: "Prune Velours", group: "Distinction & Prune" },
  { hex: "#BE185D", label: "Framboise", group: "Distinction & Prune" },
  { hex: "#78350F", label: "Moka Chaud", group: "Distinction & Prune" },
  { hex: "#334155", label: "Ardoise Sombre", group: "Distinction & Prune" },

  // EduCom Aurora — direction premium (17 sept.) : navy + accents bleu/cyan/violet,
  // voir AURORA_ACCENTS ci-dessous. Seule cette teinte déclenche le traitement
  // enrichi dans `schoolThemeStyle()` ; les 24 ci-dessus restent inchangées.
  // ⚠️ Libellé volontairement SANS le préfixe "EduCom" : la grille tronque les
  // libellés longs, et "EduCom Initial (Navy)" (première entrée) se réduisait
  // à la même chaîne "EduCom…" que "EduCom Aurora" — impossible à distinguer
  // au premier coup d'œil dans "Tous". Le nom du groupe (onglet de catégorie)
  // porte déjà "Aurora" sans ambiguïté.
  { hex: "#3B82F6", label: "Aurora", group: "Aurora" },
] as const;

/**
 * Identifie la sélection « EduCom Aurora » — comparaison insensible à la casse
 * sur le hex stocké, jamais sur le libellé (qui peut varier selon l'écran).
 */
export const AURORA_HEX = "#3B82F6";

export function isAuroraColor(primaryColor?: string | null): boolean {
  return !!primaryColor && primaryColor.trim().toLowerCase() === AURORA_HEX.toLowerCase();
}

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

export const DEFAULT_EDUCOM_NAVY = "#0E2541";
export const DEFAULT_EDUCOM_ACCENT = "#9C0F15";

/**
 * Les six teintes Aurora (cahier des charges Kory, 17 sept.). `red` reste la
 * couleur de marque déjà réservée aux alertes/erreurs (`DEFAULT_EDUCOM_ACCENT`)
 * — Aurora ne lui donne aucun usage décoratif nouveau.
 */
export const AURORA_ACCENTS = {
  navy: DEFAULT_EDUCOM_NAVY, // #0E2541 — base du Shell, même famille que la charte par défaut
  primaryBlue: "#2563EB",
  brightBlue: "#3B82F6",
  cyan: "#38D9FF",
  violet: "#7C5CFC",
  pink: "#F05BCB",
  red: DEFAULT_EDUCOM_ACCENT, // #9C0F15 — réservé au critique, jamais décoratif
} as const;

/**
 * Traduit la couleur d'une école en surcharge de variables CSS pour les cadres du shell (Slack-style).
 *
 * ⚠️ Règle de design EduCom :
 * 1. Les boutons d'action NE SONT PAS impactés (ils restent stables et lisibles).
 * 2. La couleur s'applique exclusivement aux cadres : la TopBar et le Rail partagent exactement la même teinte.
 * 3. La sidebar contextuelle (la plus grande) reçoit une déclinaison plus claire et douce (color-mix à 7%).
 *
 * ⚠️ **Cas spécial Aurora (17 sept.)** : une seule teinte, `AURORA_HEX`,
 * bascule sur un traitement à plusieurs tons (navy + accents cyan/violet) au
 * lieu de l'aplat uniforme ci-dessous. Les 24 autres teintes ne changent pas
 * d'une ligne — la branche par défaut est strictement celle d'avant.
 */
export function schoolThemeStyle(primaryColor?: string | null): CSSProperties | undefined {
  if (!isValidHexColor(primaryColor)) return undefined;
  const frameColor = primaryColor.trim();

  if (isAuroraColor(frameColor)) {
    const { navy, cyan, violet } = AURORA_ACCENTS;
    return {
      "--color-frame-bg": navy,
      "--color-topbar-bg": navy,
      "--color-rail-bg": navy,
      "--color-sidebar-bg": `color-mix(in srgb, ${navy} 7%, #F8FAFC)`,
      // Touches ponctuelles de violet : seuls le survol et l'état actif de la
      // sidebar en portent la trace, jamais le fond au repos — pour rester
      // « visible mais subtil », pas un bloc lumineux.
      "--color-sidebar-hover": `color-mix(in srgb, ${violet} 10%, #F1F5F9)`,
      "--color-sidebar-active": `color-mix(in srgb, ${violet} 16%, #FFFFFF)`,
      // Le cyan est réservé à l'indicateur d'élément actif du Rail — c'est lui
      // qui rend l'état actif « clairement visible » sur fond navy.
      "--color-rail-accent": cyan,
      // Rôles Dashboard (KPI, badges, progress bars) — voir Badge.tsx et
      // ProgressBar.tsx. Non définis pour les 24 autres teintes : les
      // composants retombent alors sur leurs tokens neutres actuels.
      "--color-palette-info": cyan,
      "--color-palette-secondary": violet,
      "--color-palette-exceptional": AURORA_ACCENTS.pink,
    } as CSSProperties;
  }

  return {
    "--color-frame-bg": frameColor,
    "--color-topbar-bg": frameColor,
    "--color-rail-bg": frameColor,
    "--color-sidebar-bg": `color-mix(in srgb, ${frameColor} 7%, #F8FAFC)`,
    "--color-sidebar-hover": `color-mix(in srgb, ${frameColor} 12%, #F1F5F9)`,
    "--color-sidebar-active": `color-mix(in srgb, ${frameColor} 16%, #FFFFFF)`,
    "--color-rail-accent": frameColor,
  } as CSSProperties;
}

