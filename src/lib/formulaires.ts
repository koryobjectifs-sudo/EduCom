import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import { roleLabel } from "@/lib/permissions";
import { regleValide, resoudreAudience, libelleRegle } from "@/lib/audience";

/**
 * Formulaires façon Google Form — 26 sept. 2026.
 *
 * ═══ RÈGLES (seule autorité) ═══
 * Crée et envoie : direction, secrétariat (tout destinataire de l'école) ;
 *   enseignant : parents et enseignants de SES classes, et le personnel.
 * Voit un formulaire : ses destinataires, son auteur, la direction.
 * Voit les résultats : l'auteur et la direction (jamais les destinataires).
 *   Formulaire anonyme : aucun nom dans les résultats.
 * Répond : un destinataire, une fois (modifiable tant que ce n'est pas clos).
 */

export const TYPES_QUESTION = [
  { type: "choix", label: "Choix unique" },
  { type: "cases", label: "Cases à cocher" },
  { type: "court", label: "Réponse courte" },
  { type: "long", label: "Paragraphe" },
  { type: "echelle", label: "Note de 1 à 5" },
  { type: "nps", label: "Recommandation (0 à 10)" },
  { type: "date", label: "Date" },
] as const;
export type TypeQuestion = (typeof TYPES_QUESTION)[number]["type"];

export type Question = { id: string; type: TypeQuestion; titre: string; obligatoire: boolean; options: string[] };
export type Reponses = Record<string, string | string[]>;

const CREE_TOUT = ["OWNER", "ADMIN", "SECRETARY"];
const DIRECTION = ["OWNER", "ADMIN"];
export const peutCreerFormulaire = (role: string) => CREE_TOUT.includes(role) || role === "TEACHER";

/** Nettoie les questions reçues du navigateur (types connus, 1 à 30 questions, options 2 à 12). */
export function questionsValides(brut: unknown): Question[] | string {
  if (!Array.isArray(brut) || brut.length === 0) return "Ajoutez au moins une question.";
  if (brut.length > 30) return "30 questions au maximum.";
  const types = TYPES_QUESTION.map((t) => t.type) as string[];
  const sortie: Question[] = [];
  for (const [i, q] of brut.entries()) {
    const o = (q ?? {}) as Record<string, unknown>;
    const type = String(o.type ?? "");
    const titre = String(o.titre ?? "").trim().slice(0, 300);
    if (!types.includes(type)) return `Question ${i + 1} : type inconnu.`;
    if (!titre) return `Question ${i + 1} : écrivez l'intitulé.`;
    const options =
      type === "choix" || type === "cases"
        ? [...new Set((Array.isArray(o.options) ? o.options : []).map((x) => String(x).trim().slice(0, 150)).filter(Boolean))]
        : [];
    if ((type === "choix" || type === "cases") && (options.length < 2 || options.length > 12)) {
      return `Question ${i + 1} : de 2 à 12 réponses possibles.`;
    }
    sortie.push({ id: `q${i + 1}`, type: type as TypeQuestion, titre, obligatoire: Boolean(o.obligatoire), options });
  }
  return sortie;
}

/** Vérifie une réponse complète contre les questions. Renvoie les réponses nettoyées, ou un message d'erreur. */
export function reponsesValides(questions: Question[], brut: unknown): Reponses | string {
  const r = (brut ?? {}) as Record<string, unknown>;
  const sortie: Reponses = {};
  for (const q of questions) {
    const v = r[q.id];
    if (q.type === "cases") {
      const liste = (Array.isArray(v) ? v : []).map(String).filter((x) => q.options.includes(x));
      if (q.obligatoire && !liste.length) return `« ${q.titre} » est obligatoire.`;
      if (liste.length) sortie[q.id] = [...new Set(liste)];
      continue;
    }
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) {
      if (q.obligatoire) return `« ${q.titre} » est obligatoire.`;
      continue;
    }
    if (q.type === "choix" && !q.options.includes(s)) return `« ${q.titre} » : réponse invalide.`;
    if (q.type === "echelle" && !["1", "2", "3", "4", "5"].includes(s)) return `« ${q.titre} » : note de 1 à 5.`;
    if (q.type === "nps" && !/^(10|[0-9])$/.test(s)) return `« ${q.titre} » : note de 0 à 10.`;
    if (q.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return `« ${q.titre} » : date invalide.`;
    sortie[q.id] = s.slice(0, q.type === "long" ? 3000 : 300);
  }
  return sortie;
}

/**
 * Règles et personnes qu'un enseignant peut viser : ses classes, et le personnel.
 * Direction / secrétariat : toute l'école. Renvoie ce qui est autorisé.
 */
export async function destinatairesAutorises(
  actor: ActorContext,
  classIds: string[],
  regles: unknown,
  personnes: unknown,
): Promise<{ regles: string[]; personnes: string[] }> {
  const r = [...new Set((Array.isArray(regles) ? regles : []).filter(regleValide))].slice(0, 60);
  const p = [...new Set((Array.isArray(personnes) ? personnes : []).filter((x): x is string => typeof x === "string"))].slice(0, 2000);
  const connues = new Set(
    (await prisma.class.findMany({ where: { schoolId: actor.schoolId }, select: { id: true } })).map((c) => c.id),
  );
  let reglesOk = r.filter((x) => !x.includes("CLASSE:") || connues.has(x.split(":")[1]));
  const [personnel, eleves] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: p }, schoolId: actor.schoolId, role: { not: "PARENT" } }, select: { id: true } }),
    prisma.student.findMany({
      where: {
        schoolId: actor.schoolId,
        parentId: { in: p },
        ...(actor.role === "TEACHER" ? { enrollments: { some: { classId: { in: classIds } } } } : {}),
      },
      select: { parentId: true },
    }),
  ]);
  if (actor.role === "TEACHER") {
    reglesOk = reglesOk.filter((x) => (x.startsWith("PARENTS_CLASSE:") || x.startsWith("PROFS_CLASSE:")) && classIds.includes(x.split(":")[1]));
  }
  return {
    regles: reglesOk,
    personnes: [...new Set([...personnel.map((u) => u.id), ...eleves.map((e) => e.parentId!).filter(Boolean)])],
  };
}

export async function resoudreDestinataires(schoolId: string, regles: string[], personnes: string[]) {
  const a = await resoudreAudience(schoolId, regles, personnes);
  return [...new Set([...a.parents, ...a.personnel])];
}

/* ═══════════════════════ Lecture ═══════════════════════ */

const nom = (u?: { firstName: string | null; lastName: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || "—" : "—";

export type FormulaireResume = {
  id: string;
  titre: string;
  auteur: string;
  createdAt: string;
  closesAt: string | null;
  clos: boolean;
  aRepondre: boolean;
  dejaRepondu: boolean;
  estAuteur: boolean;
  reponses: number | null;
  destinataires: number | null;
};

/** Formulaires qui me concernent : reçus, créés par moi, et (direction) tous ceux de l'école. */
export async function listerFormulaires(actor: ActorContext): Promise<FormulaireResume[]> {
  const direction = DIRECTION.includes(actor.role);
  const forms = await prisma.communityForm.findMany({
    where: {
      schoolId: actor.schoolId,
      ...(direction ? {} : { OR: [{ authorId: actor.userId }, { recipients: { some: { userId: actor.userId } } }] }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      authorId: true,
      createdAt: true,
      closesAt: true,
      recipients: { where: { userId: actor.userId }, select: { id: true } },
      responses: { where: { userId: actor.userId }, select: { id: true } },
      _count: { select: { responses: true, recipients: true } },
    },
  });
  const auteurs = await prisma.user.findMany({
    where: { id: { in: [...new Set(forms.map((f) => f.authorId))] } },
    select: { id: true, firstName: true, lastName: true },
  });
  const parId = new Map(auteurs.map((a) => [a.id, a]));
  const maintenant = new Date();
  return forms.map((f) => {
    const clos = Boolean(f.closesAt && f.closesAt <= maintenant);
    const estAuteur = f.authorId === actor.userId;
    const voitStats = estAuteur || direction;
    return {
      id: f.id,
      titre: f.title,
      auteur: nom(parId.get(f.authorId)),
      createdAt: f.createdAt.toISOString(),
      closesAt: f.closesAt?.toISOString() ?? null,
      clos,
      aRepondre: f.recipients.length > 0 && f.responses.length === 0 && !clos,
      dejaRepondu: f.responses.length > 0,
      estAuteur,
      reponses: voitStats ? f._count.responses : null,
      destinataires: voitStats ? f._count.recipients : null,
    };
  });
}

export const nombreFormulairesARemplir = async (actor: ActorContext) =>
  prisma.communityForm.count({
    where: {
      schoolId: actor.schoolId,
      recipients: { some: { userId: actor.userId } },
      responses: { none: { userId: actor.userId } },
      OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
    },
  });

export type FormulaireVue = {
  id: string;
  titre: string;
  description: string | null;
  questions: Question[];
  anonyme: boolean;
  closesAt: string | null;
  clos: boolean;
  auteur: string;
  createdAt: string;
  destinataire: boolean;
  maReponse: Reponses | null;
  /** Auteur et direction seulement. */
  resultats: {
    destinataires: number;
    reponses: { nom: string | null; detail: string | null; date: string; answers: Reponses }[];
    sansReponse: { nom: string; detail: string }[];
    /** Suivi de chaque destinataire : envoyé → ouvert → répondu (preuve de réception). */
    suivi: { nom: string; detail: string; statut: "repondu" | "ouvert" | "envoye"; date: string | null }[];
    parents: number;
    personnel: number;
    ouverts: number;
    audience: string[];
  } | null;
  peutClore: boolean;
};

/** Un formulaire, si l'acteur y a droit (destinataire, auteur, direction). */
export async function chargerFormulaire(actor: ActorContext, id: string): Promise<FormulaireVue | null> {
  const direction = DIRECTION.includes(actor.role);
  const f = await prisma.communityForm.findFirst({
    where: {
      id,
      schoolId: actor.schoolId,
      ...(direction ? {} : { OR: [{ authorId: actor.userId }, { recipients: { some: { userId: actor.userId } } }] }),
    },
    include: {
      recipients: { select: { id: true, userId: true, seenAt: true } },
      responses: { select: { userId: true, answers: true, updatedAt: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!f) return null;
  // Preuve de réception : première ouverture par un destinataire.
  const moi = f.recipients.find((r) => r.userId === actor.userId);
  if (moi && !moi.seenAt) {
    moi.seenAt = new Date();
    await prisma.communityFormRecipient.update({ where: { id: moi.id }, data: { seenAt: moi.seenAt } }).catch(() => null);
  }
  const estAuteur = f.authorId === actor.userId;
  const voitResultats = estAuteur || direction;
  const clos = Boolean(f.closesAt && f.closesAt <= new Date());
  const ma = f.responses.find((r) => r.userId === actor.userId);

  let resultats: FormulaireVue["resultats"] = null;
  const auteur = await prisma.user.findUnique({ where: { id: f.authorId }, select: { firstName: true, lastName: true } });
  if (voitResultats) {
    const ids = [...new Set([...f.recipients.map((r) => r.userId), ...f.responses.map((r) => r.userId)])];
    const [users, classes] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, role: true } }),
      prisma.class.findMany({ where: { schoolId: actor.schoolId }, select: { id: true, name: true } }),
    ]);
    const u = new Map(users.map((x) => [x.id, x]));
    const repondu = new Set(f.responses.map((r) => r.userId));
    const reponduLe = new Map(f.responses.map((r) => [r.userId, r.updatedAt.toISOString()]));
    const statut = (r: { userId: string; seenAt: Date | null }) =>
      repondu.has(r.userId) ? ("repondu" as const) : r.seenAt ? ("ouvert" as const) : ("envoye" as const);
    const ordre = { envoye: 0, ouvert: 1, repondu: 2 };
    resultats = {
      destinataires: f.recipients.length,
      reponses: f.responses.map((r) => ({
        nom: f.anonymous ? null : nom(u.get(r.userId)),
        detail: f.anonymous ? null : roleLabel(u.get(r.userId)?.role ?? ""),
        date: r.updatedAt.toISOString(),
        answers: r.answers as Reponses,
      })),
      // La liste des personnes sans réponse reste visible même en anonyme : elle sert à relancer, pas à lire les réponses.
      sansReponse: f.recipients
        .filter((r) => !repondu.has(r.userId))
        .map((r) => ({ nom: nom(u.get(r.userId)), detail: roleLabel(u.get(r.userId)?.role ?? "") }))
        .slice(0, 500),
      suivi: f.recipients
        .map((r) => ({
          nom: nom(u.get(r.userId)),
          detail: roleLabel(u.get(r.userId)?.role ?? ""),
          statut: statut(r),
          date: reponduLe.get(r.userId) ?? r.seenAt?.toISOString() ?? null,
        }))
        .sort((a, b) => ordre[a.statut] - ordre[b.statut] || a.nom.localeCompare(b.nom, "fr"))
        .slice(0, 1000),
      parents: f.recipients.filter((r) => u.get(r.userId)?.role === "PARENT").length,
      personnel: f.recipients.filter((r) => u.get(r.userId) && u.get(r.userId)?.role !== "PARENT").length,
      ouverts: f.recipients.filter((r) => r.seenAt || repondu.has(r.userId)).length,
      audience: (Array.isArray(f.audience) ? (f.audience as string[]) : []).map((r) =>
        libelleRegle(r, new Map(classes.map((c) => [c.id, c.name]))),
      ),
    };
  }

  return {
    id: f.id,
    titre: f.title,
    description: f.description,
    questions: f.questions as Question[],
    anonyme: f.anonymous,
    closesAt: f.closesAt?.toISOString() ?? null,
    clos,
    auteur: nom(auteur),
    createdAt: f.createdAt.toISOString(),
    destinataire: f.recipients.some((r) => r.userId === actor.userId),
    maReponse: ma ? (ma.answers as Reponses) : null,
    resultats,
    peutClore: !clos && (estAuteur || direction),
  };
}
