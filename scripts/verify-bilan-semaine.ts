/**
 * Bilan de la semaine (v2, observations) — règles pures, sans base.
 * npx tsx scripts/verify-bilan-semaine.ts
 */
import { lundiDe, jourDe, verdictCalcule, actionMatiere, pointsSuggeres, construireRecap, ACTION_LECONS, type ObservationVue } from "../src/lib/bilanRegles";

let ko = 0;
const ok = (nom: string, c: boolean, d?: unknown) => {
  if (!c) {
    ko++;
    console.error("✗", nom, d ?? "");
  }
};

ok("lundi d'un vendredi", lundiDe(new Date("2026-09-25T15:00:00Z")).toISOString() === "2026-09-21T00:00:00.000Z");
ok("lundi d'un dimanche", lundiDe(new Date("2026-09-27T10:00:00Z")).toISOString() === "2026-09-21T00:00:00.000Z");
ok("jour", jourDe(new Date("2026-09-25T15:00:00Z")).toISOString() === "2026-09-25T00:00:00.000Z");

const o = (p: Partial<ObservationVue>): ObservationVue => ({
  id: Math.random().toString(),
  studentId: "e",
  subjectKey: "esp",
  subjectName: "Espagnol",
  date: "2026-09-22T00:00:00.000Z",
  kind: "TRAVAIL",
  topics: [],
  note: null,
  action: null,
  commentaire: null,
  auteur: "M. Diop",
  estAMoi: true,
  prevenu: false,
  ...p,
});

// Verdict
ok("rien → pas de verdict", verdictCalcule([]) === null);
ok("points forts seuls → compétent", verdictCalcule([o({ kind: "FORT" })]) === "COMPETENT");
ok("une matière à travailler → en progrès", verdictCalcule([o({}), o({})]) === "PROGRES");
ok("leçons non sues → en progrès", verdictCalcule([o({ kind: "FORT" }), o({ subjectKey: "LECONS" })]) === "PROGRES");
ok("deux matières → besoin d'aide", verdictCalcule([o({}), o({ subjectKey: "ma" })]) === "AIDE");

// Suggestions
ok("espagnol : phonétique proposée", pointsSuggeres("Espagnol").includes("phonétique"));
ok("points déjà utilisés en tête", pointsSuggeres("Espagnol", ["ser/estar"])[0] === "ser/estar");
ok("action langue", actionMatiere("Espagnol").includes("vocabulaire"));
ok("action maths", actionMatiere("Mathématiques").includes("calcul mental"));
ok("action personnalisée", actionMatiere("Espagnol", { espagnol: "Écouter une chanson" }) === "Écouter une chanson");
ok("action leçons", actionMatiere("", {}, "LECONS") === ACTION_LECONS);

// Récapitulatif
const r = construireRecap({
  semaine: "du 21 au 25 septembre",
  eleve: "Awa Diop",
  classe: "4e",
  enseignant: "M. Ndiaye",
  observations: [
    o({ topics: ["phonétique", "grammaire"], note: { libelle: "Devoir", valeur: 9, max: 20 }, action: "Relire le vocabulaire" }),
    o({ subjectKey: "ma", subjectName: "Mathématiques", kind: "FORT", topics: ["fractions"] }),
    o({ subjectKey: "LECONS", subjectName: "Leçons non apprises", date: "2026-09-23T00:00:00.000Z" }),
  ],
  notes: [
    { subjectKey: "ma", matiere: "Mathématiques", libelle: "Interro", valeur: 16, max: 20 },
    { subjectKey: "esp", matiere: "Espagnol", libelle: "Devoir", valeur: 9, max: 20 },
  ],
  verdictChoisi: null,
  commentaire: null,
});
ok("récap produit", r !== null);
ok("espagnol à travailler en premier", r?.matieres[0].nom === "Espagnol" && r.matieres[0].statut === "TRAVAIL", r?.matieres);
ok("points précis gardés", r?.matieres[0].points.join() === "phonétique,grammaire");
ok("note non dupliquée", r?.matieres[0].notes.join() === "Devoir 9/20", r?.matieres[0].notes);
ok("maths point fort avec sa note", r?.matieres[1].statut === "FORT" && r.matieres[1].notes.includes("Interro 16/20"), r?.matieres[1]);
ok("leçons : jour cité", r?.leconsNonSues.join() === "mercredi", r?.leconsNonSues);
ok("action de l'enseignant reprise", r?.actions[0].texte === "Relire le vocabulaire", r?.actions);
ok("action leçons ajoutée", r?.actions.some((a) => a.texte === ACTION_LECONS));
ok("verdict en progrès", r?.verdict === "PROGRES");
ok("verdict imposé", construireRecap({ semaine: "", eleve: "", classe: "", enseignant: "", observations: [o({})], notes: [], verdictChoisi: "AIDE", commentaire: null })?.verdict === "AIDE");
ok("note faible sans observation → à travailler", construireRecap({ semaine: "", eleve: "", classe: "", enseignant: "", observations: [], notes: [{ subjectKey: "x", matiere: "SVT", libelle: "Devoir", valeur: 6, max: 20 }], verdictChoisi: null, commentaire: null })?.matieres[0].statut === "TRAVAIL");
ok("rien → pas d'envoi", construireRecap({ semaine: "", eleve: "", classe: "", enseignant: "", observations: [], notes: [], verdictChoisi: null, commentaire: " " }) === null);
ok("5 actions au plus", (construireRecap({
  semaine: "", eleve: "", classe: "", enseignant: "",
  observations: ["a", "b", "c", "d", "e", "f"].map((k) => o({ subjectKey: k, subjectName: k.toUpperCase() })).concat([o({ subjectKey: "LECONS" }), o({ subjectKey: "DEVOIRS" })]),
  notes: [], verdictChoisi: null, commentaire: null,
})?.actions.length ?? 0) === 5);

console.log(ko ? `${ko} échec(s)` : "Tout est bon.");
process.exit(ko ? 1 : 0);
