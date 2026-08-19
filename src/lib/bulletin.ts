/**
 * Structure d'un bulletin : comment les matières d'une classe s'organisent
 * en blocs.
 *
 * Règle centrale : une matière rattachée à la classe est notée directement ;
 * une matière non rattachée dont les enfants le sont devient un groupe, dont
 * la moyenne est calculée. C'est ce qui permet à « Français » d'être un groupe
 * en CI (ses 8 sous-matières sont notées) et une matière notée en 6ème (elle
 * seule est rattachée), sans dupliquer la ligne.
 */

export type SubjectRow = {
  id: string;
  name: string;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
};

/**
 * Un bloc du bulletin : un groupe et ses sous-matières, ou une matière seule.
 *
 * Générique sur la matière pour que l'appelant conserve ses propres champs —
 * le périmètre de saisie (`editable`), par exemple.
 */
export type Block<T extends SubjectRow = SubjectRow> = {
  key: string;
  /** `null` pour une matière notée directement, sans regroupement. */
  title: string | null;
  rows: T[];
};

// Ordre d'apparition des blocs. Ce qui n'est pas listé suit, par ordre alphabétique.
const BLOCK_ORDER = ["Français", "Mathématiques", "Éveil", "Éducation artistique"];

export function buildBlocks<T extends SubjectRow>(subjects: T[]): Block<T>[] {
  const groups = new Map<string, Block<T>>();
  const blocks: Block<T>[] = [];

  for (const s of subjects) {
    if (s.parentId && s.parent) {
      let group = groups.get(s.parentId);
      if (!group) {
        group = { key: s.parentId, title: s.parent.name, rows: [] };
        groups.set(s.parentId, group);
        blocks.push(group);
      }
      group.rows.push(s);
    } else {
      blocks.push({ key: s.id, title: null, rows: [s] });
    }
  }

  // Les sous-matières d'un groupe gardent un ordre stable et lisible.
  for (const group of groups.values()) {
    group.rows.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  const rank = (b: Block) => {
    const name = b.title ?? b.rows[0].name;
    const i = BLOCK_ORDER.indexOf(name);
    return i === -1 ? BLOCK_ORDER.length : i;
  };

  return blocks.sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return (a.title ?? a.rows[0].name).localeCompare(b.title ?? b.rows[0].name, "fr");
  });
}
