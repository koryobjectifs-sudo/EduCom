"use server";

/**
 * Conseil de classe — lot 18/3. Administration uniquement (OWNER/ADMIN) :
 * `hasAccess()` referme déjà ce chemin à tout autre rôle (voir
 * `ROLE_DENIALS.TEACHER` dans `src/lib/permissions.ts` — les autres rôles
 * n'ont de toute façon aucun accès à `/dashboard/grades/*`).
 *
 * Distinctions PROPOSÉES automatiquement (≥12/14/16), jamais imposées : la
 * proposition se recalcule ici à la demande depuis la moyenne du lot 2, elle
 * n'est stockée nulle part (voir le commentaire de `TermReview` au schéma).
 * Seule la décision retenue par le conseil est écrite.
 */
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { calculerClasseSecondaire } from "@/lib/notes/secondaire-classe";
import { calculerClasseElementaire } from "@/lib/notes/elementaire-classe";

const PATH = "/dashboard/grades/conseil";

export type Distinction = "TABLEAU_HONNEUR" | "ENCOURAGEMENTS" | "FELICITATIONS" | null;

export function proposerDistinction(moyenneGenerale: number | null): Distinction {
  if (moyenneGenerale === null) return null;
  if (moyenneGenerale >= 16) return "FELICITATIONS";
  if (moyenneGenerale >= 14) return "ENCOURAGEMENTS";
  if (moyenneGenerale >= 12) return "TABLEAU_HONNEUR";
  return null;
}

export type ConseilLigne = {
  studentId: string;
  firstName: string;
  lastName: string;
  moyenneGenerale: number | null;
  rang: number | null;
  distinctionProposee: Distinction;
  distinctionRetenue: string | null;
  sanctionTravail: string | null;
  sanctionConduite: string | null;
  decisionOrientation: string | null;
  absencesJustifiees: number | null;
  absencesNonJustifiees: number | null;
  observationsConseil: string | null;
};

export type ConseilContext =
  | {
      ok: true;
      classId: string; className: string;
      termId: string; termName: string;
      /** Décision d'orientation activable seulement au 3e trimestre. */
      orientationActivable: boolean;
      lignes: ConseilLigne[];
    }
  | { ok: false; error: string };

/**
 * "3e trimestre" se lit par POSITION chronologique, jamais par un nom de
 * libellé qui varierait d'une école à l'autre — même principe que
 * `pickCurrentTerm()` (`src/lib/terms.ts`).
 */
async function estTroisiemeTrimestre(schoolId: string, termId: string): Promise<boolean> {
  const terms = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, startDate: true, createdAt: true },
  });
  const dates = terms.filter((t) => t.startDate !== null).sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
  const sansDate = terms.filter((t) => t.startDate === null).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const ordonnes = [...dates, ...sansDate];
  // Le 3e trimestre est le TROISIÈME de la liste chronologique — jamais le
  // dernier quel que soit leur nombre : une école qui en déclarerait 4 par
  // erreur ne doit pas voir l'orientation s'ouvrir sur le mauvais trimestre.
  return ordonnes.length >= 3 && ordonnes[2].id === termId;
}

export async function getConseilContext(classId: string, termId: string, cycle: "ELEMENTAIRE" | "SECONDAIRE"): Promise<ConseilContext> {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { ctx } = auth;

  const klass = await prisma.class.findFirst({ where: { id: classId, schoolId: ctx.schoolId }, select: { id: true, name: true } });
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  const term = await prisma.term.findFirst({ where: { id: termId, schoolId: ctx.schoolId }, select: { id: true, name: true } });
  if (!term) return { ok: false, error: "Trimestre introuvable." };

  const [moyennes, reviews] = await Promise.all([
    cycle === "SECONDAIRE"
      ? calculerClasseSecondaire({ schoolId: ctx.schoolId, classId, termId })
      : calculerClasseElementaire({ schoolId: ctx.schoolId, classId, termId }),
    prisma.termReview.findMany({ where: { classId, termId }, select: {
      studentId: true, distinctionRetenue: true, sanctionTravail: true, sanctionConduite: true,
      decisionOrientation: true, absencesJustifiees: true, absencesNonJustifiees: true, observationsConseil: true,
    } }),
  ]);
  const reviewParEleve = new Map(reviews.map((r) => [r.studentId, r]));

  const students = await prisma.student.findMany({
    where: { id: { in: moyennes.eleves.map((e) => e.studentId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const studentParId = new Map(students.map((s) => [s.id, s]));

  const orientationActivable = await estTroisiemeTrimestre(ctx.schoolId, termId);

  const lignes: ConseilLigne[] = moyennes.eleves.map((e) => {
    const s = studentParId.get(e.studentId);
    const r = reviewParEleve.get(e.studentId);
    return {
      studentId: e.studentId,
      firstName: s?.firstName ?? "?", lastName: s?.lastName ?? "?",
      moyenneGenerale: e.moyenneGenerale, rang: e.rang,
      distinctionProposee: proposerDistinction(e.moyenneGenerale),
      distinctionRetenue: r?.distinctionRetenue ?? null,
      sanctionTravail: r?.sanctionTravail ?? null,
      sanctionConduite: r?.sanctionConduite ?? null,
      decisionOrientation: r?.decisionOrientation ?? null,
      absencesJustifiees: r?.absencesJustifiees ?? null,
      absencesNonJustifiees: r?.absencesNonJustifiees ?? null,
      observationsConseil: r?.observationsConseil ?? null,
    };
  });

  return { ok: true, classId, className: klass.name, termId, termName: term.name, orientationActivable, lignes };
}

export async function saveConseilDecision(input: {
  studentId: string; classId: string; termId: string;
  distinctionRetenue?: string | null;
  sanctionTravail?: string | null;
  sanctionConduite?: string | null;
  decisionOrientation?: string | null;
  absencesJustifiees?: number | null;
  absencesNonJustifiees?: number | null;
  observationsConseil?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { ctx } = auth;

  const klass = await prisma.class.findFirst({ where: { id: input.classId, schoolId: ctx.schoolId }, select: { id: true } });
  if (!klass) return { ok: false, error: "Classe introuvable dans votre établissement." };

  const enrolled = await prisma.enrollment.findFirst({ where: { classId: input.classId, studentId: input.studentId }, select: { id: true } });
  if (!enrolled) return { ok: false, error: "Cet élève n'est pas inscrit dans cette classe." };

  const term = await prisma.term.findFirst({ where: { id: input.termId, schoolId: ctx.schoolId }, select: { id: true } });
  if (!term) return { ok: false, error: "Trimestre introuvable." };

  // ⚠️ Verrou explicite, pas seulement une case grisée à l'écran : une
  // décision d'orientation hors 3e trimestre n'a pas de sens pédagogique.
  if (input.decisionOrientation !== undefined && input.decisionOrientation !== null) {
    const troisieme = await estTroisiemeTrimestre(ctx.schoolId, input.termId);
    if (!troisieme) {
      return { ok: false, error: "La décision d'orientation ne peut être saisie qu'au 3e trimestre." };
    }
  }

  const data: Record<string, unknown> = { updatedById: ctx.userId };
  for (const key of [
    "distinctionRetenue", "sanctionTravail", "sanctionConduite", "decisionOrientation",
    "absencesJustifiees", "absencesNonJustifiees", "observationsConseil",
  ] as const) {
    if (input[key] !== undefined) data[key] = input[key];
  }

  await prisma.termReview.upsert({
    where: { studentId_termId: { studentId: input.studentId, termId: input.termId } },
    create: { studentId: input.studentId, classId: input.classId, termId: input.termId, schoolId: ctx.schoolId, ...data },
    update: data,
  });
  return { ok: true };
}
