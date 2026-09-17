import { prisma } from "@/lib/prisma";
import { deriverNiveau } from "./secondaire-classe";

export type CanonicalSubject = {
  code: string;
  name: string;
  alias: string[];
};

export const CANONICAL_SUBJECTS: CanonicalSubject[] = [
  { code: "FR", name: "Français", alias: ["Français", "Francais"] },
  { code: "MATH", name: "Mathématiques", alias: ["Maths", "Mathématiques"] },
  {
    code: "HG",
    name: "Histoire-Géographie",
    alias: [
      "Hist-Géo",
      "Histoire-Géographie",
      "Histoire-Géo",
      "Histoire Géographie",
      "Histoire - Géographie",
      "Histoire - Géographie - Éducation civique",
    ],
  },
  { code: "ANG", name: "Anglais", alias: ["Anglais", "Langue vivante 1", "LV1"] },
  { code: "SVT", name: "SVT", alias: ["SVT", "Sciences de la Vie et de la Terre", "Sciences naturelles"] },
  {
    code: "EPS",
    name: "Éducation Physique (EPS)",
    alias: ["Éducation Physique (EPS)", "EPS", "Éducation Physique", "Education Physique"],
  },
  { code: "PC", name: "Physique-Chimie", alias: ["PC", "Physique-Chimie", "Sciences Physiques", "Physique Chimie"] },
  { code: "LV2", name: "LV2", alias: ["LV2", "Espagnol", "Arabe", "Italien", "Allemand", "Langue vivante 2"] },
  { code: "PHIL", name: "Philosophie", alias: ["Philo", "Philosophie"] },
];

/**
 * Retourne les codes des matières officielles propres au niveau et à la série d'une classe.
 * - Élémentaire & Préscolaire : aucun ClassSubject (évaluation par domaines/sous-disciplines).
 * - 6e et 5e : Français, Maths, Hist-Géo, Anglais, SVT, EPS (ni PC, ni LV2).
 * - 4e et 3e : les précédentes + PC + LV2.
 * - Seconde L / S : grilles spécifiques.
 * - Première & Terminale : par séries L1, L2, S1, S2.
 */
export function getSubjectCodesForClass(params: {
  cycle: string;
  className: string;
  serie?: string | null;
}): string[] {
  const { cycle, className, serie } = params;

  // 1. Élémentaire et préscolaire : domaines et sous-disciplines, pas de matières
  const nNorm = className
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (
    cycle === "ELEMENTAIRE" ||
    cycle === "PRESCOLAIRE" ||
    ["ci", "cp", "ce1", "ce2", "cm1", "cm2", "petite section", "moyenne section", "grande section"].some(
      (prefix) => nNorm === prefix || nNorm.startsWith(`${prefix} `) || nNorm.startsWith(`${prefix}-`),
    )
  ) {
    return [];
  }

  const niveau = deriverNiveau(className);
  const effectiveSerie = (
    serie ||
    (nNorm.includes("l1")
      ? "L1"
      : nNorm.includes("l2")
        ? "L2"
        : nNorm.includes("s1")
          ? "S1"
          : nNorm.includes("s2")
            ? "S2"
            : /\b(l|litteraire)\b/.test(nNorm)
              ? "L"
              : /\b(s|scientifique)\b/.test(nNorm)
                ? "S"
                : null)
  )?.toUpperCase() || null;

  // 2. Collège : 6e et 5e (Français en tête, Maths, HG, Anglais, SVT, EPS - ni PC ni LV2)
  if (niveau === "6e" || niveau === "5e") {
    return ["FR", "MATH", "HG", "ANG", "SVT", "EPS"];
  }

  // 3. Collège : 4e et 3e (+ PC et LV2)
  if (niveau === "4e" || niveau === "3e") {
    return ["FR", "MATH", "HG", "ANG", "SVT", "EPS", "PC", "LV2"];
  }

  // 4. Seconde
  if (niveau === "Seconde") {
    if (effectiveSerie === "L") {
      return ["FR", "HG", "ANG", "LV2", "MATH", "SVT", "PC", "EPS"];
    }
    if (effectiveSerie === "S" || effectiveSerie === "S2") {
      return ["MATH", "PC", "SVT", "FR", "HG", "ANG", "LV2", "EPS"];
    }
    // Tronc commun général Seconde
    return ["FR", "MATH", "PC", "SVT", "HG", "ANG", "LV2", "EPS"];
  }

  // 5. Première et Terminale par série
  if (niveau === "Première" || niveau === "Terminale") {
    if (effectiveSerie === "L1") {
      return ["FR", "PHIL", "HG", "ANG", "MATH", "LV2", "EPS"];
    }
    if (effectiveSerie === "L2") {
      return ["FR", "PHIL", "HG", "ANG", "MATH", "PC", "EPS"];
    }
    if (effectiveSerie === "S1") {
      return ["MATH", "PC", "SVT", "FR", "HG", "ANG", "PHIL", "EPS"];
    }
    if (effectiveSerie === "S2") {
      return ["MATH", "PC", "SVT", "FR", "HG", "ANG", "PHIL", "EPS"];
    }
    if (effectiveSerie === "L") {
      return ["FR", "PHIL", "HG", "ANG", "MATH", "LV2", "EPS"];
    }
    if (effectiveSerie === "S") {
      return ["MATH", "PC", "SVT", "FR", "HG", "ANG", "PHIL", "EPS"];
    }
    return ["FR", "MATH", "PC", "SVT", "HG", "ANG", "PHIL", "EPS"];
  }

  // 6. Fallback par cycle si niveau non reconnu
  if (cycle === "MOYEN") {
    return ["FR", "MATH", "HG", "ANG", "SVT", "EPS", "PC", "LV2"];
  }
  if (cycle === "SECONDAIRE") {
    return ["FR", "MATH", "PC", "SVT", "HG", "ANG", "PHIL", "EPS"];
  }

  return [];
}

/**
 * Résout le coefficient par défaut pour un code matière, niveau et série.
 */
export function getDefaultCoefficient(code: string, niveau: string | null, serie: string | null): number {
  if (niveau === "6e" || niveau === "5e") {
    if (code === "FR") return 4;
    if (code === "MATH") return 3;
    if (code === "HG") return 2;
    if (code === "ANG") return 2;
    if (code === "SVT") return 2;
    if (code === "EPS") return 1;
    return 1;
  }

  if (niveau === "4e" || niveau === "3e") {
    if (code === "FR") return 4;
    if (code === "MATH") return 3;
    if (code === "HG") return 2;
    if (code === "ANG") return 2;
    if (code === "SVT") return 2;
    if (code === "PC") return 2;
    if (code === "LV2") return 2;
    if (code === "EPS") return 1;
    return 1;
  }

  if (niveau === "Seconde") {
    if (serie === "L") {
      if (code === "FR") return 5;
      if (code === "HG") return 4;
      if (code === "ANG") return 3;
      if (code === "MATH") return 3;
      if (code === "LV2") return 2;
      if (code === "SVT") return 2;
      if (code === "PC") return 2;
      if (code === "EPS") return 1;
    }
    if (serie === "S" || serie === "S2") {
      if (code === "MATH") return 5;
      if (code === "PC") return 5;
      if (code === "SVT") return 4;
      if (code === "FR") return 3;
      if (code === "HG") return 2;
      if (code === "ANG") return 2;
      if (code === "LV2") return 2;
      if (code === "EPS") return 1;
    }
  }

  if (niveau === "Terminale" || niveau === "Première") {
    if (serie === "S1") {
      if (code === "MATH") return 8;
      if (code === "PC") return 8;
      if (code === "SVT") return 2;
      if (code === "FR") return 2;
      if (code === "HG") return 2;
      if (code === "ANG") return 2;
      if (code === "PHIL") return 2;
      if (code === "EPS") return 1;
    }
    if (serie === "S2") {
      if (code === "MATH") return 5;
      if (code === "PC") return 6;
      if (code === "SVT") return 6;
      if (code === "FR") return 2;
      if (code === "HG") return 2;
      if (code === "ANG") return 2;
      if (code === "PHIL") return 2;
      if (code === "EPS") return 1;
    }
    if (serie === "L1") {
      if (code === "FR") return 6;
      if (code === "PHIL") return 6;
      if (code === "ANG") return 3;
      if (code === "MATH") return 2;
      if (code === "HG") return 2;
      if (code === "LV2") return 2;
      if (code === "EPS") return 1;
    }
    if (serie === "L2") {
      if (code === "HG") return 6;
      if (code === "PHIL") return 6;
      if (code === "FR") return 5;
      if (code === "ANG") return 4;
      if (code === "MATH") return 2;
      if (code === "PC") return 2;
      if (code === "EPS") return 1;
    }
  }

  // Défauts génériques
  if (code === "FR") return 4;
  if (code === "MATH") return 4;
  if (code === "PC") return 3;
  if (code === "SVT") return 3;
  if (code === "EPS") return 1;
  return 2;
}

/**
 * Assure qu'une matière canonique existe avec son code dans l'école.
 */
export async function ensureSubjectForSchool(
  schoolId: string,
  code: string,
  client = prisma,
): Promise<{ id: string; name: string; code: string | null }> {
  const canonical = CANONICAL_SUBJECTS.find((c) => c.code === code);
  if (!canonical) throw new Error(`Code matière inconnu : ${code}`);

  // 1. Chercher par code exact dans l'école
  const byCode = await client.subject.findFirst({
    where: { schoolId, code },
    select: { id: true, name: true, code: true },
  });
  if (byCode) return byCode;

  // 2. Chercher par alias existant sans code dans l'école
  const byAlias = await client.subject.findFirst({
    where: { schoolId, name: { in: canonical.alias } },
    select: { id: true, name: true, code: true },
  });
  if (byAlias) {
    const updated = await client.subject.update({
      where: { id: byAlias.id },
      data: { code },
      select: { id: true, name: true, code: true },
    });
    return updated;
  }

  // 3. Créer la matière officielle avec son code
  const created = await client.subject.create({
    data: {
      schoolId,
      name: canonical.name,
      code,
    },
    select: { id: true, name: true, code: true },
  });
  return created;
}

/**
 * Rapproche et attache automatiquement les matières d'une classe selon son niveau et sa série.
 * Idempotent : ne duplique aucun ClassSubject existant et ne modifie pas les coefficients personnalisés.
 */
export async function attachCurriculumSubjectsToClass(
  classId: string,
  client = prisma,
): Promise<{ attached: number; existing: number; codes: string[] }> {
  const classe = await client.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true, cycle: true, serie: true, schoolId: true },
  });
  if (!classe) return { attached: 0, existing: 0, codes: [] };

  const codes = getSubjectCodesForClass({
    cycle: classe.cycle,
    className: classe.name,
    serie: classe.serie,
  });

  if (codes.length === 0) {
    return { attached: 0, existing: 0, codes: [] };
  }

  const niveau = deriverNiveau(classe.name);

  // Charger les ClassSubject déjà existants
  const existingClassSubjects = await client.classSubject.findMany({
    where: { classId },
    select: { subjectId: true },
  });
  const existingSubjectIds = new Set(existingClassSubjects.map((cs) => cs.subjectId));

  let attached = 0;
  let existing = 0;

  for (const code of codes) {
    const subject = await ensureSubjectForSchool(classe.schoolId, code, client);

    if (existingSubjectIds.has(subject.id)) {
      existing++;
      continue;
    }

    // Déterminer le coefficient : priorité au SubjectCoefficient de l'école, sinon défaut
    let coef: number | null = null;
    if (niveau) {
      const subCoef = await client.subjectCoefficient.findFirst({
        where: {
          schoolId: classe.schoolId,
          niveau,
          serie: classe.serie || null,
          subjectId: subject.id,
        },
        select: { coefficient: true },
      });
      if (subCoef && subCoef.coefficient > 0) {
        coef = subCoef.coefficient;
      }
    }

    if (coef === null) {
      coef = getDefaultCoefficient(code, niveau, classe.serie || null);
    }

    await client.classSubject.create({
      data: {
        classId,
        subjectId: subject.id,
        coefficient: coef,
      },
    });
    existingSubjectIds.add(subject.id);
    attached++;
  }

  return { attached, existing, codes };
}
