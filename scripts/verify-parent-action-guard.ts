/**
 * Garde d'ÉCRITURE du rôle PARENT — 23 septembre 2026.
 *
 *   npm run script -- scripts/verify-parent-action-guard.ts   (aucune base requise)
 *
 * ⚠️ Faille corrigée : `PARENT` liste `/dashboard/settings$` et
 * `/dashboard/students$` pour OUVRIR ces pages. Les server actions de ces écrans
 * se gardaient avec le même chemin, donc un parent passait `updateSchoolSettings`
 * (cachet, signature), `deleteStudents`, l'import d'élèves…
 *
 * Ce script relit TOUS les chemins passés à `requireActionContext("…")` dans
 * `src/` et vérifie qu'un parent n'en franchit aucun hors de sa liste blanche.
 * Une nouvelle action gardée par un chemin « lisible » par le parent échouera ici.
 */
import { execSync } from "node:child_process";
import { hasAccess } from "../src/lib/permissions";
import { isParentActionPath } from "../src/lib/actionContext";

const lines = execSync(`grep -rhoE 'requireActionContext\\("[^"]+"' src`).toString().trim().split("\n");
const paths = [...new Set(lines.map((l) => l.match(/"([^"]+)"/)![1]))].sort();

let failures = 0;
for (const p of paths) {
  const lecture = hasAccess("PARENT", p);
  const ecriture = lecture && isParentActionPath(p);
  const attendu = p === "/famille" || p.startsWith("/famille/") || p === "/dashboard/documents";
  const ok = ecriture === attendu && (!ecriture || lecture);
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${p.padEnd(44)} lecture=${lecture ? "oui" : "non"}  écriture=${ecriture ? "OUI" : "non"}`);
}

// Les chemins sensibles historiques, testés même s'ils disparaissent du code.
for (const p of ["/dashboard/settings", "/dashboard/students", "/dashboard/grades", "/dashboard/payments", "/dashboard/students/abc123"]) {
  if (isParentActionPath(p)) { failures++; console.log(`✗ ${p} ouvert en écriture au parent`); }
  else console.log(`✓ ${p.padEnd(44)} fermé en écriture au parent`);
}

console.log(failures === 0 ? `\n✓ SUCCÈS : ${paths.length} chemins d'action, aucun ouvert au parent hors liste blanche.` : `\n❌ ÉCHEC : ${failures} défaut(s).`);
process.exit(failures === 0 ? 0 : 1);
