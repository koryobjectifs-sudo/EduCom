import { prisma } from "@/lib/prisma";
import { recordAudit, type ActorContext } from "@/lib/audit";
import { noRealSendChannel } from "@/lib/channels";

/**
 * **Un changement de calendrier ne doit jamais être silencieux.**
 *
 * ═══ LE PROBLÈME, CONCRÈTEMENT ═══
 *
 * Une directrice déplace la composition du 2ᵉ trimestre du 12 au 19 janvier.
 * En base, une date en remplace une autre. Les cinq enseignants qui préparaient
 * leurs sujets pour le 12 ne l'apprennent… jamais. L'écran de saisie affichera
 * la nouvelle date comme s'il n'y en avait jamais eu d'autre.
 *
 * ═══ CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS ═══
 *
 * ✅ Il **conserve la trace** du déplacement (ancienne date → nouvelle date,
 *    par qui, quand) dans `AuditLog`, et la rend lisible aux écrans concernés.
 * ✅ Il **prévient à l'intérieur du produit** : l'enseignant voit un bandeau
 *    « le calendrier a changé » sur son écran de notes, avec le détail.
 *
 * ❌ Il **n'envoie rien**, et ne prétend pas le faire. `src/lib/channels.ts`
 *    reste seul juge de ce qui peut quitter EduCom, et son registre d'envois
 *    réels est vide. `outboundReady` dit donc `false`, et l'interface écrit
 *    « à annoncer aux familles » — jamais « envoyé ».
 *
 * ⚠️ **Aucune table `Notification` n'a été créée.** Elle aurait dupliqué ce que
 * `AuditLog` sait déjà (qui, quoi, quand, avec quel détail) et introduit une
 * seconde vérité à maintenir en accord. Le jour où un canal devient réellement
 * opérationnel, l'envoi lira ces mêmes lignes — il n'y aura rien à migrer.
 */

/** Verbe d'audit du déplacement. Une seule chaîne, lue et écrite ici. */
export const RESCHEDULE_ACTION = "reschedule";

/** Combien de temps un changement reste signalé aux enseignants. */
export const NOTICE_WINDOW_DAYS = 14;

export type PlanningChangeInput = {
  entity: "term" | "evaluation";
  entityId: string;
  /** Nom de l'objet AU MOMENT du changement — il peut être renommé ensuite. */
  name: string;
  /** Trimestre de rattachement, pour situer une évaluation. */
  termName?: string | null;
  from: { start: Date | null; end?: Date | null };
  to: { start: Date | null; end?: Date | null };
};

/** Deux dates nulles ou égales à la milliseconde près : rien n'a bougé. */
function sameDate(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

/**
 * Enregistre un déplacement — **et rend `false` si rien n'a changé**.
 *
 * ⚠️ C'est important : la saisie de dates enregistre à chaque frappe complète
 * d'un `<input type="date">`. Sans ce filtre, ré-ouvrir puis refermer le champ
 * produirait un « la composition a été déplacée » alors qu'elle n'a pas bougé
 * d'un jour, et l'avertissement perdrait tout son sens en une semaine.
 */
export async function recordPlanningChange(
  actor: ActorContext,
  change: PlanningChangeInput,
): Promise<boolean> {
  if (sameDate(change.from.start, change.to.start) && sameDate(change.from.end, change.to.end)) {
    return false;
  }

  await recordAudit(actor, {
    action: RESCHEDULE_ACTION,
    entity: change.entity,
    entityId: change.entityId,
    details: {
      nom: change.name,
      trimestre: change.termName ?? null,
      avant: {
        debut: change.from.start?.toISOString() ?? null,
        fin: change.from.end?.toISOString() ?? null,
      },
      apres: {
        debut: change.to.start?.toISOString() ?? null,
        fin: change.to.end?.toISOString() ?? null,
      },
    },
  });
  return true;
}

export type PlanningNotice = {
  id: string;
  entity: "term" | "evaluation";
  entityId: string | null;
  name: string;
  termName: string | null;
  /** Phrase prête à afficher : « déplacée du 12 janvier au 19 janvier ». */
  sentence: string;
  changedAt: Date;
  /** Auteur du changement, quand le compte existe encore. */
  by: string | null;
};

const jour = (iso: unknown): string | null => {
  if (typeof iso !== "string" || !iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
};

/**
 * Les changements de planning récents de l'établissement.
 *
 * ⚠️ **Lecture bornée par `schoolId`**, comme tout accès à `AuditLog` : sans
 * cela, connaître un identifiant suffirait à lire le calendrier d'un autre
 * établissement. Cinquième précaution de cette famille dans le projet.
 */
export async function recentPlanningChanges(
  actor: ActorContext,
  options: { days?: number; take?: number } = {},
): Promise<PlanningNotice[]> {
  const days = options.days ?? NOTICE_WINDOW_DAYS;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.auditLog.findMany({
    where: {
      schoolId: actor.schoolId,
      action: RESCHEDULE_ACTION,
      entity: { in: ["term", "evaluation"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: options.take ?? 10,
  });
  if (rows.length === 0) return [];

  const authors = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.userId))] }, schoolId: actor.schoolId },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameOf = new Map(authors.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]));

  // ⚠️ Un seul avis par objet : une composition déplacée trois fois en deux
  // jours produirait trois bandeaux qui se contredisent presque. On garde le
  // plus récent, qui porte la date qui fait foi.
  const seen = new Set<string>();
  const notices: PlanningNotice[] = [];

  for (const row of rows) {
    const key = `${row.entity}|${row.entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let d: Record<string, any> = {};
    try { d = row.details ? JSON.parse(row.details) : {}; } catch { d = {}; }

    const nom = typeof d.nom === "string" ? d.nom : "Une échéance";

    /**
     * ⚠️ **DEUX DÉFAUTS DE RÉDACTION CORRIGÉS, vus sur capture le 22 août.**
     *
     * ① *Mauvais accord.* La phrase était figée au féminin (« déplacée »), ce
     *    qui convient à une évaluation mais pas à un trimestre. Un produit qui
     *    écrit « 1er Trimestre — déplacée » se lit comme une traduction
     *    automatique.
     *
     * ② *Une phrase FAUSSE.* Seule la date de DÉBUT était comparée. Déplacer la
     *    seule date de fin d'un trimestre produisait « déplacée du 23 juin au
     *    23 juin » — le lecteur en conclut qu'il ne s'est rien passé, alors que
     *    la période a changé de longueur. On décrit maintenant ce qui a
     *    réellement bougé, début, fin, ou les deux.
     */
    const féminin = row.entity === "evaluation";
    const dep = féminin ? "déplacée" : "déplacé";
    const fix = féminin ? "fixée" : "fixé";
    const elle = féminin ? "elle était" : "il était";

    const avant = jour(d?.avant?.debut);
    const apres = jour(d?.apres?.debut);
    const finAvant = jour(d?.avant?.fin);
    const finApres = jour(d?.apres?.fin);

    const debutBouge = avant !== apres;
    const finBouge = finAvant !== finApres;

    let sentence: string;
    if (debutBouge && avant && apres) {
      sentence = finBouge && finApres
        ? `${dep} : du ${apres} au ${finApres} (auparavant du ${avant}${finAvant ? ` au ${finAvant}` : ""})`
        : `${dep} du ${avant} au ${apres}`;
    } else if (debutBouge && apres) {
      sentence = `${fix} au ${apres}`;
    } else if (debutBouge && avant) {
      sentence = `n'a plus de date (${elle} au ${avant})`;
    } else if (finBouge && finApres) {
      // Le début n'a pas changé : on ne le répète pas, on nomme la fin.
      sentence = finAvant
        ? `se termine désormais le ${finApres}, au lieu du ${finAvant}`
        : `se termine désormais le ${finApres}`;
    } else if (finBouge && finAvant) {
      sentence = `n'a plus de date de fin (${elle} au ${finAvant})`;
    } else {
      sentence = "a changé de calendrier";
    }

    notices.push({
      id: row.id,
      entity: row.entity as "term" | "evaluation",
      entityId: row.entityId,
      name: nom,
      termName: typeof d.trimestre === "string" ? d.trimestre : null,
      sentence,
      changedAt: row.createdAt,
      by: nameOf.get(row.userId) ?? null,
    });
  }

  return notices;
}

/**
 * L'annonce aux familles est-elle réellement possible aujourd'hui ?
 *
 * ⚠️ **Toujours `false` tant que `SEND_IMPLEMENTATIONS` est vide** dans
 * `src/lib/channels.ts`. Cette fonction ne décide rien : elle relaie l'unique
 * autorité du projet sur la question, pour qu'aucun écran n'ait à se prononcer
 * seul. Le jour où un canal devient opérationnel, elle bascule sans qu'une
 * ligne d'interface ne change.
 */
export function outboundNoticeReady(): boolean {
  return !noRealSendChannel();
}
