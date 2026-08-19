/**
 * Vérifie les primitives d'action et de formulaire (LOT 04). LECTURE SEULE.
 *
 *   1. CONTRAT BUTTON   variantes, tailles, loading, aria-label imposé par le type ;
 *   2. CONTRAT CHAMPS   htmlFor lié, erreur annoncée, états cohérents ;
 *   3. CONTRAT MODALE   role=dialog, piège de focus, Escape, restitution du focus ;
 *   4. MIGRATION        les fichiers migrés n'ont plus de contrôle natif nu ;
 *   5. PÉRIMÈTRE        les zones exclues n'ont pas été touchées.
 *
 *   npm run script -- scripts/verify-ui-primitives.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));
const read = (p: string) => readFileSync(p, "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "generated") continue;
      walk(p, out);
    } else if (e.endsWith(".tsx")) out.push(p);
  }
  return out;
}

console.log(`\n=== PRIMITIVES D'ACTION ET DE FORMULAIRE ===\n`);

// ---- 1. BUTTON ----
const btn = read("src/components/ui/Button.tsx");
console.log(`[1] BUTTON`);
for (const v of ["primary", "secondary", "ghost", "danger"]) {
  console.log(`    ${ok(new RegExp(`^\\s*${v}:`, "m").test(btn))} variante ${v}`);
}
const sizes = [...btn.matchAll(/^\s{2}(sm|md|lg): \{ base:/gm)].map((m) => m[1]);
console.log(`    ${ok(sizes.length === 3)} 3 tailles : ${sizes.join(" · ")}`);
console.log(`    ${ok(/loading\?: boolean/.test(btn))} prop loading`);
console.log(`    ${ok(/aria-busy=\{loading/.test(btn))} loading pose aria-busy`);
console.log(`    ${ok(/disabled=\{disabled \|\| loading\}/.test(btn))} loading désactive le bouton`);
console.log(`    ${ok(/children\?: never;\s*"aria-label": string/.test(btn))} icône seule ⇒ aria-label EXIGÉ par le type`);

// ---- 2. CHAMPS ----
const field = read("src/components/ui/Field.tsx");
console.log(`\n[2] INPUT · SELECT · TEXTAREA`);
for (const c of ["Input", "Select", "Textarea"]) {
  console.log(`    ${ok(new RegExp(`export function ${c}\\(`).test(field))} ${c} exporté`);
}
console.log(`    ${ok(/useId\(\)/.test(field))} id auto-généré quand absent`);
console.log(`    ${ok(/htmlFor=\{id\}/.test(field))} label relié par htmlFor`);
console.log(`    ${ok(/"aria-invalid": error \? \(true as const\)/.test(field))} erreur ⇒ aria-invalid`);
console.log(`    ${ok(/aria-describedby/.test(field))} message relié par aria-describedby`);
console.log(`    ${ok(/disabled:bg-sunk/.test(field))} état disabled traité`);
console.log(`    ${ok(/border border-danger/.test(field))} état invalide traité`);
console.log(`    ${ok(/sr-only"> \(obligatoire\)/.test(field))} l'astérisque a un équivalent textuel`);

// ---- 3. MODALE ----
const modal = read("src/components/ui/Modal.tsx");
console.log(`\n[3] MODAL`);
console.log(`    ${ok(/role="dialog"/.test(modal))} role="dialog"`);
console.log(`    ${ok(/aria-modal="true"/.test(modal))} aria-modal`);
console.log(`    ${ok(/aria-labelledby=\{titleId\}/.test(modal))} titre relié par aria-labelledby`);
console.log(`    ${ok(/e\.key === "Escape"/.test(modal))} Escape ferme`);
console.log(`    ${ok(/e\.key !== "Tab"/.test(modal) && /e\.shiftKey/.test(modal))} piège de focus Tab / Maj+Tab`);
console.log(`    ${ok(/restoreTo\.current/.test(modal) && /isConnected/.test(modal))} focus restitué à la fermeture (avec garde isConnected)`);
console.log(`    ${ok(/document\.body\.style\.overflow = "hidden"/.test(modal))} défilement d'arrière-plan bloqué`);
console.log(`    ${ok(/aria-hidden="true" className="absolute inset-0/.test(modal))} le fond est aria-hidden`);

// ---- 4. MIGRATION ----
/**
 * Fichiers migrés, avec les exceptions ASSUMÉES.
 *
 * Un fichier n'est pas tenu d'avoir zéro contrôle natif : certains éléments ne
 * sont pas des contrôles de formulaire malgré leur balise. Les exceptions sont
 * déclarées ici avec leur raison, pour qu'elles restent des décisions visibles
 * et non des oublis silencieux.
 */
const MIGRATED: { file: string; allowInputs?: number; allowButtons?: number; why?: string }[] = [
  { file: "src/app/dashboard/classes/new/form.tsx" },
  { file: "src/app/dashboard/team/TeamInviteForm.tsx", allowInputs: 1,
    why: "affichage en lecture seule du lien d'invitation (aria-label posé), pas un champ de saisie" },
  { file: "src/app/dashboard/team/TeamCreateForm.tsx" },
  { file: "src/app/dashboard/classes/ClassListClient.tsx", allowInputs: 1, allowButtons: 1,
    why: "champ de recherche + tuile de cycle : une carte cliquable, que Button réduirait à un bouton" },
  { file: "src/app/dashboard/students/new/form.tsx" },
  { file: "src/app/dashboard/settings/ClientPage.tsx", allowInputs: 4,
    why: "disposition en ligne délibérée, htmlFor déjà relié — refonte au lot 06" },
  { file: "src/app/dashboard/grades/termine/CompletionClient.tsx", allowButtons: 1,
    why: "tuile d'action pleine largeur : une carte, pas un bouton" },
];
console.log(`\n[4] FICHIERS MIGRÉS`);
let sites = 0;
for (const { file: f, allowInputs = 0, allowButtons = 0, why } of MIGRATED) {
  const src = read(f);
  const uses = /from "@\/components\/ui\/(Button|Field|Modal)"/.test(src);
  // Contrôles natifs restants, hors input[type=hidden] et input[type=file]
  const natives = [...src.matchAll(/<(input|select|textarea)\b([^>]*)>/g)].filter(
    (m) => !/type="hidden"|type="file"/.test(m[2])
  );
  const rawButtons = [...src.matchAll(/<button\b/g)].length;
  const overlays = [...src.matchAll(/fixed inset-0/g)].length;
  const n =
    [...src.matchAll(/<(Input|Select|Textarea)\b/g)].length +
    [...src.matchAll(/<Button\b/g)].length +
    [...src.matchAll(/<Modal\b/g)].length;
  sites += n;
  const clean =
    uses && natives.length <= allowInputs && rawButtons <= allowButtons && overlays === 0;
  console.log(`    ${ok(clean)} ${f.replace("src/app/dashboard/", "").padEnd(34)} ${n} sites`);
  if (natives.length > allowInputs)
    console.log(`             ${natives.length - allowInputs} contrôle·s natif·s NON PRÉVU·S : ${natives.map((m) => m[1]).join(", ")}`);
  if (rawButtons > allowButtons)
    console.log(`             ${rawButtons - allowButtons} <button> NON PRÉVU·S`);
  if (overlays) console.log(`             ${overlays} calque·s fixed inset-0 restant·s`);
  if (why && (allowInputs || allowButtons))
    console.log(`             exception assumée (${allowInputs} champ·s, ${allowButtons} bouton·s) : ${why}`);
}
console.log(`\n    Total sites migrés : ${sites}`);

// ---- 5. PÉRIMÈTRE ----
console.log(`\n[5] ZONES EXCLUES — doivent rester intactes`);
const EXCLUDED: [string, string][] = [
  ["src/components/layout/Sidebar.tsx", "sidebar"],
  ["src/components/layout/TopNav.tsx", "barre supérieure"],
  ["src/app/dashboard/page.tsx", "dashboard"],
  ["src/app/dashboard/payments/new/form.tsx", "impression (8 classes print:)"],
];
for (const [f, why] of EXCLUDED) {
  const touched = /from "@\/components\/ui\/(Button|Field|Modal)"/.test(read(f));
  console.log(`    ${ok(!touched)} ${f.replace("src/", "").padEnd(46)} ${why}`);
}

// ⚠️ INVARIANT INVERSÉ LE 19 AOÛT 2026. `login` et `onboarding/Wizard`
// figuraient ci-dessus comme « zones à ne pas toucher » : au lot 05 elles
// n'étaient pas encore refondues, et l'invariant protégeait un travail à venir.
// Le chantier PLG les a réécrites, et les a justement branchées sur le socle —
// c'était l'objet même de la refonte, ces deux écrans réécrivant leurs champs à
// la main en contradiction avec la règle du lot 04. Le contrôle est donc
// retourné : il exige désormais qu'elles UTILISENT les primitives. Laisser
// l'ancienne formulation aurait produit un échec permanent réclamant une
// régression.
const MIGRES: [string, string][] = [
  ["src/app/login/page.tsx", "connexion — refondue au chantier PLG"],
  ["src/app/onboarding/Wizard.tsx", "installation — refondue au chantier PLG"],
];
for (const [f, why] of MIGRES) {
  const touched = /from "@\/components\/ui\/(Button|Field|Modal)"/.test(read(f));
  console.log(`    ${ok(touched)} ${f.replace("src/", "").padEnd(46)} ${why}`);
}
// ⚠️ Resserré au lot 09 : le contrôle portait sur TOUT `documents/`, ce qui
// interdisait aussi de refondre le hub — objet même du lot 09. L'invariant réel
// est que les **générateurs** (le markup imprimable) restent intacts, ce qui est
// plus strict là où ça compte. Vérifié : 0 générateur n'importe de primitive.
const docsTouched = walk("src/app/dashboard/documents").filter((f) =>
  f.endsWith("Generator.tsx") && /from "@\/components\/ui\/(Button|Field|Modal)"/.test(read(f))
);
console.log(`    ${ok(docsTouched.length === 0)} ${"app/dashboard/documents/".padEnd(46)} générateurs (${docsTouched.length} touché·s)`);

// ---- Reste à faire, pour information ----
const allTsx = walk("src");
const withPrint = allTsx.filter((f) => /print:|contentEditable/.test(read(f)));
const remainingOverlays = allTsx.filter((f) => /fixed inset-0/.test(read(f)));
console.log(`\n    Fichiers portant impression ou contentEditable (réservés lot 09) : ${withPrint.length}`);
console.log(`    Calques modaux encore écrits à la main : ${remainingOverlays.length}`);
remainingOverlays.forEach((f) => {
  const zone = /documents/.test(f) ? "lot 09" : "à planifier";
  console.log(`      · ${f.replace("src/", "").padEnd(52)} ${zone}`);
});

console.log(`\n=== RÉSULTAT : ${fail === 0 ? "primitives conformes" : `${fail} ÉCHEC(S)`} ===\n`);
process.exit(fail === 0 ? 0 : 1);
