/**
 * Tri pédagogique des classes.
 *
 * L'ordre alphabétique est inutilisable ici : il place CE1 avant CI, et 3ème
 * avant 6ème. On classe donc par cycle, puis par niveau réel dans le cycle.
 *
 * Les classes créées librement par l'école (« 6ème A », « CM2 Bilingue »…) sont
 * rattachées à leur niveau par préfixe ; celles qu'on ne reconnaît pas sont
 * placées en fin de leur cycle, par ordre alphabétique.
 */

const CYCLE_ORDER: Record<string, number> = {
  MATERNELLE: 0,
  ELEMENTAIRE: 1,
  COLLEGE: 2,
  LYCEE: 3,
  AUTRE: 4,
};

// Niveaux du plus petit au plus grand, tous cycles confondus.
const LEVEL_ORDER = [
  "petite section",
  "moyenne section",
  "grande section",
  "ci",
  "cp",
  "ce1",
  "ce2",
  "cm1",
  "cm2",
  "6eme",
  "5eme",
  "4eme",
  "3eme",
  "seconde",
  "premiere",
  "terminale",
];

/** Minuscules sans accents, pour que « 6ème » et « 6eme » se rejoignent. */
function normalize(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function levelRank(name: string) {
  const n = normalize(name);
  const index = LEVEL_ORDER.findIndex((level) => n === level || n.startsWith(`${level} `));
  return index === -1 ? LEVEL_ORDER.length : index;
}

type SortableClass = { name: string; cycle: string };

export function compareClasses(a: SortableClass, b: SortableClass) {
  const byCycle = (CYCLE_ORDER[a.cycle] ?? 99) - (CYCLE_ORDER[b.cycle] ?? 99);
  if (byCycle !== 0) return byCycle;

  const byLevel = levelRank(a.name) - levelRank(b.name);
  if (byLevel !== 0) return byLevel;

  return a.name.localeCompare(b.name, "fr");
}

export function sortClasses<T extends SortableClass>(classes: T[]): T[] {
  return [...classes].sort(compareClasses);
}
