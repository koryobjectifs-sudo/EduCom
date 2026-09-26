/**
 * Vérifie la lecture automatique des résultats (`src/lib/interpretation.ts`).
 * Aucune base nécessaire : npx tsx scripts/verify-interpretation.ts
 */
import { lireParticipation, lireChoix, lireEchelle, lireNps, motsFrequents, lireFormulaire, lireRythme } from "../src/lib/interpretation";

let ok = 0;
let ko = 0;
function verifier(nom: string, cond: boolean, detail?: unknown) {
  if (cond) ok++;
  else {
    ko++;
    console.error(`✗ ${nom}`, detail ?? "");
  }
}

// Participation
verifier("participation excellente", lireParticipation(80, 100).niveau === "excellente");
verifier("participation faible = alerte", lireParticipation(10, 100).constat.ton === "alerte");
verifier("participation sans destinataires", lireParticipation(5, 0).niveau === "inconnue");

// Choix
const net = lireChoix([{ label: "A", votes: 7 }, { label: "B", votes: 2 }, { label: "C", votes: 1 }], 10);
verifier("nette majorité", net.verdict === "nette-majorite", net);
verifier("classement trié", net.classement[0].label === "A" && net.classement[0].part === 70);
verifier("égalité", lireChoix([{ label: "A", votes: 4 }, { label: "B", votes: 4 }], 8).verdict === "egalite");
verifier("partagé", lireChoix([{ label: "A", votes: 4 }, { label: "B", votes: 4 - 0 + 0 }, { label: "C", votes: 1 }], 9).verdict === "egalite");
verifier("coude à coude", lireChoix([{ label: "A", votes: 5 }, { label: "B", votes: 4 }, { label: "C", votes: 3 }], 12).verdict === "partage");
verifier("trop tôt", lireChoix([{ label: "A", votes: 2 }, { label: "B", votes: 0 }], 2).verdict === "trop-tot");
verifier("unanime", lireChoix([{ label: "A", votes: 19 }, { label: "B", votes: 1 }], 20).verdict === "unanime");
const multi = lireChoix([{ label: "Foot", votes: 6 }, { label: "Théâtre", votes: 3 }], 8, true);
verifier("choix multiples : part sur les répondants", multi.classement[0].part === 75, multi);

// Échelle
const e = lireEchelle([5, 5, 4, 4, 3]);
verifier("échelle moyenne", Math.abs((e.moyenne ?? 0) - 4.2) < 1e-9);
verifier("échelle satisfaits", e.satisfaits === 80 && e.mecontents === 0);
verifier("échelle positive", e.constat?.ton === "positif");
verifier("échelle basse = alerte", lireEchelle([1, 2, 1, 2, 3]).constat?.ton === "alerte");
verifier("échelle polarisée", lireEchelle([1, 1, 1, 5, 5, 5]).phrase.startsWith("Avis très tranchés"));
verifier("échelle ignore valeurs invalides", lireEchelle([0, 6, 3]).n === 1);
verifier("échelle sous le seuil : pas de constat", lireEchelle([5, 5]).constat === null);

// NPS
const n = lireNps([10, 9, 9, 8, 7, 3, 10, 6]);
verifier("nps score", n.score === 50 - 25, n);
verifier("nps groupes = 100", n.promoteurs + n.passifs + n.detracteurs === 100);
verifier("nps négatif = alerte", lireNps([1, 2, 3, 9]).constat?.ton === "alerte");

// Mots
const mots = motsFrequents(["La cantine est trop chère", "cantine chère et bruyante", "Les cantines sont bonnes", "Trop de bruit à la cantine", "prix de la cantine", "rien"]);
verifier("mots : cantine en tête", mots[0]?.mot.startsWith("cantine") && mots[0].n === 5, mots);
verifier("mots : mots vides retirés", !mots.some((m) => ["la", "est", "trop", "les"].includes(m.mot)), mots);

// Rythme
const r = lireRythme(["2026-09-20T10:00:00Z", "2026-09-20T12:00:00Z", "2026-09-21T09:00:00Z"], "2026-09-20T08:00:00Z");
verifier("rythme : médiane 4 h", r.heuresMediane === 4, r);
verifier("rythme : 2 jours", r.parJour.length === 2);

// Formulaire complet
const questions = [
  { id: "q1", type: "echelle", titre: "Enseignement", options: [] },
  { id: "q2", type: "echelle", titre: "Cantine", options: [] },
  { id: "q3", type: "choix", titre: "Réunion", options: ["Samedi", "Mercredi"] },
  { id: "q4", type: "nps", titre: "Recommandation", options: [] },
  { id: "q5", type: "long", titre: "Suggestion", options: [] },
];
const rep = (a: Record<string, string>, profil: string) => ({ answers: a, profil, date: "2026-09-21T10:00:00Z" });
const reponses = [
  rep({ q1: "5", q2: "2", q3: "Samedi", q4: "10", q5: "la cantine doit changer" }, "Parent"),
  rep({ q1: "5", q2: "1", q3: "Samedi", q4: "9", q5: "cantine froide" }, "Parent"),
  rep({ q1: "4", q2: "2", q3: "Samedi", q4: "9", q5: "améliorer la cantine" }, "Parent"),
  rep({ q1: "4", q2: "4", q3: "Mercredi", q4: "7", q5: "" }, "Enseignant"),
];
const l = lireFormulaire(questions, reponses, 5, "2026-09-20T08:00:00Z");
verifier("formulaire : participation 80 %", l.participation.taux === 80);
verifier("formulaire : point fort = Enseignement", l.aRetenir.some((c) => c.titre === "Point fort" && c.texte.includes("Enseignement")), l.aRetenir);
verifier("formulaire : piste = Cantine", l.aRetenir.some((c) => c.titre === "Piste d'amélioration" && c.texte.includes("Cantine")), l.aRetenir);
verifier("formulaire : indice", l.indice === Math.round(((((4.5 + 2.25) / 2) - 1) / 4) * 100), l.indice);
verifier("formulaire : au plus 6 constats", l.aRetenir.length <= 6);
verifier("formulaire : question vide ignorée", l.questions.q5.n === 3);

console.log(`${ok} vérifications OK, ${ko} échec(s).`);
process.exit(ko ? 1 : 0);
