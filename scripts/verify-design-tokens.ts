/**
 * Vérifie le socle de tokens (LOT 02). LECTURE SEULE.
 *
 * Cinq propriétés :
 *   1. COMPILATION  `globals.css` compile via PostCSS sans avertissement ;
 *   2. TOKENS       les valeurs de la charte validée sont bien présentes ;
 *   3. ÉCHELLES     3 rayons, 2 ombres, 6 rôles typographiques, plancher 12px ;
 *   4. COMPATIBILITÉ les utilitaires dont dépendent les 937 usages existants
 *                   sont toujours générés — le lot 02 ne doit rien casser ;
 *   5. THÈME        `primaryColor` null retombe sur la charte, une couleur
 *                   valide surcharge, une valeur douteuse est rejetée.
 *
 *   npm run script -- scripts/verify-design-tokens.ts
 */
import { readFileSync } from "fs";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { isValidHexColor, schoolThemeStyle } from "../src/lib/theme";

const CSS_PATH = "src/app/globals.css";
let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));

/**
 * Retire le bloc `@theme inline { … }`.
 *
 * Ce bloc ne DÉFINIT rien : il mappe chaque token vers son utilitaire Tailwind
 * (`--radius-control: var(--radius-control)`). Le compter dans les contrôles
 * structurels double chaque échelle et fait échouer le test de dérivation sur
 * un simple alias. Les définitions réelles sont dans `:root` et `@supports`.
 */
function stripThemeBlock(src: string): string {
  const start = src.indexOf("@theme inline");
  if (start === -1) return src;
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(0, start) + src.slice(i + 1);
    }
  }
  return src;
}

async function main() {
  const source = readFileSync(CSS_PATH, "utf8");
  // Contrôles structurels : uniquement les définitions, pas les mappages.
  const defs = stripThemeBlock(source);

  // ---- 1. COMPILATION ----
  console.log(`\n=== SOCLE DE TOKENS ===\n`);
  console.log(`[1] COMPILATION`);
  let compiled = "";
  let warnings: string[] = [];
  try {
    const probe = [
      "rounded-control", "rounded-surface", "rounded-pill",
      "shadow-card", "shadow-overlay",
      "text-role-page", "text-role-section", "text-role-card",
      "text-role-body", "text-role-label", "text-role-meta",
      "bg-ground", "bg-surface", "bg-sunk",
      "text-text", "text-text-soft", "text-text-faint", "border-rule",
      "bg-primary", "bg-primary-hover", "bg-primary-active", "bg-accent",
      "bg-success", "bg-warning", "bg-danger",
      // Utilitaires dont dépend le code existant
      "text-text-primary", "text-text-secondary", "text-text-muted",
      "border-border", "bg-secondary", "text-error", "bg-error",
      "rounded-xl", "rounded-2xl", "rounded-lg", "rounded-full",
      "shadow-sm", "text-sm", "text-xs", "text-3xl", "p-4", "gap-6",
    ];
    const res = await postcss([tailwind()]).process(
      `${source}\n@source inline("${probe.join(" ")}");\n`,
      { from: CSS_PATH }
    );
    compiled = res.css;
    warnings = res.warnings().map((w) => w.text);
    console.log(`    ${ok(true)} compile (${compiled.length} octets)`);
    console.log(`    ${ok(warnings.length === 0)} aucun avertissement PostCSS${warnings.length ? ` (${warnings.length})` : ""}`);
    warnings.slice(0, 5).forEach((w) => console.log(`          ⚠ ${w}`));

    // ---- 4. COMPATIBILITÉ + nouveaux utilitaires ----
    const missing = probe.filter(
      (u) => !new RegExp(`\\.${u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s,{:]`).test(compiled)
    );
    console.log(`\n[4] UTILITAIRES GÉNÉRÉS`);
    console.log(`    ${ok(missing.length === 0)} ${probe.length - missing.length}/${probe.length} générés${missing.length ? ` — manquants : ${missing.join(", ")}` : ""}`);
  } catch (e: any) {
    console.log(`    ${ok(false)} compilation impossible : ${e.message}`);
  }

  // ---- 2. TOKENS DE LA CHARTE ----
  console.log(`\n[2] VALEURS DE LA CHARTE VALIDÉE`);
  const expected: [string, string][] = [
    ["--color-primary", "#0B1F3A"],
    ["--color-success", "#047857"],
    ["--color-warning", "#B45309"],
    ["--color-danger", "#B91C1C"],
    ["--color-ground", "#F8FAFC"],
    ["--color-surface", "#FFFFFF"],
    ["--color-text", "#0F172A"],
    ["--color-text-soft", "#475569"],
    ["--color-text-faint", "#94A3B8"],
    ["--color-rule", "#E2E8F0"],
  ];
  for (const [token, value] of expected) {
    const present = new RegExp(`${token}:\\s*${value};`, "i").test(source);
    console.log(`    ${ok(present)} ${token.padEnd(20)} ${value}`);
  }

  // Une seule famille de gris déclarée dans le socle
  const greyFamilies = ["gray-", "zinc-", "neutral-", "stone-"].filter((f) =>
    new RegExp(`--color-[a-z-]*:\\s*[^;]*${f}`).test(source)
  );
  console.log(`    ${ok(greyFamilies.length === 0)} aucune famille de gris concurrente dans les tokens${greyFamilies.length ? ` (${greyFamilies.join(", ")})` : ""}`);

  // Les variantes sont dérivées, pas écrites en dur
  const derived = ["--color-primary-hover", "--color-primary-active", "--color-accent"];
  for (const d of derived) {
    const decls = [...defs.matchAll(new RegExp(`${d}:\\s*([^;]+);`, "g"))].map((m) => m[1].trim());
    const allDerived = decls.length > 0 && decls.every((v) => /var\(--color-primary\)/.test(v));
    console.log(`    ${ok(allDerived)} ${d.padEnd(22)} dérivé de --color-primary (${decls.length} déclaration·s)`);
  }

  // ---- 3. ÉCHELLES ----
  console.log(`\n[3] ÉCHELLES`);
  const radii = [...defs.matchAll(/--radius-(control|surface|pill):\s*([^;]+);/g)];
  console.log(`    ${ok(radii.length === 3)} 3 rayons : ${radii.map((m) => `${m[1]}=${m[2].trim()}`).join(" · ")}`);

  const shadows = [...defs.matchAll(/--shadow-(card|overlay):\s*/g)];
  console.log(`    ${ok(shadows.length === 2)} 2 ombres : ${shadows.map((m) => m[1]).join(" · ")}`);

  const roles = [...defs.matchAll(/--text-role-(\w+):\s*(\d+)px;/g)];
  console.log(`    ${ok(roles.length === 6)} 6 rôles typographiques : ${roles.map((m) => `${m[1]}=${m[2]}`).join(" · ")}`);

  const sizes = roles.map((m) => Number(m[2]));
  const floor = Math.min(...sizes);
  console.log(`    ${ok(floor >= 12)} plancher typographique = ${floor}px (exigé ≥ 12)`);

  const spacing = defs.match(/--spacing:\s*([\d.]+)rem;/);
  const base = spacing ? Number(spacing[1]) * 16 : 0;
  console.log(`    ${ok(base === 4)} base d'espacement = ${base}px → multiples de 4`);

  // Un seul traitement de surface : pas de verre dépoli ni de dégradé au socle
  const banned = ["backdrop-blur", "backdrop-filter", "linear-gradient", "radial-gradient"];
  // ⚠️ Les COMMENTAIRES sont retirés avant la recherche. Sans cela, le contrôle
  // se déclenchait sur une note qui expliquait pourquoi un dégradé avait été
  // écarté : le garde-fou interdisait d'écrire son propre motif. Une règle qu'on
  // ne peut pas documenter dans le fichier qu'elle protège finit par être
  // contournée faute de pouvoir être expliquée.
  const declarations = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = banned.filter((b) => declarations.includes(b));
  console.log(`    ${ok(found.length === 0)} un seul traitement de surface${found.length ? ` — trouvé : ${found.join(", ")}` : " (ni verre dépoli, ni dégradé)"}`);

  // ---- 5. THÈME ----
  console.log(`\n[5] THÈME PAR ÉTABLISSEMENT`);
  const nullStyle = schoolThemeStyle(null);
  console.log(`    ${ok(nullStyle === undefined)} primaryColor = null → aucune surcharge, charte par défaut`);

  const emptyStyle = schoolThemeStyle("");
  console.log(`    ${ok(emptyStyle === undefined)} primaryColor = "" → aucune surcharge`);

  const custom = schoolThemeStyle("#7C2D12");
  const customOk = !!custom && (custom as any)["--color-primary"] === "#7C2D12";
  console.log(`    ${ok(customOk)} primaryColor = "#7C2D12" → --color-primary surchargée`);

  const short = schoolThemeStyle("#abc");
  console.log(`    ${ok(!!short)} format court "#abc" accepté`);

  console.log(`\n    Valeurs refusées (protection contre l'injection CSS) :`);
  const hostile = [
    "red",
    "#GGGGGG",
    "#0B1F3A; background: url(https://evil.example/x)",
    "var(--x)",
    "rgb(1,2,3)",
    "#0B1F3A}",
    "javascript:alert(1)",
  ];
  for (const h of hostile) {
    const rejected = schoolThemeStyle(h) === undefined && !isValidHexColor(h);
    console.log(`      ${ok(rejected)} ${JSON.stringify(h).slice(0, 52)}`);
  }

  console.log(`\n=== RÉSULTAT : ${fail === 0 ? "socle conforme" : `${fail} ÉCHEC(S)`} ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
