/** Formulaires (sans base) :  npx tsx scripts/verify-formulaires.ts */
import { questionsValides, reponsesValides, peutCreerFormulaire, type Question } from "../src/lib/formulaires";
let e = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) e++; };
const q = questionsValides([
  { type: "choix", titre: "Présent ?", obligatoire: true, options: ["Oui", "Non", "Oui"] },
  { type: "cases", titre: "Créneaux", obligatoire: false, options: ["A", "B"] },
  { type: "echelle", titre: "Note", obligatoire: true },
  { type: "date", titre: "Date", obligatoire: false },
  { type: "long", titre: "Remarque", obligatoire: false, options: ["ignoré"] },
]) as Question[];
ok(Array.isArray(q) && q.length === 5, "questions valides acceptées");
ok(Array.isArray(q) && q[0].options.length === 2, "options en double retirées");
ok(Array.isArray(q) && q[4].options.length === 0, "pas d'options sur un paragraphe");
ok(typeof questionsValides([{ type: "choix", titre: "x", options: ["seul"] }]) === "string", "choix unique : 2 options minimum");
ok(typeof questionsValides([{ type: "script", titre: "x" }]) === "string", "type inconnu refusé");
ok(typeof questionsValides([]) === "string", "formulaire vide refusé");
ok(typeof reponsesValides(q, { q1: "Oui", q3: "4" }) === "object", "réponse complète acceptée");
ok(typeof reponsesValides(q, { q3: "4" }) === "string", "obligatoire manquant refusé");
ok(typeof reponsesValides(q, { q1: "Peut-être", q3: "4" }) === "string", "option inventée refusée");
ok(typeof reponsesValides(q, { q1: "Oui", q3: "9" }) === "string", "note hors 1-5 refusée");
const r = reponsesValides(q, { q1: "Oui", q2: ["A", "Z"], q3: "5", q4: "2026-10-04", q5: "x".repeat(5000) }) as Record<string, unknown>;
ok(JSON.stringify(r.q2) === '["A"]' && String(r.q5).length === 3000, "cases filtrées, texte tronqué");
ok(peutCreerFormulaire("SECRETARY") && peutCreerFormulaire("TEACHER") && !peutCreerFormulaire("PARENT") && !peutCreerFormulaire("ACCOUNTANT"), "qui crée : direction, secrétariat, enseignants");
console.log(e ? `\n${e} échec(s)` : "\nTout est bon."); process.exit(e ? 1 : 0);
