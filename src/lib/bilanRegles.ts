/**
 * Bilan de la semaine — règles pures (26 sept. 2026, v2 : observations).
 * Aucune base ici : utilisable côté écran et testé par
 * `scripts/verify-bilan-semaine.ts`.
 *
 * ═══ RÈGLES (seule autorité) ═══
 * L'enseignant note des OBSERVATIONS au fil de la semaine : un élève, une
 *   matière, un jour, « à travailler » ou « point fort », sur quoi précisément
 *   (phonétique, grammaire…), une note éventuelle, une action pour la maison.
 *   Deux sujets spéciaux : leçons non sues (LECONS), devoirs non faits (DEVOIRS).
 * Récapitulatif de la semaine, par matière, avec les notes de la semaine.
 * Verdict : rien à travailler → Compétent ; une matière à travailler, ou
 *   leçons / devoirs → En progrès ; deux matières ou plus → Besoin d'aide.
 *   Aucune observation → pas de verdict. L'enseignant peut le changer.
 * Actions : celles des observations « à travailler » (ou la suggestion de la
 *   matière), une par matière, 5 au plus, leçons et devoirs toujours gardés.
 */
export type Verdict = "COMPETENT" | "PROGRES" | "AIDE";
export type TypeObservation = "TRAVAIL" | "FORT";

export const VERDICTS: Record<Verdict, { emoji: string; libelle: string }> = {
  COMPETENT: { emoji: "🟢", libelle: "Compétent" },
  PROGRES: { emoji: "🟡", libelle: "En progrès" },
  AIDE: { emoji: "🔴", libelle: "Besoin d'aide" },
};
export const estVerdict = (v: unknown): v is Verdict => v === "COMPETENT" || v === "PROGRES" || v === "AIDE";

export const SUJETS_SPECIAUX = {
  LECONS: "Leçons non apprises",
  DEVOIRS: "Devoirs non faits",
  GENERAL: "Comportement / général",
} as const;
export const estSpecial = (cle: string) => cle === "LECONS" || cle === "DEVOIRS" || cle === "GENERAL";

/** Lundi 00:00 UTC de la semaine d'une date (le Sénégal est à UTC+0). */
export function lundiDe(d: Date = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}
export const jourDe = (d: Date = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export function libelleSemaine(lundi: Date): string {
  const vendredi = new Date(lundi.getTime() + 4 * 86400_000);
  const f = (d: Date, mois: boolean) => d.toLocaleDateString("fr-FR", { day: "numeric", ...(mois ? { month: "long" } : {}), timeZone: "UTC" });
  return `du ${f(lundi, lundi.getUTCMonth() !== vendredi.getUTCMonth())} au ${f(vendredi, true)}`;
}
export const libelleJour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });

/* ═══════════════════════ Suggestions par matière ═══════════════════════ */

export const normaliser = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const PROFILS: { mots: string[]; action: string; points: string[] }[] = [
  { mots: ["espagnol", "anglais", "english", "arabe", "allemand", "lv2", "lv1", "langue vivante"], action: "Relire le vocabulaire de la semaine et le lui faire répéter à voix haute.", points: ["vocabulaire", "grammaire", "conjugaison", "phonétique", "compréhension orale", "expression écrite"] },
  { mots: ["lecture"], action: "Lire 15 minutes à voix haute chaque soir, puis lui poser 2 questions sur le texte.", points: ["déchiffrage", "fluidité", "compréhension", "articulation"] },
  { mots: ["dictee", "orthographe"], action: "Faire une petite dictée de 5 phrases et corriger ensemble.", points: ["orthographe d'usage", "accords", "homophones", "ponctuation"] },
  { mots: ["francais", "langue", "communication", "grammaire", "conjugaison", "vocabulaire", "expression", "redaction", "production"], action: "Lire 15 minutes à voix haute chaque soir et revoir la règle de grammaire du jour.", points: ["grammaire", "conjugaison", "orthographe", "vocabulaire", "expression écrite", "compréhension de texte"] },
  { mots: ["math", "calcul", "numeration", "geometrie", "mesure", "arithmetique"], action: "10 minutes de calcul mental ou de tables chaque jour du week-end.", points: ["tables", "calcul mental", "fractions", "problèmes", "géométrie", "équations"] },
  { mots: ["physique", "chimie", "svt", "science", "eveil", "technologie", "biologie"], action: "Relire la leçon avec lui et lui demander de l'expliquer avec ses mots.", points: ["leçon", "schéma", "vocabulaire scientifique", "expériences", "exercices"] },
  { mots: ["histoire", "geographie", "civique", "citoyennete"], action: "Relire la leçon et retrouver ensemble les dates ou les lieux importants.", points: ["dates", "cartes", "vocabulaire", "leçon"] },
  { mots: ["eps", "physique et sportive", "sport"], action: "L'encourager à bouger 20 minutes par jour et vérifier sa tenue de sport.", points: ["tenue", "participation", "endurance"] },
  { mots: ["coran", "religieuse", "islamique", "arabe coranique"], action: "Réviser ensemble la sourate ou la leçon de la semaine.", points: ["récitation", "mémorisation", "lecture"] },
];
export const ACTION_LECONS = "Faire réciter la leçon chaque soir avant le coucher.";
export const ACTION_DEVOIRS = "Vérifier le cahier de textes et s'assurer que les devoirs sont faits avant lundi.";

function profil(nom: string) {
  const n = normaliser(nom);
  return PROFILS.find((p) => p.mots.some((m) => n.includes(m)));
}

export function actionMatiere(nom: string, perso: Record<string, string> = {}, cle?: string): string {
  if (cle === "LECONS") return perso.LECONS?.trim() || ACTION_LECONS;
  if (cle === "DEVOIRS") return perso.DEVOIRS?.trim() || ACTION_DEVOIRS;
  const n = normaliser(nom);
  if (perso[n]?.trim()) return perso[n].trim();
  return profil(nom)?.action ?? `Revoir avec lui ce qui a été vu en ${nom} cette semaine.`;
}

/** Points proposés pour une matière : ceux déjà utilisés par l'école d'abord, puis les suggestions. */
export function pointsSuggeres(nom: string, dejaUtilises: string[] = []): string[] {
  const base = profil(nom)?.points ?? [];
  return [...new Set([...dejaUtilises, ...base].map((x) => x.trim()).filter(Boolean))].slice(0, 12);
}

/* ═══════════════════════ Récapitulatif ═══════════════════════ */

export type ObservationVue = {
  id: string;
  studentId: string;
  subjectKey: string;
  subjectName: string;
  date: string;
  kind: TypeObservation;
  topics: string[];
  note: { libelle: string; valeur: number; max: number } | null;
  action: string | null;
  commentaire: string | null;
  auteur: string;
  estAMoi: boolean;
  prevenu: boolean;
};
export type NoteSemaine = { subjectKey: string; matiere: string; libelle: string; valeur: number; max: number };
export type ActionBilan = { sujet: string; texte: string };

export type MatiereRecap = {
  nom: string;
  statut: TypeObservation;
  points: string[];
  notes: string[];
  commentaires: string[];
  action: string | null;
};

export type SnapshotBilan = {
  v: 2;
  semaine: string;
  eleve: string;
  classe: string;
  enseignant: string;
  verdict: Verdict | null;
  matieres: MatiereRecap[];
  leconsNonSues: string[];
  devoirsNonFaits: string[];
  actions: ActionBilan[];
  commentaire: string | null;
};

export const formaterNote = (v: number, max: number) => `${Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")}/${max}`;
const jourCourt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", timeZone: "UTC" });

export function verdictCalcule(obs: Pick<ObservationVue, "subjectKey" | "kind">[]): Verdict | null {
  if (!obs.length) return null;
  const aTravailler = new Set(obs.filter((o) => o.kind === "TRAVAIL" && !estSpecial(o.subjectKey)).map((o) => o.subjectKey));
  const speciaux = obs.some((o) => o.kind === "TRAVAIL" && (o.subjectKey === "LECONS" || o.subjectKey === "DEVOIRS" || o.subjectKey === "GENERAL"));
  if (aTravailler.size >= 2) return "AIDE";
  if (aTravailler.size === 1 || speciaux) return "PROGRES";
  return "COMPETENT";
}

/** Ce que reçoit le parent. null si rien : aucune observation, aucune note, aucun commentaire. */
export function construireRecap(params: {
  semaine: string;
  eleve: string;
  classe: string;
  enseignant: string;
  observations: ObservationVue[];
  notes: NoteSemaine[];
  verdictChoisi: Verdict | null;
  commentaire: string | null;
  perso?: Record<string, string>;
}): SnapshotBilan | null {
  const { observations: obs, notes, perso = {} } = params;
  const commentaire = params.commentaire?.trim() || null;
  if (!obs.length && !notes.length && !commentaire) return null;

  const cles = [...new Set([...obs.filter((o) => !estSpecial(o.subjectKey)).map((o) => o.subjectKey), ...notes.map((n) => n.subjectKey)])];
  const matieres: MatiereRecap[] = cles.map((cle) => {
    const o = obs.filter((x) => x.subjectKey === cle);
    const n = notes.filter((x) => x.subjectKey === cle);
    const nom = o[0]?.subjectName ?? n[0]?.matiere ?? "Matière";
    const travail = o.filter((x) => x.kind === "TRAVAIL");
    // Notes : celles des observations, puis celles de la semaine non déjà citées.
    const notesObs = o.filter((x) => x.note).map((x) => `${x.note!.libelle} ${formaterNote(x.note!.valeur, x.note!.max)}`);
    const notesSemaine = n.map((x) => `${x.libelle} ${formaterNote(x.valeur, x.max)}`).filter((t) => !notesObs.includes(t));
    const sur20 = n.filter((x) => x.max > 0).map((x) => (x.valeur / x.max) * 20);
    const faibleSansObs = !o.length && sur20.length > 0 && sur20.reduce((t, v) => t + v, 0) / sur20.length < 10;
    const statut: TypeObservation = travail.length || faibleSansObs ? "TRAVAIL" : "FORT";
    return {
      nom,
      statut,
      points: [...new Set((statut === "TRAVAIL" ? travail : o).flatMap((x) => x.topics))],
      notes: [...notesObs, ...notesSemaine],
      commentaires: o.map((x) => x.commentaire).filter((c): c is string => Boolean(c)),
      action: statut === "TRAVAIL" ? travail.find((x) => x.action)?.action ?? actionMatiere(nom, perso) : null,
    };
  });
  // À travailler d'abord.
  matieres.sort((a, b) => (a.statut === b.statut ? a.nom.localeCompare(b.nom, "fr") : a.statut === "TRAVAIL" ? -1 : 1));

  const jours = (cle: string) => [...new Set(obs.filter((o) => o.subjectKey === cle && o.kind === "TRAVAIL").map((o) => jourCourt(o.date)))];
  const leconsNonSues = jours("LECONS");
  const devoirsNonFaits = jours("DEVOIRS");

  const fin: ActionBilan[] = [];
  if (leconsNonSues.length) fin.push({ sujet: SUJETS_SPECIAUX.LECONS, texte: obs.find((o) => o.subjectKey === "LECONS" && o.action)?.action ?? actionMatiere("", perso, "LECONS") });
  if (devoirsNonFaits.length) fin.push({ sujet: SUJETS_SPECIAUX.DEVOIRS, texte: obs.find((o) => o.subjectKey === "DEVOIRS" && o.action)?.action ?? actionMatiere("", perso, "DEVOIRS") });
  const parMatiere = matieres.filter((m) => m.action).map((m) => ({ sujet: m.nom, texte: m.action! }));
  const actions = [...parMatiere.slice(0, Math.max(0, 5 - fin.length)), ...fin];

  const verdictObs = verdictCalcule(obs);
  const verdictNotes = matieres.some((m) => m.statut === "TRAVAIL") ? (matieres.filter((m) => m.statut === "TRAVAIL").length >= 2 ? "AIDE" : "PROGRES") : matieres.length ? "COMPETENT" : null;
  const rang = { COMPETENT: 0, PROGRES: 1, AIDE: 2 } as const;
  const auto = [verdictObs, verdictNotes].filter((v): v is Verdict => v !== null).sort((a, b) => rang[b] - rang[a])[0] ?? null;

  return {
    v: 2,
    semaine: params.semaine,
    eleve: params.eleve,
    classe: params.classe,
    enseignant: params.enseignant,
    verdict: params.verdictChoisi ?? auto,
    matieres,
    leconsNonSues,
    devoirsNonFaits,
    actions,
    commentaire,
  };
}
