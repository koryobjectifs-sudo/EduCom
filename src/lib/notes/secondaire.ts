/**
 * Calcul des moyennes du SECONDAIRE — coefficients stricts.
 *
 * ⚠️ ÉTANCHE : ce fichier n'importe rien de `elementaire.ts` et n'y est
 * importé nulle part. Si un calcul devait un jour servir aux deux cycles, il
 * serait écrit deux fois plutôt que de risquer de mélanger leurs règles —
 * décision explicite du lot 18/2. Seul `roundTo2` (utilitaire numérique, pas
 * une règle pédagogique) est partagé.
 *
 * ⚠️ Aucun écran, aucun bulletin ne branchent encore ce module — c'est pour
 * un lot suivant. `src/lib/bulletin.ts` (le calculateur actuellement utilisé
 * par les écrans) n'est pas touché ici.
 *
 * Règles (cahier des charges Kory, lot 18/2) :
 *   MD  = somme des devoirs / nombre de devoirs saisis
 *   MM  = (MD + Composition) / 2
 *   P   = MM × coefficient de la matière (classe + série)
 *   MG  = somme des points / somme des coefficients
 *   Une matière SANS composition n'entre PAS dans MG : la composition est
 *   obligatoire. Une matière sans devoir mais avec composition : MM = composition.
 */
import { roundTo2 } from "./round";

export type MatiereSecondaireInput = {
  subjectId: string;
  name: string;
  /** Coefficient de la matière pour cette classe/série. Jamais déduit ici. */
  coefficient: number;
  /** Notes de devoir sur 20, 0 à 3 valeurs. */
  devoirs: number[];
  /** Note de composition sur 20, ou `null` si absente. */
  composition: number | null;
};

export type MatiereSecondaireResultat = {
  subjectId: string;
  name: string;
  coefficient: number;
  md: number | null;
  mm: number | null;
  /** P = MM × coefficient. `null` si la matière est exclue (pas de composition). */
  points: number | null;
  /** `false` = composition absente, exclue de la moyenne générale. */
  incluse: boolean;
};

function moyenne(valeurs: number[]): number {
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}

export function calculerMatiereSecondaire(input: MatiereSecondaireInput): MatiereSecondaireResultat {
  const { subjectId, name, coefficient, devoirs, composition } = input;
  const md = devoirs.length ? roundTo2(moyenne(devoirs)) : null;

  if (composition === null) {
    // Composition obligatoire : sans elle, la matière n'entre dans aucune moyenne générale.
    return { subjectId, name, coefficient, md, mm: null, points: null, incluse: false };
  }

  const mm = md === null ? roundTo2(composition) : roundTo2((md + composition) / 2);
  const points = roundTo2(mm * coefficient);
  return { subjectId, name, coefficient, md, mm, points, incluse: true };
}

export type EleveSecondaireResultat = {
  studentId: string;
  matieres: MatiereSecondaireResultat[];
  totalPoints: number | null;
  totalCoefficients: number;
  moyenneGenerale: number | null;
};

/** Moyenne générale d'un élève : MG = Σ points / Σ coefficients, matières incluses seulement. */
export function calculerEleveSecondaire(studentId: string, matieres: MatiereSecondaireInput[]): EleveSecondaireResultat {
  const resultats = matieres.map(calculerMatiereSecondaire);
  const incluses = resultats.filter((r) => r.incluse);

  const totalCoefficients = incluses.reduce((a, r) => a + r.coefficient, 0);
  const totalPoints = incluses.length ? roundTo2(incluses.reduce((a, r) => a + (r.points as number), 0)) : null;
  const moyenneGenerale =
    totalCoefficients > 0 && totalPoints !== null ? roundTo2(totalPoints / totalCoefficients) : null;

  return { studentId, matieres: resultats, totalPoints, totalCoefficients, moyenneGenerale };
}

/**
 * Rang sur l'effectif — ex æquo gérés (deux élèves à la même moyenne
 * partagent le rang, le suivant saute : 1, 1, 3). Un élève sans moyenne
 * n'est pas classé.
 */
export function classerSecondaire(
  eleves: { studentId: string; moyenneGenerale: number | null }[],
): Map<string, number | null> {
  const classables = eleves
    .filter((e) => e.moyenneGenerale !== null)
    .sort((a, b) => (b.moyenneGenerale as number) - (a.moyenneGenerale as number));

  const rangs = new Map<string, number | null>();
  classables.forEach((e, i) => {
    const rang =
      i > 0 && classables[i - 1].moyenneGenerale === e.moyenneGenerale
        ? (rangs.get(classables[i - 1].studentId) as number)
        : i + 1;
    rangs.set(e.studentId, rang);
  });
  for (const e of eleves) if (!rangs.has(e.studentId)) rangs.set(e.studentId, null);
  return rangs;
}
