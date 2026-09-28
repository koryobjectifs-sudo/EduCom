import { prisma } from "@/lib/prisma";
import { estCapacite, incluseDansMetier, type Capacite } from "@/lib/capacites";

/**
 * Équipe — configuration d'un membre en un seul endroit (26 sept. 2026).
 *
 * ═══ SOURCE UNIQUE ═══
 * Ce qu'un enseignant enseigne vit dans les tables DÉJÀ lues partout :
 *   `Class.teacherId` (titulaire / professeur principal) et `TeachingAssignment`
 *   (classe × matière). Écrire ici, c'est donc mettre à jour d'un coup la
 *   saisie des notes, les classes visibles, le tableau de bord de la direction
 *   (« matières sans enseignant », « affectations ») et Pédagogie → Classes /
 *   enseignants — sans rien à refaire ailleurs.
 * Les matières proposées sont celles DE LA CLASSE (`ClassSubject`) : on ne
 * peut pas affecter une matière qui n'est pas au programme de la classe.
 */
export type ConfigEnseignant = {
  titulaire: string[];
  matieres: { classId: string; subjectId: string }[];
};

export type DonneesEquipe = {
  classes: {
    id: string;
    nom: string;
    elementaire: boolean;
    titulaireId: string | null;
    matieres: { id: string; nom: string }[];
  }[];
};

export async function donneesAffectation(
  schoolId: string,
): Promise<DonneesEquipe> {
  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      cycle: true,
      teacherId: true,
      subjects: { select: { subject: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });
  return {
    classes: classes.map((c) => ({
      id: c.id,
      nom: c.name,
      elementaire: c.cycle === "ELEMENTAIRE" || c.cycle === "PRESCOLAIRE",
      titulaireId: c.teacherId,
      matieres: c.subjects
        .map((s) => ({ id: s.subject.id, nom: s.subject.name }))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    })),
  };
}

/** Garde seulement ce qui existe dans l'école : classes de l'école, couples classe × matière du programme. */
export async function configValide(
  schoolId: string,
  brut: unknown,
): Promise<ConfigEnseignant> {
  const o = (brut ?? {}) as { titulaire?: unknown; matieres?: unknown };
  const titulaire = [
    ...new Set(
      Array.isArray(o.titulaire)
        ? o.titulaire.filter((x): x is string => typeof x === "string")
        : [],
    ),
  ];
  const matieresBrutes = Array.isArray(o.matieres) ? o.matieres : [];
  const d = await donneesAffectation(schoolId);
  const classes = new Map(d.classes.map((c) => [c.id, c]));
  const vus = new Set<string>();
  const matieres: ConfigEnseignant["matieres"] = [];
  for (const m of matieresBrutes) {
    const classId = typeof m?.classId === "string" ? m.classId : "";
    const subjectId = typeof m?.subjectId === "string" ? m.subjectId : "";
    const c = classes.get(classId);
    if (
      !c ||
      !c.matieres.some((x) => x.id === subjectId) ||
      vus.has(`${classId}:${subjectId}`)
    )
      continue;
    vus.add(`${classId}:${subjectId}`);
    matieres.push({ classId, subjectId });
  }
  return { titulaire: titulaire.filter((id) => classes.has(id)), matieres };
}

/** Capacités accordées retenues : catalogue connu, sans celles que le métier inclut déjà. */
export function accesValides(role: string, brut: unknown): Capacite[] {
  const liste = Array.isArray(brut) ? brut.filter(estCapacite) : [];
  return [...new Set(liste)].filter((c) => !incluseDansMetier(role, c));
}

/**
 * Remplace la configuration d'un membre : ses classes titulaires, ses matières,
 * ses accès en plus. Tout ou rien (transaction). Un membre qui n'est plus
 * enseignant perd ses affectations (rien d'orphelin ne reste ouvert).
 */
export async function appliquerConfiguration(params: {
  schoolId: string;
  userId: string;
  role: string;
  config: ConfigEnseignant;
  acces: Capacite[];
  parId: string;
  /** Il était enseignant et ne l'est plus : ses classes sont libérées. */
  etaitEnseignant?: boolean;
}) {
  const { schoolId, userId, role, parId } = params;
  const enseignant = role === "TEACHER";
  // Un non-enseignant qui ne l'a jamais été : on ne touche pas aux classes
  // (une directrice peut être titulaire d'une classe saisie ailleurs).
  const toucherClasses = enseignant || Boolean(params.etaitEnseignant);
  const config = enseignant ? params.config : { titulaire: [], matieres: [] };
  await prisma.$transaction(
    async (tx) => {
      if (toucherClasses) {
        await tx.class.updateMany({
          where: {
            schoolId,
            teacherId: userId,
            id: { notIn: config.titulaire },
          },
          data: { teacherId: null },
        });
        if (config.titulaire.length)
          await tx.class.updateMany({
            where: { schoolId, id: { in: config.titulaire } },
            data: { teacherId: userId },
          });
        await tx.teachingAssignment.deleteMany({
          where: { schoolId, teacherId: userId },
        });
        if (config.matieres.length) {
          await tx.teachingAssignment.createMany({
            data: config.matieres.map((m) => ({
              schoolId,
              teacherId: userId,
              classId: m.classId,
              subjectId: m.subjectId,
            })),
            skipDuplicates: true,
          });
        }
      }
      await tx.staffGrant.deleteMany({
        where: { schoolId, userId, capability: { notIn: params.acces } },
      });
      if (params.acces.length) {
        await tx.staffGrant.createMany({
          data: params.acces.map((capability) => ({
            schoolId,
            userId,
            capability,
            grantedById: parId,
          })),
          skipDuplicates: true,
        });
      }
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
}

/** Configuration actuelle d'un membre (fiche). */
export async function configurationDe(
  schoolId: string,
  userId: string,
): Promise<{ config: ConfigEnseignant; acces: string[] }> {
  const [titulaire, matieres, acces] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId, teacherId: userId },
      select: { id: true },
    }),
    prisma.teachingAssignment.findMany({
      where: { schoolId, teacherId: userId, subjectId: { not: null } },
      select: { classId: true, subjectId: true },
    }),
    prisma.staffGrant
      .findMany({ where: { schoolId, userId }, select: { capability: true } })
      .catch(() => []),
  ]);
  return {
    config: {
      titulaire: titulaire.map((c) => c.id),
      matieres: matieres.map((m) => ({
        classId: m.classId,
        subjectId: m.subjectId!,
      })),
    },
    acces: acces.map((a) => a.capability).filter(estCapacite),
  };
}

const MOTS = [
  "Baobab",
  "Teranga",
  "Sahel",
  "Kora",
  "Djembe",
  "Niokolo",
  "Saloum",
  "Casamance",
];
/** Mot de passe provisoire lisible (≥ 8 caractères), à changer à la première connexion. */
export function motDePasseProvisoire(): string {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `${MOTS[a[0] % MOTS.length]}-${1000 + (a[1] % 9000)}`;
}

/** Applique la configuration préparée à l'invitation (à l'acceptation). Idempotent. */
export async function appliquerConfigurationInvitation(
  schoolId: string,
  email: string,
  userId: string,
  role: string,
) {
  try {
    const s = await prisma.staffSetup.findUnique({
      where: { schoolId_email: { schoolId, email: email.trim().toLowerCase() } },
    });
    if (!s || s.appliedAt) return;
    const pris = await prisma.staffSetup.updateMany({
      where: { id: s.id, appliedAt: null },
      data: { appliedAt: new Date() },
    });
    if (!pris.count) return;
    await appliquerConfiguration({
      schoolId,
      userId,
      role,
      config: await configValide(schoolId, s.assignments),
      acces: accesValides(role, s.capabilities),
      parId: s.createdById,
    });
  } catch (e) {
    console.error(
      "[équipe] configuration de l'invitation non appliquée :",
      (e as Error).message,
    );
  }
}
