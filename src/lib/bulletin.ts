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
  /**
   * Coefficient configuré pour cette matière DANS CETTE CLASSE
   * (`ClassSubject.coefficient`), s'il est connu de l'appelant.
   *
   * ⚠️ Il ne remplace jamais le coefficient réellement porté par une note : il
   * ne sert qu'à afficher un poids **avant la première note**. Sans lui, la
   * colonne « coef » du bulletin restait vide tant que rien n'était saisi, ce
   * qui rendait le coefficient inconfigurable en pratique — on ne peut pas
   * régler ce qu'on ne voit pas.
   */
  coefficient?: number | null;
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

/* ═══════════════════════════════════════════════════════════════════════════
   CALCUL DU BULLETIN — SOURCE UNIQUE
   ───────────────────────────────────────────────────────────────────────────
   Avant ce bloc, trois surfaces calculaient le bulletin CHACUNE de son côté :

     · `documents/report-card/Generator.tsx` — moyenne pondérée, rang, moyenne
       de classe, **sans aucun regroupement** : les matières sortaient à plat.
     · `documents/validation/impression/PrintClient.tsx` — sa propre fonction
       `average()`, **avec** moyennes de groupe.
     · `grades/StudentEntryTab.tsx` — son propre `averageOf()`.

   Trois implémentations du même document officiel, qui n'affichaient pas la
   même chose. Tout ce qui suit remplace les trois.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Comment une évaluation compte dans le trimestre. Dérivé de `Evaluation.type`. */
export type EvaluationKind = "CONTROL" | "COMPOSITION";

/**
 * `EXAM` = composition / examen. Tout le reste (`QUIZ`, `HOMEWORK`,
 * `PARTICIPATION`, `OTHER`) est une évaluation intermédiaire.
 *
 * ⚠️ La correspondance est déjà celle de l'écran de configuration
 * (`GradesClient.tsx` : « Composition / Examen » = EXAM, « Contrôle / Devoir »
 * = QUIZ). Elle est reprise ici pour que le calcul et l'interface ne puissent
 * pas se contredire.
 */
export function evaluationKind(type: string | null | undefined): EvaluationKind {
  return type === "EXAM" ? "COMPOSITION" : "CONTROL";
}

export type GradeRow = {
  studentId: string;
  subjectId: string;
  value: number;
  /** Barème réel de la note. **Jamais supposé égal à 20.** */
  max: number;
  coefficient: number;
  kind: EvaluationKind;
  comment?: string | null;
};

/**
 * ⚠️⚠️ LE SEUL ENDROIT OÙ CONTRÔLES ET COMPOSITION SE COMBINENT. ⚠️⚠️
 *
 * ═══ RÈGLE PÉDAGOGIQUE NON ENCORE ARBITRÉE ═══
 *
 * Kory n'a pas fixé la pondération (contrôle × 1 + composition × 2 / 3 ?
 * composition seule ? moyenne simple ?). **Rien ne doit être inventé ici.**
 *
 * En attendant, cette fonction reproduit **exactement** le comportement
 * historique du produit : une moyenne pondérée par le coefficient de chaque
 * note, contrôles et composition confondus. Ce n'est pas un choix pédagogique,
 * c'est la compatibilité avec ce qui existait.
 *
 * ═══ COMMENT LA REMPLACER, LE JOUR VENU ═══
 *
 * Ne modifier QUE le corps de cette fonction. Elle reçoit toutes les notes
 * d'un élève pour une matière, chacune étiquetée `CONTROL` ou `COMPOSITION`, et
 * rend un ratio dans [0, 1] — indépendant du barème, donc utilisable quel que
 * soit le système de notation de l'école. Aucun appelant n'a besoin de changer.
 */
export const TERM_WEIGHTING_IS_PROVISIONAL = true;

function combineRatios(rows: GradeRow[]): number | null {
  let points = 0;
  let coefs = 0;
  for (const g of rows) {
    if (!Number.isFinite(g.value) || !Number.isFinite(g.max) || g.max <= 0) continue;
    const coef = g.coefficient > 0 ? g.coefficient : 1;
    // Le ratio, pas la note : additionner un 8/10 et un 15/20 sans normaliser
    // produit une moyenne qui ne veut rien dire — et personne ne le verrait.
    points += (g.value / g.max) * coef;
    coefs += coef;
  }
  return coefs === 0 ? null : points / coefs;
}

/* ─────────────────────────── structure du bulletin ─────────────────────────── */

export type BulletinLine = {
  subjectId: string;
  name: string;
  /** Moyenne de l'élève sur le barème de l'école, ou `null` si non noté. */
  average: number | null;
  coefficient: number | null;
  comment: string | null;
  /** Statistiques de la classe sur cette matière. */
  classAverage: number | null;
  best: number | null;
  worst: number | null;
};

export type BulletinBlock = {
  key: string;
  title: string | null;
  lines: BulletinLine[];
  groupAverage: number | null;
};

export type BulletinStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  blocks: BulletinBlock[];
  general: number | null;
  rank: number | null;
  /** Matières notées / matières attendues — la complétude, pas une moyenne. */
  filled: number;
  expected: number;
  status: string;
  generalComment: string | null;
};

export type Bulletin = {
  students: BulletinStudent[];
  classAverage: number | null;
  best: number | null;
  worst: number | null;
  headcount: number;
  /**
   * Barème réel de l'établissement, **déduit des notes** et non supposé.
   * Une école qui note sur 10 verra « /10 » partout, y compris à l'impression.
   */
  scale: number;
  /** `true` si plusieurs barèmes cohabitent : l'écran doit le signaler. */
  mixedScales: boolean;
  subjectCount: number;
};

export type BulletinInput = {
  students: {
    id: string; firstName: string; lastName: string;
    dateOfBirth?: Date | string | null;
    status?: string; generalComment?: string | null;
  }[];
  subjects: SubjectRow[];
  grades: GradeRow[];
};

/**
 * Construit le bulletin d'une classe — **le seul calculateur du produit**.
 *
 * Utilisé par l'aperçu enseignant, le bulletin de direction, l'impression et le
 * secrétariat. Une seule structure, donc quatre écrans qui ne peuvent plus
 * afficher des chiffres différents pour le même élève.
 *
 * ⚠️ Une matière sans note vaut `null`, **jamais 0**. Un élève absent à une
 * composition n'a pas eu zéro ; l'écrire serait fabriquer une sanction.
 */
export function buildBulletin(input: BulletinInput): Bulletin {
  const { students, subjects, grades } = input;

  // Barème dominant, lu dans les données. À défaut de note : 20, convention
  // sénégalaise — et c'est la seule valeur par défaut de tout ce fichier.
  const maxCounts = new Map<number, number>();
  for (const g of grades) {
    if (Number.isFinite(g.max) && g.max > 0) maxCounts.set(g.max, (maxCounts.get(g.max) ?? 0) + 1);
  }
  const scale = maxCounts.size === 0
    ? 20
    : [...maxCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const blocks = buildBlocks(subjects);
  const notableIds = subjects.map((s) => s.id);

  const rowsOf = (studentId: string, subjectId: string) =>
    grades.filter((g) => g.studentId === studentId && g.subjectId === subjectId);

  /** Moyenne d'un élève sur un ensemble de matières, exprimée sur `scale`. */
  const averageOver = (studentId: string, subjectIds: string[]): number | null => {
    const rows = grades.filter((g) => g.studentId === studentId && subjectIds.includes(g.subjectId));
    const ratio = combineRatios(rows);
    return ratio === null ? null : ratio * scale;
  };

  // Statistiques de classe par matière — calculées une fois, pas par élève.
  const statsBySubject = new Map<string, { classAverage: number | null; best: number | null; worst: number | null }>();
  for (const s of subjects) {
    const perStudent = students
      .map((st) => averageOver(st.id, [s.id]))
      .filter((v): v is number => v !== null);
    statsBySubject.set(s.id, {
      classAverage: perStudent.length ? perStudent.reduce((a, b) => a + b, 0) / perStudent.length : null,
      best: perStudent.length ? Math.max(...perStudent) : null,
      worst: perStudent.length ? Math.min(...perStudent) : null,
    });
  }

  const built: BulletinStudent[] = students.map((st) => {
    const studentBlocks: BulletinBlock[] = blocks.map((b) => ({
      key: b.key,
      title: b.title,
      lines: b.rows.map((r) => {
        const rows = rowsOf(st.id, r.id);
        const ratio = combineRatios(rows);
        const stats = statsBySubject.get(r.id) ?? { classAverage: null, best: null, worst: null };
        return {
          subjectId: r.id,
          name: r.name,
          average: ratio === null ? null : ratio * scale,
          /**
           * ⚠️ **Ordre de préférence, et il n'est pas interchangeable.**
           * ① le coefficient réellement porté par les notes — c'est lui qui a
           *    servi au calcul, l'afficher autrement ferait mentir la moyenne ;
           * ② à défaut, celui configuré pour la classe, qui sera appliqué à la
           *    prochaine note ;
           * ③ à défaut, rien. **Jamais 1 par défaut ici** : afficher « coef 1 »
           *    sur une matière non configurée serait indiscernable d'un
           *    coefficient délibérément fixé à 1.
           */
          coefficient: rows.length ? rows[0].coefficient : (r.coefficient ?? null),
          comment: rows.find((g) => g.comment)?.comment ?? null,
          ...stats,
        };
      }),
      groupAverage: averageOver(st.id, b.rows.map((r) => r.id)),
    }));

    const filled = notableIds.filter((id) => rowsOf(st.id, id).length > 0).length;

    return {
      studentId: st.id,
      firstName: st.firstName,
      lastName: st.lastName,
      dateOfBirth: st.dateOfBirth
        ? (typeof st.dateOfBirth === "string" ? st.dateOfBirth : st.dateOfBirth.toISOString())
        : null,
      blocks: studentBlocks,
      general: averageOver(st.id, notableIds),
      rank: null,
      filled,
      expected: notableIds.length,
      status: st.status ?? "DRAFT",
      generalComment: st.generalComment ?? null,
    };
  });

  /**
   * Rang — ex æquo gérés : deux élèves à la même moyenne partagent le rang, et
   * le suivant saute (1, 1, 3). Un élève sans aucune note n'est **pas classé** :
   * le compter dernier serait le sanctionner pour une absence de données.
   */
  const ranked = built.filter((s) => s.general !== null).sort((a, b) => (b.general as number) - (a.general as number));
  ranked.forEach((s, i) => {
    s.rank = i > 0 && ranked[i - 1].general === s.general ? (ranked[i - 1].rank as number) : i + 1;
  });

  const generals = ranked.map((s) => s.general as number);

  return {
    students: built.sort((a, b) => a.lastName.localeCompare(b.lastName, "fr")),
    classAverage: generals.length ? generals.reduce((a, b) => a + b, 0) / generals.length : null,
    best: generals.length ? Math.max(...generals) : null,
    worst: generals.length ? Math.min(...generals) : null,
    headcount: students.length,
    scale,
    mixedScales: maxCounts.size > 1,
    subjectCount: notableIds.length,
  };
}
