import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";
import type { Period } from "@/lib/period";
import { termPeriod, previousPeriod } from "@/lib/period";

/**
 * Trimestres — ordre chronologique et comparaison. Lot 12.1.
 *
 * ═══ POURQUOI AUCUN CHAMP D'ORDRE N'A ÉTÉ AJOUTÉ AU SCHÉMA ═══
 *
 * Le lot 12 déclarait le trimestre non comparable, faute d'ordre déclaré. En
 * réinspectant : `Term.startDate` **est** l'information d'ordre. Un trimestre
 * qui commence le 1ᵉʳ octobre précède celui qui commence le 6 janvier — c'est
 * un fait de calendrier, pas une convention de nommage.
 *
 * Ajouter une colonne `order Int` aurait créé une **seconde vérité** : deux
 * champs pouvant se contredire (ordre 2 avec une date de début antérieure à
 * l'ordre 1), sans que rien n'arbitre. La règle du projet — une seule source de
 * vérité par information — l'interdit.
 *
 * Ce qui manquait n'était donc pas le schéma mais **les données** : les trois
 * trimestres en base ont `startDate = NULL`. D'où `setTermDates()`, qui les
 * renseigne, et le message explicite du sélecteur tant qu'elles manquent.
 *
 * ⚠️ **Jamais de tri par nom.** « 1er / 2ème / 3ème Trimestre » se trie bien
 * alphabétiquement par accident ; « Semestre 1 » / « Trimestre A » / « Rentrée »
 * non. Un ordre qui marche par coïncidence casse silencieusement.
 */

export type TermRow = {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  /** Utilisable comme période : les deux dates sont présentes et cohérentes. */
  dated: boolean;
};

/**
 * Trimestres de l'école, dans l'ordre chronologique réel.
 *
 * Les trimestres datés viennent d'abord, par `startDate` croissante. Ceux sans
 * dates suivent, par date de création — ils ne sont pas cachés : l'école doit
 * voir qu'ils existent et qu'il leur manque quelque chose.
 */
export async function orderedTerms(actor: ActorContext): Promise<TermRow[]> {
  const rows = await prisma.term.findMany({
    where: { schoolId: actor.schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
    // Postgres place les NULL en dernier sur un tri ASC avec `nulls: "last"`.
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    startDate: t.startDate,
    endDate: t.endDate,
    dated: termPeriod(t) !== null,
  }));
}

/**
 * Trimestre précédant chronologiquement celui de `period`.
 *
 * ⚠️ Renvoie `null` dans trois cas distincts, tous légitimes :
 *   - la période n'est pas un trimestre → l'appelant doit utiliser `previousPeriod()` ;
 *   - le trimestre courant n'a pas de `startDate` → aucun ordre possible ;
 *   - c'est le premier trimestre de l'année → il n'y a rien avant.
 *
 * `schoolId` est appliqué : sans lui, connaître un identifiant suffirait à
 * comparer un trimestre au calendrier d'un autre établissement.
 */
export async function previousTermPeriod(actor: ActorContext, period: Period): Promise<Period | null> {
  if (period.kind !== "term" || !period.termId) return null;

  const current = await prisma.term.findFirst({
    where: { id: period.termId, schoolId: actor.schoolId },
    select: { startDate: true },
  });
  if (!current?.startDate) return null;

  const before = await prisma.term.findFirst({
    where: {
      schoolId: actor.schoolId,
      startDate: { lt: current.startDate },
      // Un trimestre sans date de fin ne peut pas devenir une période.
      endDate: { not: null },
    },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (!before) return null;

  return termPeriod(before);
}

/**
 * Période de comparaison, quelle que soit la granularité.
 *
 * Point d'entrée unique des rapports : il délègue au calcul pur pour les quatre
 * granularités calendaires, et à la base pour le trimestre. Les appelants n'ont
 * plus à savoir lequel des deux s'applique.
 */
export async function comparisonPeriod(actor: ActorContext, period: Period): Promise<Period | null> {
  if (period.kind === "term") return previousTermPeriod(actor, period);
  return previousPeriod(period);
}

/**
 * Nombre de trimestres réellement exploitables comme période.
 * Sert à expliquer à l'écran pourquoi le sélecteur n'en propose aucun.
 */
export async function datedTermCount(actor: ActorContext): Promise<{ total: number; dated: number }> {
  const [total, dated] = await Promise.all([
    prisma.term.count({ where: { schoolId: actor.schoolId } }),
    prisma.term.count({
      where: { schoolId: actor.schoolId, startDate: { not: null }, endDate: { not: null } },
    }),
  ]);
  return { total, dated };
}

/**
 * Le trimestre **courant**, et celui qui le précède.
 *
 * ═══ SOURCE UNIQUE — NE PAS RÉÉCRIRE CETTE RÈGLE AILLEURS ═══
 *
 * Elle vivait en double : une fois ici pour l'ordre d'affichage, une fois dans
 * `src/lib/dashboard.ts` pour la moyenne académique. La seconde triait par
 * `startDate` ascendante et prenait le dernier — or **Postgres classe les
 * `NULL` en dernier sur un tri ASC**. Un trimestre sans dates devenait donc « le
 * trimestre courant », ne portait aucune note, et effaçait la moyenne réelle de
 * l'établissement (21 août 2026). La base de travail en contient un, « T1 ».
 *
 * Trois règles, dans cet ordre :
 *   ① un trimestre **daté** l'emporte toujours sur un trimestre sans dates ;
 *   ② parmi les datés, le courant est le dernier **déjà commencé** — un
 *     trimestre qui démarre le mois prochain n'est pas le trimestre en cours ;
 *   ③ sans aucun trimestre daté, on retombe sur l'ordre de création.
 *
 * ⚠️ Toute nouvelle surface qui a besoin du « trimestre en cours » appelle
 * ceci. Une quatrième copie de la règle finira par diverger des trois autres.
 */
export function pickCurrentTerm<T extends { id: string; startDate: Date | null; createdAt?: Date }>(
  terms: T[],
  now: Date = new Date(),
): { current: T | null; previous: T | null; ordered: T[] } {
  if (terms.length === 0) return { current: null, previous: null, ordered: [] };

  const at = (t: T) => t.createdAt?.getTime() ?? 0;
  const dated = terms.filter((t) => t.startDate !== null)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
  const undated = terms.filter((t) => t.startDate === null).sort((a, b) => at(a) - at(b));

  // Les non datés en tête : ils ne peuvent jamais l'emporter sur un daté.
  const ordered = [...undated, ...dated];
  const started = dated.filter((t) => t.startDate! <= now);
  const current = started.length > 0 ? started[started.length - 1] : ordered[ordered.length - 1];
  const i = ordered.findIndex((t) => t.id === current.id);

  return { current, previous: i > 0 ? ordered[i - 1] : null, ordered };
}

/** Le trimestre courant de l'école, lu en base. */
export async function currentTerm(actor: ActorContext): Promise<TermRow | null> {
  const rows = await orderedTerms(actor);
  const withCreated = await prisma.term.findMany({
    where: { schoolId: actor.schoolId },
    select: { id: true, createdAt: true },
  });
  const created = new Map(withCreated.map((t) => [t.id, t.createdAt]));
  const { current } = pickCurrentTerm(rows.map((t) => ({ ...t, createdAt: created.get(t.id) })));
  return current ? rows.find((t) => t.id === current.id) ?? null : null;
}
