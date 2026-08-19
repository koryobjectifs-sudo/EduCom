/**
 * Périodes — abstraction commune de fenêtre temporelle.
 *
 * Fondation posée pour que les futurs rapports, écrans financiers et vues du
 * dossier élève demandent « le mois en cours » ou « le 2ᵉ trimestre » sans
 * recalculer des bornes chacun de leur côté. Aujourd'hui, chaque écran qui
 * compare des dates le fait à sa façon — le tableau de bord calcule
 * `Date.now() - 30 jours` en ligne, par exemple.
 *
 * ═══ CE FICHIER NE TOUCHE PAS AU SCHÉMA ═══
 *
 * Le trimestre existe déjà en base (`Term`, avec `startDate` / `endDate`). Cette
 * abstraction le **lit** au lieu de créer un second modèle de période. Les
 * autres granularités sont purement calculées.
 *
 * ⚠️ `Term.startDate` et `Term.endDate` sont **nullables** au schéma, et les
 * trimestres réellement en base peuvent n'avoir aucune date (créés par
 * l'onglet Configuration, qui ne demande qu'un nom). `termPeriod()` renvoie donc
 * `null` dans ce cas plutôt qu'inventer des bornes : un rapport doit pouvoir
 * dire « ce trimestre n'a pas de dates » au lieu d'afficher un total faux.
 *
 * ⚠️ Toutes les bornes sont calculées en **heure locale du serveur**, puis
 * exprimées en instants absolus. Les dates métier d'EduCom (échéance de facture,
 * date de paiement) sont des jours calendaires : découper en UTC décalerait les
 * bornes de quelques heures et ferait basculer des enregistrements d'un mois à
 * l'autre.
 */

export type PeriodKind = "day" | "week" | "month" | "term" | "custom";

export type Period = {
  kind: PeriodKind;
  /** Début inclus. */
  from: Date;
  /** Fin exclue — comparer avec `lt`, jamais `lte`. */
  to: Date;
  /** Libellé français, prêt à afficher. */
  label: string;
  /**
   * Identifiant du `Term` — renseigné uniquement quand `kind === "term"`.
   *
   * Lot 12.1 : sans lui, « le trimestre précédent » ne peut pas être résolu,
   * puisqu'il faut interroger la base pour trouver celui qui précède
   * chronologiquement. Une `Period` seule ne porte pas cette information.
   */
  termId?: string;
};

/* ─────────────────────────────── utilitaires ─────────────────────────────── */

/** Minuit local du jour de `d`. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/**
 * Lundi de la semaine de `d`.
 *
 * `getDay()` renvoie 0 pour dimanche : en France comme au Sénégal la semaine
 * commence le lundi, d'où le repli sur 7.
 */
function startOfWeek(d: Date): Date {
  const day = d.getDay() === 0 ? 7 : d.getDay();
  return addDays(startOfDay(d), 1 - day);
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const fmtDay = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/* ──────────────────────────────── fabriques ──────────────────────────────── */

export function dayPeriod(ref: Date = new Date()): Period {
  const from = startOfDay(ref);
  return { kind: "day", from, to: addDays(from, 1), label: fmtDay(from) };
}

export function weekPeriod(ref: Date = new Date()): Period {
  const from = startOfWeek(ref);
  const to = addDays(from, 7);
  return {
    kind: "week",
    from,
    to,
    // La borne de fin est exclue : le dernier jour affiché est `to - 1`.
    label: `semaine du ${fmtDay(from)}`,
  };
}

export function monthPeriod(ref: Date = new Date()): Period {
  const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { kind: "month", from, to, label: `${MONTHS[from.getMonth()]} ${from.getFullYear()}` };
}

/** Fenêtre glissante des `days` derniers jours, bornée à maintenant. */
export function rollingDays(days: number, ref: Date = new Date()): Period {
  const to = startOfDay(addDays(ref, 1));
  const from = addDays(to, -days);
  return { kind: "custom", from, to, label: `${days} derniers jours` };
}

/**
 * Période d'un trimestre déjà enregistré.
 *
 * @returns `null` si le trimestre n'a pas ses deux dates — voir l'avertissement
 *   en tête de fichier. L'appelant doit traiter ce cas explicitement.
 */
export function termPeriod(term: { id?: string; name: string; startDate: Date | null; endDate: Date | null }): Period | null {
  if (!term.startDate || !term.endDate) return null;
  const from = startOfDay(term.startDate);
  // La fin d'un trimestre est un jour inclus côté métier ; on la convertit en
  // borne exclue pour rester homogène avec les autres périodes.
  const to = addDays(startOfDay(term.endDate), 1);
  if (to <= from) return null;
  return { kind: "term", from, to, label: term.name, termId: term.id };
}

/** Période arbitraire. Les bornes sont normalisées et ordonnées. */
export function customPeriod(a: Date, b: Date, label?: string): Period {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  const from = startOfDay(lo);
  const to = addDays(startOfDay(hi), 1);
  return { kind: "custom", from, to, label: label ?? `du ${fmtDay(from)} au ${fmtDay(addDays(to, -1))}` };
}

/* ───────────────────────────── usage en requête ──────────────────────────── */

/**
 * Filtre Prisma pour un champ de date.
 *
 * ⚠️ `lt` et non `lte` : `to` est une borne exclue. Utiliser `lte` inclurait le
 * premier instant du jour suivant et ferait compter deux fois les
 * enregistrements situés exactement à minuit.
 *
 *   where: { schoolId, ...periodFilter(period, "createdAt") }
 */
export function periodFilter(period: Period, field: string): Record<string, { gte: Date; lt: Date }> {
  return { [field]: { gte: period.from, lt: period.to } };
}

/** Vrai si l'instant tombe dans la période. Même convention de bornes. */
export function contains(period: Period, at: Date): boolean {
  return at >= period.from && at < period.to;
}

/* ─────────────────────────── période précédente ─────────────────────────── */

/**
 * Période immédiatement antérieure, pour une comparaison.
 *
 * ⚠️ **Renvoie `null` quand la comparaison n'est pas calculable**, et c'est le
 * cœur de cette fonction. Un rapport qui affiche « −12 % » sur une base fausse
 * est pire qu'un rapport sans comparaison : le chiffre est cru.
 *
 * Cas `term` → `null` **ici**, parce que cette fonction est pure et que le
 * trimestre précédent ne se déduit pas d'une `Period` : il faut interroger la
 * base. Lot 12.1 : `previousTermPeriod()` (dans `src/lib/terms.ts`) le résout
 * en cherchant le trimestre de la même école dont `startDate` est la plus
 * grande STRICTEMENT avant celle du trimestre courant.
 *
 * ⚠️ L'ordre vient de `startDate`, **jamais du nom**. Trier « 1er / 2ème /
 * 3ème Trimestre » alphabétiquement marche par accident et casse dès qu'une
 * école nomme ses périodes autrement (« Semestre 1 », « Trimestre A »).
 *
 * Les quatre autres granularités se décalent exactement :
 *   - `day`    → la veille
 *   - `week`   → la semaine précédente
 *   - `month`  → le mois précédent (28/30/31 jours, pas « −30 jours »)
 *   - `custom` → la même durée, accolée avant `from`
 */
export function previousPeriod(period: Period): Period | null {
  switch (period.kind) {
    case "term":
      return null;

    case "day":
      return dayPeriod(addDays(period.from, -1));

    case "week":
      return weekPeriod(addDays(period.from, -7));

    case "month":
      // Reconstruit par la fabrique plutôt que par soustraction de jours : la
      // longueur d'un mois varie, et comparer février à « 31 jours avant mars »
      // décalerait la fenêtre.
      return monthPeriod(new Date(period.from.getFullYear(), period.from.getMonth() - 1, 1));

    case "custom": {
      // Durée en jours entiers — les bornes sont déjà normalisées à minuit local.
      const days = Math.round((period.to.getTime() - period.from.getTime()) / 864e5);
      if (days < 1) return null;
      const end = addDays(period.from, -1);          // dernier jour inclus
      const start = addDays(period.from, -days);     // premier jour inclus
      return customPeriod(start, end);
    }
  }
}
