/**
 * Calcul du SECONDAIRE pour une classe entière — moyennes de classe et rang.
 *
 * ⚠️ **Jamais charger les notes brutes de toute la classe en mémoire.** Une
 * classe peut compter 60 élèves × 17 matières × jusqu'à 4 notes (devoirs +
 * composition) : jusqu'à ~4000 lignes `Grade`. La moyenne des devoirs (MD)
 * est un `AVG` SQL, poussé à la base via `groupBy` — on ne récupère que le
 * résultat agrégé par (élève, matière), soit au plus effectif × matières
 * lignes (≤ 1020 pour l'exemple ci-dessus), jamais les notes une par une.
 * Seule cette poignée de valeurs déjà agrégées est ensuite combinée en JS
 * (MM, P, MG) — c'est un calcul sur des totaux, pas sur des notes.
 */
import { prisma } from "@/lib/prisma";
import {
  calculerEleveSecondaire,
  classerSecondaire,
  type EleveSecondaireResultat,
  type MatiereSecondaireInput,
} from "./secondaire";
import { roundTo2 } from "./round";

/** "Terminale S2" / "2nde S" / "6e A" / "Sixième B" → "Terminale" | "Première" | "Seconde" | "6e" | "5e" | "4e" | "3e" | null. Local à ce module. */
export function deriverNiveau(nomClasse: string): string | null {
  const n = nomClasse
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  // Lycée
  if (n.includes("terminale") || /\btle\b/.test(n)) return "Terminale";
  if (n.includes("premiere") || /\b1ere\b/.test(n)) return "Première";
  if (n.includes("seconde") || /\b2nde\b/.test(n)) return "Seconde";

  // Collège (Moyen) : 6e, 5e, 4e, 3e et leurs variantes
  if (/\b(6e|6eme|sixieme)\b/.test(n) || n.startsWith("6e") || n.startsWith("6eme")) return "6e";
  if (/\b(5e|5eme|cinquieme)\b/.test(n) || n.startsWith("5e") || n.startsWith("5eme")) return "5e";
  if (/\b(4e|4eme|quatrieme)\b/.test(n) || n.startsWith("4e") || n.startsWith("4eme")) return "4e";
  if (/\b(3e|3eme|troisieme)\b/.test(n) || n.startsWith("3e") || n.startsWith("3eme")) return "3e";

  return null;
}

export type MoyenneMatiereClasse = {
  subjectId: string;
  name: string;
  /** Moyenne des MM de tous les élèves notés dans cette matière. `null` si personne n'est noté. */
  moyenneClasse: number | null;
  effectifNote: number;
};

export type BulletinClasseSecondaire = {
  eleves: (EleveSecondaireResultat & { rang: number | null })[];
  moyennesParMatiere: MoyenneMatiereClasse[];
  moyenneClasseGenerale: number | null;
  effectif: number;
};

/**
 * Calcule le bulletin complet d'une classe du secondaire pour un trimestre.
 *
 * Déroulé :
 *   1. Résout les élèves inscrits et les matières enseignées dans la classe.
 *   2. Charge les deux seuls agrégats bruts nécessaires (MD et MC par élève × matière)
 *      en 2 requêtes SQL groupées — jamais de chargement des `Grade` en mémoire.
 *   3. Calcule pour chaque élève sa note par matière (MM), ses points (P = MM × coef)
 *      et sa moyenne générale (MG = ΣP / Σcoef).
 *   4. Classe les élèves selon la règle officielle (tri descendant par MG, ex-aequo
 *      au même rang sans saut — `classerSecondaire`).
 *   5. Calcule les moyennes de classe par matière et la moyenne générale de la classe.
 */
export async function calculerClasseSecondaire(params: {
  schoolId: string;
  classId: string;
  termId: string;
}): Promise<BulletinClasseSecondaire> {
  const { schoolId, classId, termId } = params;

  const classe = await prisma.class.findUnique({
    where: { id: classId, schoolId },
    select: { name: true, serie: true },
  });
  if (!classe) throw new Error(`Classe introuvable : ${classId}`);
  const niveau = deriverNiveau(classe.name);

  const [enrollments, classSubjects] = await Promise.all([
    prisma.enrollment.findMany({ where: { classId }, select: { studentId: true } }),
    prisma.classSubject.findMany({
      where: { classId },
      select: { coefficient: true, subject: { select: { id: true, name: true, code: true } } },
    }),
  ]);
  const studentIds = enrollments.map((e) => e.studentId);
  if (studentIds.length === 0 || classSubjects.length === 0) {
    return { eleves: [], moyennesParMatiere: [], moyenneClasseGenerale: null, effectif: 0 };
  }

  // Référentiel de coefficients (niveau, série OU null pour collège)
  const coefficientsReferentiel =
    niveau
      ? await prisma.subjectCoefficient.findMany({
          where: { schoolId, niveau, serie: classe.serie || null },
          select: { coefficient: true, subject: { select: { code: true } } },
        })
      : [];
  const coefParCode = new Map(
    coefficientsReferentiel.filter((c) => c.subject.code).map((c) => [c.subject.code as string, c.coefficient]),
  );

  const subjectIds = classSubjects.map((cs) => cs.subject.id);

  // Les deux SEULS agrégats bruts : moyenne des devoirs et moyenne des
  // compositions, par (élève, matière) — poussés à la base.
  const [devoirsAgg, compositionAgg] = await Promise.all([
    prisma.grade.groupBy({
      by: ["studentId", "subjectId"],
      where: { classId, termId, subjectId: { in: subjectIds }, studentId: { in: studentIds }, type: { not: "EXAM" } },
      _avg: { value: true },
    }),
    prisma.grade.groupBy({
      by: ["studentId", "subjectId"],
      where: { classId, termId, subjectId: { in: subjectIds }, studentId: { in: studentIds }, type: "EXAM" },
      _avg: { value: true },
    }),
  ]);
  const devoirParPaire = new Map(devoirsAgg.map((r) => [`${r.studentId}:${r.subjectId}`, r._avg.value]));
  const compoParPaire = new Map(compositionAgg.map((r) => [`${r.studentId}:${r.subjectId}`, r._avg.value]));

  const eleves = studentIds.map((studentId) => {
    const matieres: MatiereSecondaireInput[] = classSubjects.map((cs) => {
      const cle = `${studentId}:${cs.subject.id}`;
      const md = devoirParPaire.get(cle);
      const coefficientReferentiel = cs.subject.code ? coefParCode.get(cs.subject.code) : undefined;
      // 1. Saisi par l'école pour cette classe (ClassSubject)
      // 2. Sinon référentiel officiel
      // 3. Sinon absence signalée
      const coefficient = (cs.coefficient != null && cs.coefficient > 0)
        ? cs.coefficient
        : (coefficientReferentiel ?? null);

      if (coefficient === null) {
        throw new Error(
          `Coefficient non défini pour la matière « ${cs.subject.name} » dans la classe « ${classe.name} ». Veuillez le configurer.`
        );
      }
      return {
        subjectId: cs.subject.id,
        name: cs.subject.name,
        coefficient,
        // `_avg` sur une seule valeur redonne cette valeur : on ne perd pas
        // l'info "1 seul devoir" en passant par SQL plutôt qu'un tableau JS.
        devoirs: md != null ? [md] : [],
        composition: compoParPaire.get(cle) ?? null,
      };
    });
    return calculerEleveSecondaire(studentId, matieres);
  });

  const rangs = classerSecondaire(eleves.map((e) => ({ studentId: e.studentId, moyenneGenerale: e.moyenneGenerale })));
  const elevesClasses = eleves.map((e) => ({ ...e, rang: rangs.get(e.studentId) ?? null }));

  // Moyenne de classe par matière = moyenne des MM de tous les élèves notés
  // dans cette matière — PAS la moyenne d'un seul élève. C'est précisément
  // le bug du bulletin de référence (extrêmes identiques à une seule note) :
  // il ne peut pas se reproduire ici puisque `eleves` porte TOUJOURS
  // l'effectif entier de la classe, jamais un élève isolé.
  const moyennesParMatiere: MoyenneMatiereClasse[] = classSubjects.map((cs) => {
    const mm = eleves
      .flatMap((e) => e.matieres.filter((m) => m.subjectId === cs.subject.id && m.mm !== null))
      .map((m) => m.mm as number);
    return {
      subjectId: cs.subject.id,
      name: cs.subject.name,
      moyenneClasse: mm.length ? roundTo2(moyenne(mm)) : null,
      effectifNote: mm.length,
    };
  });

  const generales = elevesClasses.map((e) => e.moyenneGenerale).filter((v): v is number => v !== null);

  return {
    eleves: elevesClasses,
    moyennesParMatiere,
    moyenneClasseGenerale: generales.length ? roundTo2(moyenne(generales)) : null,
    effectif: studentIds.length,
  };
}

function moyenne(valeurs: number[]): number {
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}
