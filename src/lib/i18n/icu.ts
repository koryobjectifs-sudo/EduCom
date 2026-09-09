/**
 * Formateur ICU MessageFormat minimaliste, rapide et sans dépendance externe.
 * Supporte :
 * 1. Interpolation simple : `{name}`, `{amount}`
 * 2. Pluriels ICU : `{count, plural, one {# élément} other {# éléments}}`
 * 3. Formatage XOF strict : "125 000 FCFA" (sans décimales)
 */

export function formatIcu(
  template: string,
  params: Record<string, string | number | boolean | null | undefined> = {}
): string {
  if (!template) return "";

  // 1. Traitement des blocs de pluriel : {key, plural, one {...} other {...}}
  // Utilisation d'un parseur à balance d'accolades pour gérer proprement les sous-accolades
  let result = template;
  const pluralRegex = /\{([a-zA-Z0-9_]+),\s*plural,\s*/g;
  let match;

  while ((match = pluralRegex.exec(result)) !== null) {
    const fullStart = match.index;
    const countKey = match[1];
    let depth = 1;
    let i = match.index + match[0].length;
    let body = "";

    while (i < result.length && depth > 0) {
      if (result[i] === "{") depth++;
      else if (result[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
      body += result[i];
      i++;
    }

    if (depth === 0) {
      const val = Number(params[countKey] ?? 0);
      const isOne = val === 1 || val === -1;

      const oneMatch = body.match(/one\s*\{([^}]*)\}/);
      const otherMatch = body.match(/other\s*\{([^}]*)\}/);
      const zeroMatch = body.match(/zero\s*\{([^}]*)\}/);

      let branchText = "";
      if (val === 0 && zeroMatch) {
        branchText = zeroMatch[1];
      } else if (isOne && oneMatch) {
        branchText = oneMatch[1];
      } else if (otherMatch) {
        branchText = otherMatch[1];
      } else if (oneMatch) {
        branchText = oneMatch[1];
      }

      const replacement = branchText.replace(/#/g, val.toLocaleString("fr-FR"));
      result = result.slice(0, fullStart) + replacement + result.slice(i + 1);
      // Réinitialiser la recherche
      pluralRegex.lastIndex = fullStart + replacement.length;
    }
  }

  // 2. Interpolation des variables simples : {name}
  result = result.replace(/\{([a-zA-Z0-9_]+)\}/g, (m, key) => {
    const val = params[key];
    if (val === undefined || val === null) return m;
    if (typeof val === "number") return val.toLocaleString("fr-FR");
    return String(val);
  });

  return result;
}

/**
 * Formatage monétaire officiel XOF : "125 000 FCFA", JAMAIS de décimales.
 */
export function formatXOF(amount: number): string {
  const rounded = Math.round(amount || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${formatted}\u00A0FCFA`;
}
