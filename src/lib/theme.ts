import type { CSSProperties } from "react";

/**
 * Thème par établissement.
 *
 * `School.primaryColor` est la SEULE couleur persistée. Survol, état actif et
 * accent sont dérivés en CSS depuis `--color-primary` (voir le bloc
 * `@supports` de `globals.css`) : rien d'autre n'est stocké ni calculé ici.
 *
 * ⚠️ La valeur vient de la base et finit dans un attribut `style`. Sans
 * validation, une chaîne comme `red; background: url(...)` serait injectée
 * telle quelle dans la feuille de style du document. Seul un hexadécimal
 * strict est accepté ; toute autre valeur est ignorée et l'école retombe sur
 * la charte EduCom par défaut.
 */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Vrai si la chaîne est un hexadécimal CSS sûr (`#abc` ou `#aabbcc`). */
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value.trim());
}

/**
 * Traduit la couleur d'une école en surcharge de variables CSS.
 *
 * @returns Un objet `style` portant `--color-primary`, ou `undefined` quand
 *   l'école n'a pas de couleur propre — auquel cas aucune surcharge n'est
 *   émise et la valeur par défaut de `:root` s'applique.
 */
export function schoolThemeStyle(primaryColor?: string | null): CSSProperties | undefined {
  if (!isValidHexColor(primaryColor)) return undefined;
  return { "--color-primary": primaryColor.trim() } as CSSProperties;
}
