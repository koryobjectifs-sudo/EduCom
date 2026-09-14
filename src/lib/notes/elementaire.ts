/**
 * Calcul des moyennes de l'ÉLÉMENTAIRE — pas de coefficients.
 *
 * ⚠️ ÉTANCHE : ce fichier n'importe rien de `secondaire.ts` et n'y est
 * importé nulle part — seul `roundTo2` (utilitaire numérique) est partagé.
 * Aucun écran, aucun bulletin ne branchent encore ce module.
 *
 * Règles (cahier des charges Kory, lot 18/2) :
 *   Moyenne du domaine  = Σ notes du domaine / nombre de sous-disciplines notées
 *   Total points obtenus = Σ de toutes les notes
 *   Total maximum        = nombre de sous-disciplines notées × barème
 *   Moyenne générale      = (total obtenu / total maximum) × 10, puis
 *                           conversion sur 20 selon réglage de l'école
 *   Une sous-discipline NON notée est EXCLUE du calcul — jamais comptée zéro.
 */
import { roundTo2 } from "./round";

export type SousDisciplineInput = {
  subDisciplineId: string;
  name: string;
  domainId: string;
  domainName: string;
  /** Barème de CETTE sous-discipline (configurable par école, 10 par défaut). */
  scale: number;
  /** `null` = non notée : exclue du calcul, jamais comptée comme 0. */
  note: number | null;
};

export type DomaineResultat = {
  domainId: string;
  name: string;
  sousDisciplinesNotees: number;
  /** `null` si aucune sous-discipline du domaine n'est notée. */
  moyenne: number | null;
};

export type EleveElementaireResultat = {
  studentId: string;
  domaines: DomaineResultat[];
  totalPoints: number | null;
  totalMaximum: number | null;
  /** Moyenne générale ramenée sur 10, avant conversion d'affichage. */
  moyenneGeneraleSur10: number | null;
  /** Moyenne générale au barème d'affichage demandé (`bareme`). */
  moyenneGenerale: number | null;
};

function moyenne(valeurs: number[]): number {
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}

/** Barème le plus représenté parmi les sous-disciplines notées — même principe que `buildBulletin()`, réécrit ici sans dépendance croisée. */
function baremeDominant(valeurs: number[]): number {
  const comptes = new Map<number, number>();
  for (const v of valeurs) comptes.set(v, (comptes.get(v) ?? 0) + 1);
  return [...comptes.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Moyenne d'un élève, à partir de TOUTES les sous-disciplines de son
 * programme (notées ou non — les non notées sont filtrées ici, jamais par
 * l'appelant, pour qu'aucun appelant ne les compte par erreur comme des 0).
 *
 * @param bareme Barème d'affichage de l'école pour la moyenne générale (10 ou 20). Réglage non encore posé au schéma — paramètre en attendant l'écran qui le fixera.
 */
export function calculerEleveElementaire(
  studentId: string,
  sousDisciplines: SousDisciplineInput[],
  bareme: 10 | 20 = 20,
): EleveElementaireResultat {
  const parDomaine = new Map<string, SousDisciplineInput[]>();
  for (const sd of sousDisciplines) {
    if (!parDomaine.has(sd.domainId)) parDomaine.set(sd.domainId, []);
    parDomaine.get(sd.domainId)!.push(sd);
  }

  const domaines: DomaineResultat[] = [...parDomaine.entries()].map(([domainId, rows]) => {
    const notees = rows.filter((r) => r.note !== null);
    return {
      domainId,
      name: rows[0].domainName,
      sousDisciplinesNotees: notees.length,
      moyenne: notees.length ? roundTo2(moyenne(notees.map((r) => r.note as number))) : null,
    };
  });

  const noteesGlobal = sousDisciplines.filter((sd) => sd.note !== null);
  if (noteesGlobal.length === 0) {
    return { studentId, domaines, totalPoints: null, totalMaximum: null, moyenneGeneraleSur10: null, moyenneGenerale: null };
  }

  const totalPoints = roundTo2(noteesGlobal.reduce((a, r) => a + (r.note as number), 0));
  const bareme10 = baremeDominant(noteesGlobal.map((r) => r.scale));
  const totalMaximum = noteesGlobal.length * bareme10;
  const moyenneGeneraleSur10 = roundTo2((totalPoints / totalMaximum) * 10);
  const moyenneGenerale = bareme === 20 ? roundTo2(moyenneGeneraleSur10 * 2) : moyenneGeneraleSur10;

  return { studentId, domaines, totalPoints, totalMaximum, moyenneGeneraleSur10, moyenneGenerale };
}

/**
 * Rang sur l'effectif — ex æquo gérés (deux élèves à la même moyenne
 * partagent le rang, le suivant saute : 1, 1, 3). Un élève sans moyenne
 * n'est pas classé.
 *
 * ⚠️ Copie volontaire de l'algorithme de `secondaire.ts::classerSecondaire` —
 * pas un import : les deux cycles restent étanches même pour ce détail.
 */
export function classerElementaire(
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
