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

/** "Terminale S2" / "2nde S" / "Seconde S" → "Terminale" | "Seconde" | null. Local à ce module : pas de dépendance vers `classOrder.ts`, pour rester étanche. */
function deriverNiveau(nomClasse: string): string | null {
  const n = nomClasse
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (n.includes("terminale") || /\btle\b/.test(n)) return "Terminale";
  if (n.includes("seconde") || /\b2nde\b/.test(n)) return "Seconde";
  if (n.includes("premiere") || /\b1ere\b/.test(n)) return "Première";
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

  // Référentiel de coefficients (niveau, série) — ne remplace le coefficient
  // de classe QUE s'il existe une entrée pour ce (niveau, série, code).
  const coefficientsReferentiel =
    niveau && classe.serie
      ? await prisma.subjectCoefficient.findMany({
          where: { schoolId, niveau, serie: classe.serie },
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
      const coefficient = coefficientReferentiel ?? cs.coefficient;
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
