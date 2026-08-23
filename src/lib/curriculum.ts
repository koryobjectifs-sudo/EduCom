/**
 * **Le programme sénégalais préconfiguré — proposé, jamais imposé.**
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * Le programme vivait dans `scripts/seed-subjects.ts`, donc dans un script que
 * seul un développeur peut lancer, avec `SCHOOL_ID` en variable d'environnement.
 * Une école qui s'inscrit n'a pas de développeur. Le contenu remonte donc ici,
 * dans un module que **l'application ET le script** importent — une seule
 * définition, deux consommateurs, aucune divergence possible.
 *
 * ⚠️ **Ce module n'importe rien.** Ni Prisma, ni `process.env`, ni React. C'est
 * la même discipline que `src/lib/bulletin.ts` : un composant `"use client"`
 * peut l'importer pour afficher ce qui sera créé AVANT que quoi que ce soit ne
 * le soit. L'écriture, elle, vit dans `src/lib/pedagogy.ts`.
 *
 * ═══ CE QUI EST UN STANDARD, ET CE QUI NE L'EST PAS ═══
 *
 * ✅ **Sont des standards** — vérifiés contre les quatre bulletins réels
 * analysés le 17 août (Groupe Scolaire PIA, Ker Rokhaya, Lycée de Popenguine) :
 * la découpe du français et des mathématiques en sous-matières à l'élémentaire,
 * l'année en trois trimestres, une composition par trimestre.
 *
 * ❌ **NE SONT PAS des standards**, et ne sont donc préconfigurés nulle part :
 *
 *   · **Les coefficients.** Recherche menée : ni education.sn ni le programme
 *     officiel de l'élémentaire ne publient de table de coefficients par
 *     discipline, et `planete.education.sn` est derrière authentification.
 *     Surtout, les quatre bulletins réels portent des pondérations
 *     DIFFÉRENTES pour les mêmes matières — « COMPOSITION FR » à coef 2 chez
 *     l'un, trois lignes de français à coef 1 chez l'autre. Tout arrive donc à
 *     1, et l'école ajuste. Inventer une table nationale serait fabriquer une
 *     donnée métier qui déciderait ensuite des moyennes réelles d'élèves.
 *
 *   · **Les dates.** Rentrée, congés et compositions sont propres à chaque
 *     établissement. Aucune date par défaut, nulle part — voir `TERM_MODEL`.
 *
 *   · **Les contrôles.** Kory a arbitré : socle commun = 3 trimestres +
 *     3 compositions ; les contrôles sont libres. Ils sont donc *proposés*
 *     séparément (`CONTROL_MODEL`) et l'école décide en une case à cocher.
 */

/* ══════════════════════════════ les matières ══════════════════════════════ */

/**
 * Groupes de l'élémentaire : un parent, ses sous-matières notées.
 *
 * Le parent n'est jamais noté directement — sa moyenne se calcule à partir de
 * ses enfants (`buildBlocks()` dans `src/lib/bulletin.ts`). C'est ce qui permet
 * à « Français » d'être un groupe en CI et une matière notée en 6ème, sans
 * dupliquer la ligne.
 */
export const SUBJECT_TREE: Record<string, string[]> = {
  Français: [
    "Lecture", "Écriture / Graphisme", "Élocution / Expression orale",
    "Vocabulaire", "Grammaire", "Conjugaison", "Orthographe", "Expression écrite",
  ],
  Mathématiques: [
    "Calcul mental", "Numération / Opérations", "Problèmes", "Géométrie",
    "Mesures / Système métrique",
  ],
  Éveil: ["IST", "Histoire", "Géographie", "Éducation civique et morale"],
  "Éducation artistique": ["Dessin / Arts plastiques", "Chant / Musique", "Travaux manuels"],
};

/** Matières sans groupe : notées telles quelles, à tous les niveaux. */
export const STANDALONE_SUBJECTS = [
  "Anglais", "Éducation Physique (EPS)", "Arabe", "Espagnol",
  "Histoire-Géographie", "SVT", "Physique-Chimie", "Philosophie",
];

/**
 * Programme réel par niveau de l'élémentaire.
 *
 * ⚠️ **Défini classe par classe, jamais par exclusion.** Le CI apprend à lire
 * et à compter : pas de grammaire, pas d'histoire, pas d'anglais. Raisonner par
 * soustraction (« tout sauf… ») produisait des listes irréalistes — seize
 * matières au CI. La granularité s'enrichit au fil des niveaux, et c'est écrit.
 */
export const PROGRAMME_BY_CLASS: Record<string, string[]> = {
  CI: [
    "Lecture", "Écriture / Graphisme", "Élocution / Expression orale",
    "Calcul mental", "Numération / Opérations",
    "Dessin / Arts plastiques", "Chant / Musique",
    "Éducation Physique (EPS)",
  ],
  CP: [
    "Lecture", "Écriture / Graphisme", "Élocution / Expression orale",
    "Vocabulaire", "Orthographe",
    "Calcul mental", "Numération / Opérations", "Problèmes",
    "Dessin / Arts plastiques", "Chant / Musique",
    "Éducation Physique (EPS)",
  ],
  CE1: [
    "Lecture", "Élocution / Expression orale", "Vocabulaire", "Grammaire",
    "Conjugaison", "Orthographe",
    "Calcul mental", "Numération / Opérations", "Problèmes", "Géométrie",
    "IST",
    "Dessin / Arts plastiques", "Chant / Musique",
    "Éducation Physique (EPS)",
  ],
  CE2: [
    "Lecture", "Vocabulaire", "Grammaire", "Conjugaison", "Orthographe",
    "Expression écrite",
    "Calcul mental", "Numération / Opérations", "Problèmes", "Géométrie",
    "Mesures / Système métrique",
    "IST", "Histoire", "Géographie",
    "Dessin / Arts plastiques", "Éducation Physique (EPS)",
  ],
  CM1: [
    "Lecture", "Vocabulaire", "Grammaire", "Conjugaison", "Orthographe",
    "Expression écrite",
    "Calcul mental", "Numération / Opérations", "Problèmes", "Géométrie",
    "Mesures / Système métrique",
    "IST", "Histoire", "Géographie", "Éducation civique et morale",
    "Anglais", "Éducation Physique (EPS)",
  ],
  CM2: [
    "Lecture", "Vocabulaire", "Grammaire", "Conjugaison", "Orthographe",
    "Expression écrite",
    "Calcul mental", "Numération / Opérations", "Problèmes", "Géométrie",
    "Mesures / Système métrique",
    "IST", "Histoire", "Géographie", "Éducation civique et morale",
    "Anglais", "Éducation Physique (EPS)",
  ],
};

/** Au collège et au lycée, les disciplines ne sont plus découpées : elles sont notées entières. */
export const PROGRAMME_COLLEGE = [
  "Français", "Mathématiques", "Anglais", "Histoire-Géographie",
  "SVT", "Physique-Chimie", "Éducation Physique (EPS)", "Espagnol", "Arabe",
];
export const PROGRAMME_LYCEE = [...PROGRAMME_COLLEGE, "Philosophie"];

/**
 * ⚠️ **La maternelle n'a PAS de programme préconfiguré, et c'est délibéré.**
 * Petite/Moyenne/Grande Section ne se notent pas sur 20 au Sénégal : elles
 * s'évaluent par domaines d'apprentissage. Proposer une grille de matières y
 * serait plaquer le modèle de l'élémentaire sur un cycle qui ne fonctionne pas
 * ainsi. `curriculumFor()` rend donc une liste vide, et l'écran le dit.
 */

/** Minuscules sans accents — « 6ème A » et « 6eme » doivent se rejoindre. */
function normalize(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Les matières proposées pour une classe.
 *
 * Le nom est reconnu par **préfixe** : « CM2 Bilingue » et « 6ème A » héritent
 * du programme de leur niveau. Sans reconnaissance, on retombe sur le cycle —
 * et si le cycle ne dit rien non plus, la liste est vide plutôt qu'approximative.
 */
export function curriculumFor(className: string, cycle: string): string[] {
  const n = normalize(className);
  for (const [level, subjects] of Object.entries(PROGRAMME_BY_CLASS)) {
    const l = normalize(level);
    if (n === l || n.startsWith(`${l} `) || n.startsWith(`${l}-`)) return subjects;
  }
  if (cycle === "LYCEE") return PROGRAMME_LYCEE;
  if (cycle === "COLLEGE") return PROGRAMME_COLLEGE;
  return [];
}

/** Le parent d'une matière dans l'arbre, ou `null` si elle est autonome. */
export function parentOf(subject: string): string | null {
  for (const [group, children] of Object.entries(SUBJECT_TREE)) {
    if (children.includes(subject)) return group;
  }
  return null;
}

/** Toutes les matières du modèle, groupes compris, dans l'ordre de création. */
export function allModelSubjects(): { name: string; parent: string | null }[] {
  const out: { name: string; parent: string | null }[] = [];
  for (const [group, children] of Object.entries(SUBJECT_TREE)) {
    out.push({ name: group, parent: null });
    for (const child of children) out.push({ name: child, parent: group });
  }
  for (const name of STANDALONE_SUBJECTS) out.push({ name, parent: null });
  return out;
}

/* ═══════════════════════════ les niveaux et leurs classes ═══════════════════════════ */

export type ProposedClass = { id: string; name: string; cycle: string };


/**
 * Les quatre niveaux du système sénégalais et les classes qu'ils produisent.
 *
 * ⚠️ Cette table vivait **en double** : les noms de classes dans
 * `src/app/onboarding/actions.ts`, et leur simple NOMBRE (« classes: 3 ») saisi
 * à la main dans `Wizard.tsx` pour l'annonce « 13 classes seront créées ». Deux
 * vérités qui pouvaient diverger — ajouter une classe au collège sans corriger
 * le compteur aurait fait mentir l'écran d'installation. Ici, le compteur est
 * `classes.length` : il ne peut plus se tromper.
 */
export const LEVELS = [
  { id: "Maternelle", cycle: "MATERNELLE", classes: ["Petite Section", "Moyenne Section", "Grande Section"] },
  { id: "Primaire", cycle: "ELEMENTAIRE", classes: ["CI", "CP", "CE1", "CE2", "CM1", "CM2"] },
  { id: "Collège", cycle: "COLLEGE", classes: ["6ème", "5ème", "4ème", "3ème"] },
  { id: "Lycée", cycle: "LYCEE", classes: ["Seconde", "Première", "Terminale"] },
] as const;

export type LevelId = (typeof LEVELS)[number]["id"];

/** Les classes que produiraient les niveaux choisis, prêtes pour `curriculumProposal()`. */
export function classesForLevels(levels: string[]): ProposedClass[] {
  const out: ProposedClass[] = [];
  for (const level of LEVELS) {
    if (!levels.includes(level.id)) continue;
    for (const name of level.classes) out.push({ id: `${level.id}:${name}`, name, cycle: level.cycle });
  }
  return out;
}

/* ══════════════════════════ trimestres et évaluations ══════════════════════════ */

/**
 * **Le socle commun** : trois trimestres, une composition chacun.
 *
 * ⚠️ **`startDate` et `endDate` restent absents de ce modèle.** Ce n'est pas un
 * oubli à combler plus tard : c'est la règle. Sans dates, `pickCurrentTerm()`
 * ne peut désigner aucun trimestre comme courant et le produit le dit à
 * l'écran ; avec des dates inventées, il en désignerait un **faux** et
 * orienterait la saisie des notes vers la mauvaise période sans que personne
 * ne s'en aperçoive. Le silence est réparable, la fiction ne l'est pas.
 */
export const TERM_MODEL = [
  { name: "1er Trimestre", composition: "Composition du 1er trimestre", control: "Contrôle du 1er trimestre" },
  { name: "2ème Trimestre", composition: "Composition du 2e trimestre", control: "Contrôle du 2e trimestre" },
  { name: "3ème Trimestre", composition: "Composition du 3e trimestre", control: "Contrôle du 3e trimestre" },
] as const;

/**
 * Les contrôles — **proposés à part, parce qu'ils ne sont pas le socle.**
 *
 * Kory : « Les 3 trimestres et les 3 compositions sont le socle commun. Les
 * contrôles peuvent être configurés par l'école. » Un contrôle par trimestre est
 * donc une **suggestion cochée par défaut** — une école qui n'en veut pas la
 * décoche en un geste, et une école qui en veut quatre les ajoute ensuite. Sans
 * aucun contrôle, un trimestre n'a qu'une note par matière : c'est un choix
 * légitime, pas un défaut.
 */
export const CONTROL_MODEL_IS_OPTIONAL = true;

export type EvaluationType = "EXAM" | "QUIZ";

/* ═══════════════════════════════ la projection ═══════════════════════════════ */

export type CurriculumProposal = {
  /** Matières du modèle réellement utilisées par au moins une classe. */
  subjects: string[];
  /** Par classe : ce qui lui serait rattaché. */
  perClass: { classId: string; className: string; subjects: string[] }[];
  /** Classes qu'aucun programme ne couvre — nommées, jamais silencieuses. */
  uncovered: { classId: string; className: string; reason: string }[];
  terms: string[];
  compositions: string[];
  controls: string[];
  totals: { subjects: number; links: number; terms: number; evaluations: number };
};

/**
 * Ce que l'application du modèle produirait — **calculé, jamais estimé**.
 *
 * Sert deux fois : à l'installation, pour annoncer avant d'écrire ; et sur
 * l'écran de configuration, pour montrer ce qui manque encore. La même fonction
 * dans les deux cas, donc le même chiffre.
 */
export function curriculumProposal(
  classes: ProposedClass[],
  options: { withControls: boolean },
): CurriculumProposal {
  const perClass: CurriculumProposal["perClass"] = [];
  const uncovered: CurriculumProposal["uncovered"] = [];
  const used = new Set<string>();

  for (const c of classes) {
    const subjects = curriculumFor(c.name, c.cycle);
    if (subjects.length === 0) {
      uncovered.push({
        classId: c.id,
        className: c.name,
        reason:
          c.cycle === "MATERNELLE"
            ? "La maternelle s'évalue par domaines d'apprentissage, pas par matières notées."
            : "Aucun programme type ne correspond à ce niveau — à composer à la main.",
      });
      continue;
    }
    perClass.push({ classId: c.id, className: c.name, subjects });
    for (const s of subjects) {
      used.add(s);
      const parent = parentOf(s);
      if (parent) used.add(parent);
    }
  }

  const terms = TERM_MODEL.map((t) => t.name);
  const compositions = TERM_MODEL.map((t) => t.composition);
  const controls = options.withControls ? TERM_MODEL.map((t) => t.control) : [];

  return {
    subjects: [...used],
    perClass,
    uncovered,
    terms,
    compositions,
    controls,
    totals: {
      subjects: used.size,
      links: perClass.reduce((n, c) => n + c.subjects.length, 0),
      terms: terms.length,
      evaluations: compositions.length + controls.length,
    },
  };
}
