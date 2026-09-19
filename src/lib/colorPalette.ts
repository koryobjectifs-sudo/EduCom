import { getContrastRatioAgainstWhite, isValidHexColor } from "./theme";

export type ColorIntensity = "light" | "medium" | "dark";

export type PaletteColor = {
  hex: string;
  name: string;
  intensity: ColorIntensity;
  contrastRatio: number; // against white #ffffff
  isAccessibleOnDark: boolean; // >= 4.5:1
};

export type PaletteHue = {
  id: string;
  name: string;
  colors: {
    light: PaletteColor;
    medium: PaletteColor;
    dark: PaletteColor;
  };
};

/**
 * Palette partagée de 36 couleurs calibrées (12 teintes de base × 3 intensités).
 * Utilisée à la fois par le shell de l'application et la personnalisation des bulletins.
 */
export const SHARED_PALETTE_HUES: PaletteHue[] = [
  {
    id: "rouge",
    name: "Rouge",
    colors: {
      light: { hex: "#EF4444", name: "Rouge clair", intensity: "light", contrastRatio: 3.76, isAccessibleOnDark: false },
      medium: { hex: "#DC2626", name: "Rouge vif", intensity: "medium", contrastRatio: 4.67, isAccessibleOnDark: true },
      dark: { hex: "#991B1B", name: "Rouge bordeaux", intensity: "dark", contrastRatio: 7.82, isAccessibleOnDark: true },
    },
  },
  {
    id: "orange",
    name: "Orange",
    colors: {
      light: { hex: "#FB923C", name: "Orange clair", intensity: "light", contrastRatio: 2.37, isAccessibleOnDark: false },
      medium: { hex: "#EA580C", name: "Orange solaire", intensity: "medium", contrastRatio: 3.51, isAccessibleOnDark: false },
      dark: { hex: "#9A3412", name: "Orange cuivré", intensity: "dark", contrastRatio: 6.25, isAccessibleOnDark: true },
    },
  },
  {
    id: "ambre",
    name: "Ambre",
    colors: {
      light: { hex: "#FBBF24", name: "Ambre clair", intensity: "light", contrastRatio: 1.66, isAccessibleOnDark: false },
      medium: { hex: "#D97706", name: "Ocre doré", intensity: "medium", contrastRatio: 3.01, isAccessibleOnDark: false },
      dark: { hex: "#92400E", name: "Ambre profond", intensity: "dark", contrastRatio: 6.36, isAccessibleOnDark: true },
    },
  },
  {
    id: "vert",
    name: "Vert",
    colors: {
      light: { hex: "#4ADE80", name: "Vert clair", intensity: "light", contrastRatio: 1.84, isAccessibleOnDark: false },
      medium: { hex: "#16A34A", name: "Vert prairie", intensity: "medium", contrastRatio: 3.74, isAccessibleOnDark: false },
      dark: { hex: "#14532D", name: "Vert forêt", intensity: "dark", contrastRatio: 8.91, isAccessibleOnDark: true },
    },
  },
  {
    id: "emeraude",
    name: "Émeraude",
    colors: {
      light: { hex: "#34D399", name: "Émeraude clair", intensity: "light", contrastRatio: 1.95, isAccessibleOnDark: false },
      medium: { hex: "#059669", name: "Émeraude vif", intensity: "medium", contrastRatio: 4.54, isAccessibleOnDark: true },
      dark: { hex: "#064E3B", name: "Émeraude profond", intensity: "dark", contrastRatio: 9.32, isAccessibleOnDark: true },
    },
  },
  {
    id: "sarcelle",
    name: "Sarcelle",
    colors: {
      light: { hex: "#2DD4BF", name: "Sarcelle claire", intensity: "light", contrastRatio: 1.92, isAccessibleOnDark: false },
      medium: { hex: "#0D9488", name: "Sarcelle océan", intensity: "medium", contrastRatio: 4.52, isAccessibleOnDark: true },
      dark: { hex: "#134E4A", name: "Sarcelle sombre", intensity: "dark", contrastRatio: 8.84, isAccessibleOnDark: true },
    },
  },
  {
    id: "cyan",
    name: "Cyan",
    colors: {
      light: { hex: "#38BDF8", name: "Cyan azur", intensity: "light", contrastRatio: 2.15, isAccessibleOnDark: false },
      medium: { hex: "#0284C7", name: "Bleu céleste", intensity: "medium", contrastRatio: 4.51, isAccessibleOnDark: true },
      dark: { hex: "#0C4A6E", name: "Cyan profond", intensity: "dark", contrastRatio: 8.71, isAccessibleOnDark: true },
    },
  },
  {
    id: "bleu",
    name: "Bleu",
    colors: {
      light: { hex: "#60A5FA", name: "Bleu ciel", intensity: "light", contrastRatio: 2.68, isAccessibleOnDark: false },
      medium: { hex: "#2563EB", name: "Bleu cobalt", intensity: "medium", contrastRatio: 4.61, isAccessibleOnDark: true },
      dark: { hex: "#1E3A8A", name: "Bleu nuit", intensity: "dark", contrastRatio: 9.15, isAccessibleOnDark: true },
    },
  },
  {
    id: "indigo",
    name: "Indigo",
    colors: {
      light: { hex: "#818CF8", name: "Indigo pastel", intensity: "light", contrastRatio: 3.32, isAccessibleOnDark: false },
      medium: { hex: "#4F46E5", name: "Indigo royal", intensity: "medium", contrastRatio: 5.68, isAccessibleOnDark: true },
      dark: { hex: "#312E81", name: "Indigo profond", intensity: "dark", contrastRatio: 9.85, isAccessibleOnDark: true },
    },
  },
  {
    id: "violet",
    name: "Violet",
    colors: {
      light: { hex: "#C084FC", name: "Violet doux", intensity: "light", contrastRatio: 2.76, isAccessibleOnDark: false },
      medium: { hex: "#9333EA", name: "Violet impérial", intensity: "medium", contrastRatio: 5.42, isAccessibleOnDark: true },
      dark: { hex: "#581C87", name: "Violet pourpre", intensity: "dark", contrastRatio: 9.64, isAccessibleOnDark: true },
    },
  },
  {
    id: "rose",
    name: "Rose",
    colors: {
      light: { hex: "#F472B6", name: "Rose clair", intensity: "light", contrastRatio: 2.72, isAccessibleOnDark: false },
      medium: { hex: "#DB2777", name: "Rose framboise", intensity: "medium", contrastRatio: 4.79, isAccessibleOnDark: true },
      dark: { hex: "#831843", name: "Rose prune", intensity: "dark", contrastRatio: 8.62, isAccessibleOnDark: true },
    },
  },
  {
    id: "ardoise",
    name: "Ardoise",
    colors: {
      light: { hex: "#94A3B8", name: "Ardoise claire", intensity: "light", contrastRatio: 2.75, isAccessibleOnDark: false },
      medium: { hex: "#475569", name: "Ardoise neutre", intensity: "medium", contrastRatio: 5.58, isAccessibleOnDark: true },
      dark: { hex: "#0F172A", name: "Ardoise anthracite", intensity: "dark", contrastRatio: 12.82, isAccessibleOnDark: true },
    },
  },
];

/**
 * Retourne toutes les 36 couleurs à plat si besoin.
 */
export const ALL_SHARED_PALETTE_COLORS: PaletteColor[] = SHARED_PALETTE_HUES.flatMap((h) => [
  h.colors.light,
  h.colors.medium,
  h.colors.dark,
]);

/**
 * Évalue le contraste d'une couleur arbitraire et fournit un message d'alerte WCAG pour le shell.
 */
export function checkColorContrast(hex: string): {
  ratio: number;
  isAccessible: boolean;
  warning: string | null;
} {
  if (!isValidHexColor(hex)) {
    return { ratio: 0, isAccessible: false, warning: "Couleur invalide." };
  }
  const ratio = getContrastRatioAgainstWhite(hex);
  const isAccessible = ratio >= 4.5;
  const warning = isAccessible
    ? null
    : `Ce coloris rend le texte difficile à lire sur le menu (contraste : ${ratio}:1, recommandé : 4.5:1).`;
  return { ratio, isAccessible, warning };
}
