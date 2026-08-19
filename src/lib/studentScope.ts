import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import type { Prisma, DocCategory } from "../generated/prisma/client";

/**
 * Périmètre d'un acteur sur les élèves et leurs pièces — lot 13.1.
 *
 * ═══ CE FICHIER N'EST PAS UNE SECONDE MATRICE DE PERMISSIONS ═══
 *
 * `src/lib/permissions.ts` répond à une question : **à quels écrans** un rôle
 * accède. Il reste la seule source de vérité pour cela, et rien ici ne le
 * contredit ni ne le duplique — aucun chemin n'est réécrit, `hasAccess()` est
 * toujours appelé en amont par les pages et les server actions.
 *
 * Ce fichier répond à la question suivante, que `hasAccess()` ne pose pas :
 * **sur quelles lignes**. Avoir `/dashboard/students` dit qu'un enseignant a le
 * droit d'ouvrir l'annuaire ; cela ne dit pas que l'annuaire doit lui montrer
 * les 400 élèves de l'établissement.
 *
 * ⚠️ **Pourquoi cette distinction n'existait pas avant le lot 13.1.** Tant que
 * l'écran élève ne portait qu'un état civil, « école » suffisait comme borne.
 * Le dossier numérique y a versé des pièces d'identité et des pièces de santé :
 * la même borne est devenue trop large du jour au lendemain. L'audit du lot 13
 * l'a constaté en conditions réelles — un enseignant ouvrait le dossier complet
 * de n'importe quel élève de l'école.
 *
 * ⚠️ **Fermeture par défaut.** Un rôle inconnu ne reçoit rien. Une catégorie
 * documentaire dont la règle métier n'est pas tranchée est refusée, jamais
 * accordée « en attendant ».
 */

/* ═════════════════ classes d'un enseignant ═════════════════ */

/**
 * Classes couvertes par un enseignant.
 *
 * Même règle que l'écran de saisie des notes : affectation explicite
 * (`TeachingAssignment`) **ou** titularité (`Class.teacherId`).
 *
 * ⚠️ `TeachingAssignment` est vide sur les bases installées avant le chantier
 * « affectations » ; ne lire que cette table enfermerait dehors tout enseignant
 * simplement titulaire d'une classe. Le piège est documenté dans `context.md`
 * et cette fonction est la raison pour laquelle il ne se reproduit pas : elle
 * est désormais l'unique endroit qui répond à « quelles classes sont les
 * siennes », pour les rapports (lot 12) comme pour le dossier (lot 13).
 */
export async function teacherClassIds(actor: ActorContext): Promise<string[]> {
  const [assigned, owned] = await Promise.all([
    prisma.teachingAssignment.findMany({
      where: { schoolId: actor.schoolId, teacherId: actor.userId },
      select: { classId: true },
    }),
    prisma.class.findMany({
      where: { schoolId: actor.schoolId, teacherId: actor.userId },
      select: { id: true },
    }),
  ]);
  return [...new Set([...assigned.map((a) => a.classId), ...owned.map((c) => c.id)])];
}

/* ═════════════════ quelles lignes élève ═════════════════ */

/**
 * Filtre Prisma bornant les élèves visibles par l'acteur.
 *
 * Il commence TOUJOURS par `schoolId` : le périmètre par rôle s'ajoute à
 * l'isolation multi-établissement, il ne la remplace pas. Deux verrous plutôt
 * qu'un, comme partout ailleurs dans ce dépôt.
 *
 *   direction / secrétariat / assistance → tous les élèves de l'école
 *   enseignant                           → ceux inscrits dans SES classes
 *   parent                               → SES enfants
 *   tout autre rôle                      → aucun
 *
 * ⚠️ Le cas `PARENT` n'est pas atteignable aujourd'hui : `hasAccess(PARENT,
 * "/dashboard/students")` est faux. Il est écrit quand même, et c'est
 * délibéré — l'audit du lot 13 a montré que la protection reposait alors
 * entièrement sur l'absence de ce chemin. Le jour où un portail parent
 * l'accordera, la borne existe déjà ; sans elle, ouvrir le chemin ouvrirait
 * du même geste le dossier de tous les enfants de l'établissement.
 */
export async function studentWhereFor(actor: ActorContext): Promise<Prisma.StudentWhereInput> {
  const school = { schoolId: actor.schoolId };

  switch (actor.role) {
    case "OWNER":
    case "ADMIN":
    case "SECRETARY":
    case "ASSISTANT":
      return school;

    case "TEACHER": {
      const classIds = await teacherClassIds(actor);
      // Aucune classe ⇒ aucun élève. `{ in: [] }` ne renvoie rien : c'est le
      // comportement voulu, pas un filtre inerte.
      return { ...school, enrollments: { some: { classId: { in: classIds } } } };
    }

    case "PARENT":
      return { ...school, parentId: actor.userId };

    default:
      // Fermeture par défaut : un rôle ajouté demain ne reçoit rien tant que sa
      // règle n'est pas écrite ici.
      return { ...school, id: { in: [] } };
  }
}

/**
 * Vrai si l'acteur a le droit de voir CET élève.
 *
 * ⚠️ Passe par la base, jamais par ce que le client affirme. L'identifiant vient
 * de l'URL ou d'un argument de server action : il ne prouve rien.
 */
export async function canSeeStudent(actor: ActorContext, studentId: string): Promise<boolean> {
  const scope = await studentWhereFor(actor);
  // ⚠️ `AND`, jamais un étalement d'objet : `{ ...scope, id: studentId }`
  // ÉCRASERAIT la clé `id` du refus par défaut (`id: { in: [] }`) et
  // transformerait la fermeture en ouverture. Le piège est silencieux.
  const n = await prisma.student.count({
    where: { AND: [scope, { id: studentId, schoolId: actor.schoolId }] },
  });
  return n > 0;
}

/* ═════════════════ quelles catégories de pièces ═════════════════ */

/**
 * Catégories consultables par un enseignant.
 *
 * ⚠️ **Aucune de ces deux listes n'est inventée.** Elles sont déduites de ce que
 * le dépôt dit déjà du métier d'enseignant — `ROLE_LABELS.TEACHER` : « Ses
 * classes, ses élèves et la saisie des notes ». SCOLARITE et EXAMENS sont le
 * versant documentaire de ce travail : bulletins, certificats de scolarité,
 * résultats d'examens.
 *
 * IDENTITE, INSCRIPTION et TRANSFERT sont des pièces administratives : elles
 * relèvent du secrétariat, qui les réclame et les contrôle. SANTE est médical.
 * Un enseignant n'a pas à consulter le dossier médical d'un élève pour lui faire
 * cours ; c'est précisément la fuite constatée par l'audit du lot 13.
 *
 * ⚠️ **AUTRES reste une décision métier ouverte.** C'est un fourre-tout : son
 * contenu est inconnu par construction, il peut aussi bien porter une
 * autorisation de sortie qu'un jugement de divorce. Rien dans le dépôt ne
 * permet de trancher, donc rien n'est tranché : la catégorie est refusée à
 * l'enseignant (fermeture par défaut), et le point est consigné dans
 * `rappel.md` comme arbitrage à rendre par la direction.
 */
export const TEACHER_DOC_CATEGORIES: readonly DocCategory[] = ["SCOLARITE", "EXAMENS"];

/**
 * Catégories visibles par l'acteur. `null` = toutes.
 *
 * `null` et « la liste complète » ne sont pas la même chose : `null` dit qu'il
 * n'y a pas de restriction, et permet à l'appelant d'afficher le dossier tel
 * quel plutôt qu'une vue annoncée comme partielle.
 */
export function visibleCategories(actor: ActorContext): readonly DocCategory[] | null {
  switch (actor.role) {
    case "OWNER":
    case "ADMIN":
    case "SECRETARY":
    case "ASSISTANT":
      return null;
    case "TEACHER":
      return TEACHER_DOC_CATEGORIES;
    default:
      return [];
  }
}

/** Vrai si l'acteur peut consulter une pièce de cette catégorie. */
export function canSeeCategory(actor: ActorContext, category: DocCategory): boolean {
  const allowed = visibleCategories(actor);
  return allowed === null || allowed.includes(category);
}

/**
 * Libellé du périmètre, quand il est restreint. `null` s'il ne l'est pas.
 *
 * Sert à l'écran : une vue partielle qui ne se présente pas comme telle est un
 * mensonge par omission — l'enseignant croirait le dossier vide alors qu'il est
 * seulement filtré.
 */
export function scopeNotice(actor: ActorContext): string | null {
  const allowed = visibleCategories(actor);
  if (allowed === null) return null;
  if (allowed.length === 0) return "Aucune pièce du dossier ne vous est accessible.";
  return "Vue limitée aux pièces utiles à l'enseignement (scolarité, examens). Les pièces administratives et médicales relèvent du secrétariat.";
}

/**
 * Vrai si l'acteur peut voir les données de santé de l'élève — groupe sanguin,
 * notes médicales.
 *
 * ⚠️ **Aucune règle nouvelle.** C'est exactement la règle documentaire ci-dessus,
 * appliquée aux colonnes de la fiche élève. Interdire la pièce de santé tout en
 * laissant le groupe sanguin et les notes médicales lisibles sur l'écran voisin
 * n'aurait rien protégé : ce sont les mêmes données, seul le contenant change.
 */
export function canSeeHealthData(actor: ActorContext): boolean {
  return canSeeCategory(actor, "SANTE");
}
