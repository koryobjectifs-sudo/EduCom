import { prisma } from "@/lib/prisma";
import { PRO_PRICE_EUR, EUR_TO_XOF_RATE, TRIAL_DAYS } from "@/lib/pricing";

/**
 * Abonnement de l'école à EduCom — 25 sept. 2026.
 *
 * ═══ PÉRIMÈTRE (Kory) ═══
 * L'API de paiement Wave ne sert QU'À l'abonnement de l'école à EduCom.
 * Les factures et paiements des familles ne passent jamais par ici.
 *
 * ═══ ÉTATS, DÉDUITS DES DATES ═══
 *
 *   ESSAI         maintenant < fin d'essai (7 jours)
 *   ACTIF         maintenant < fin de la période payée
 *   EN_RETARD     échéance dépassée depuis moins de GRACE_DAYS : tout marche,
 *                 bannière rouge et relances
 *   LECTURE_SEULE échéance dépassée depuis GRACE_DAYS ou plus : on consulte,
 *                 on imprime, on exporte — on ne modifie plus. Rien n'est
 *                 JAMAIS supprimé ; un paiement rouvre tout immédiatement.
 *
 * Aucune colonne de statut : voir le commentaire du modèle Prisma.
 */

export const GRACE_DAYS = 7;
const JOUR = 24 * 60 * 60 * 1000;

/** Prix mensuel du plan Pro en francs CFA (entier, 9 € → 5 904 F CFA). */
export const PRO_PRICE_XOF = Math.round(PRO_PRICE_EUR * EUR_TO_XOF_RATE);

export type EtatAbonnement = "ESSAI" | "ACTIF" | "EN_RETARD" | "LECTURE_SEULE";

export type Abonnement = {
  etat: EtatAbonnement;
  /** Date qui compte pour l'école : fin d'essai, fin de période payée. */
  echeance: Date;
  /** Jours restants avant l'échéance (négatif = dépassée). Arrondi au jour. */
  joursRestants: number;
  /** Date de passage en lecture seule. */
  lectureSeuleLe: Date;
  aDejaPaye: boolean;
  prixMensuelXof: number;
};

type DatesAbonnement = { trialEndsAt: Date; currentPeriodEnd: Date | null };

/** Fonction pure : l'état d'un abonnement à un instant donné. Testable sans base. */
export function calculerEtat(sub: DatesAbonnement, maintenant: Date = new Date()): Abonnement {
  const paye = sub.currentPeriodEnd;
  // Période payée qui dépasse l'essai (payer pendant l'essai la prolonge).
  const periodePayee = Boolean(paye && paye.getTime() > sub.trialEndsAt.getTime());
  const echeance = periodePayee ? paye! : sub.trialEndsAt;
  const lectureSeuleLe = new Date(echeance.getTime() + GRACE_DAYS * JOUR);
  const t = maintenant.getTime();

  let etat: EtatAbonnement;
  if (t < echeance.getTime()) etat = periodePayee ? "ACTIF" : "ESSAI";
  else if (t < lectureSeuleLe.getTime()) etat = "EN_RETARD";
  else etat = "LECTURE_SEULE";

  return {
    etat,
    echeance,
    joursRestants: Math.ceil((echeance.getTime() - t) / JOUR),
    lectureSeuleLe,
    aDejaPaye: Boolean(paye),
    prixMensuelXof: PRO_PRICE_XOF,
  };
}

/**
 * Abonnement de l'école, créé au besoin.
 *
 * ⚠️ Écoles antérieures au module (aucune ligne) : leur essai de 7 jours
 * commence au PREMIER passage après la mise en ligne — jamais à leur date
 * d'inscription, qui les ferait basculer d'un coup en lecture seule.
 */
export async function abonnementEcole(schoolId: string) {
  const existant = await prisma.schoolSubscription.findUnique({ where: { schoolId } });
  if (existant) return existant;
  return prisma.schoolSubscription.upsert({
    where: { schoolId },
    update: {},
    create: { schoolId, trialEndsAt: new Date(Date.now() + TRIAL_DAYS * JOUR) },
  });
}

export async function etatAbonnement(schoolId: string, maintenant = new Date()): Promise<Abonnement> {
  const sub = await abonnementEcole(schoolId);
  return calculerEtat(sub, maintenant);
}

/** Données de création pour une école qui s'inscrit (essai à partir de maintenant). */
export function abonnementInitial(maintenant = new Date()) {
  return { trialEndsAt: new Date(maintenant.getTime() + TRIAL_DAYS * JOUR) };
}

/**
 * Nouvelle fin de période après un paiement de `mois` mois. On part de la
 * plus tardive entre maintenant, la fin d'essai et la fin déjà payée : payer
 * en avance ne fait jamais perdre de jours.
 */
export function nouvelleFinDePeriode(sub: DatesAbonnement, mois: number, maintenant = new Date()) {
  const base = new Date(
    Math.max(maintenant.getTime(), sub.trialEndsAt.getTime(), sub.currentPeriodEnd?.getTime() ?? 0),
  );
  const fin = new Date(base);
  fin.setMonth(fin.getMonth() + mois);
  return { debut: base, fin };
}

/** Chemins d'action toujours permis en lecture seule : on doit pouvoir payer. */
export function actionPermiseEnLectureSeule(path?: string): boolean {
  return Boolean(path && (path === "/dashboard/abonnement" || path.startsWith("/dashboard/abonnement/")));
}

/* ═══════════════════════ Confirmation d'un paiement Wave ═══════════════════════ */

/**
 * Confirme un paiement d'abonnement à partir de la session Wave.
 *
 * ⚠️ Source de vérité = Wave, RELUE par l'API avec notre clé — jamais le
 * contenu d'un webhook ni un paramètre d'URL de retour pris tel quel. On
 * vérifie statut, montant, devise et référence, puis on bascule EN_ATTENTE →
 * PAYE dans une transaction conditionnelle : si deux confirmations arrivent en
 * même temps (webhook + retour du navigateur), une seule prolonge la période.
 */
export async function confirmerPaiementAbonnement(
  sessionId: string,
): Promise<"PAYE" | "DEJA_PAYE" | "EN_ATTENTE" | "ECHEC" | "INCONNU"> {
  const { lireSessionWave } = await import("@/lib/wave");
  const paiement = await prisma.subscriptionPayment.findUnique({ where: { checkoutSessionId: sessionId } });
  if (!paiement) return "INCONNU";
  if (paiement.status === "PAYE") return "DEJA_PAYE";

  const session = await lireSessionWave(sessionId);
  const conforme =
    session.client_reference === paiement.clientReference &&
    session.currency === "XOF" &&
    session.amount === String(paiement.amountXof);
  if (!conforme) {
    console.error("[abonnement] Session Wave non conforme au paiement attendu", {
      paiement: paiement.id,
      sessionId,
    });
    return "ECHEC";
  }
  if (session.payment_status !== "succeeded") {
    if (session.checkout_status === "expired" || session.payment_status === "cancelled") {
      await prisma.subscriptionPayment.updateMany({
        where: { id: paiement.id, status: "EN_ATTENTE" },
        data: { status: session.checkout_status === "expired" ? "EXPIRE" : "ECHEC" },
      });
      return "ECHEC";
    }
    return "EN_ATTENTE";
  }

  const resultat = await prisma.$transaction(async (tx) => {
    const sub = await tx.schoolSubscription.findUniqueOrThrow({ where: { id: paiement.subscriptionId } });
    const { debut, fin } = nouvelleFinDePeriode(sub, paiement.months);
    const bascule = await tx.subscriptionPayment.updateMany({
      where: { id: paiement.id, status: "EN_ATTENTE" },
      data: {
        status: "PAYE",
        paidAt: new Date(),
        transactionId: session.transaction_id ?? null,
        periodStart: debut,
        periodEnd: fin,
      },
    });
    if (bascule.count === 0) return "DEJA_PAYE" as const;
    await tx.schoolSubscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: fin } });

    const admins = await tx.user.findMany({
      where: { schoolId: paiement.schoolId, role: { in: ["OWNER", "ADMIN"] } },
      select: { id: true },
    });
    if (admins.length) {
      await tx.staffNotification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          schoolId: paiement.schoolId,
          kind: "abonnement.paye",
          title: "Abonnement EduCom réglé",
          body: `Paiement Wave de ${paiement.amountXof.toLocaleString("fr-FR")} F CFA reçu. Abonnement actif jusqu'au ${fin.toLocaleDateString("fr-FR")}.`,
          link: "/dashboard/abonnement",
        })),
      });
    }
    return "PAYE" as const;
  });
  return resultat;
}

/* ═══════════════════════ Relances ═══════════════════════ */

export type Jalon = "J-3" | "J-1" | "J0" | "G+3" | "LS";

/**
 * Jalon de relance du jour, ou `null`. Fonction pure.
 * Essai et période payée suivent le même calendrier : J-3, J-1, jour J,
 * 3 jours de retard, passage en lecture seule.
 */
export function jalonDuJour(a: Abonnement): Jalon | null {
  if (a.etat === "LECTURE_SEULE") return "LS";
  if (a.etat === "EN_RETARD") return a.joursRestants <= -3 ? "G+3" : "J0";
  if (a.joursRestants <= 0) return "J0";
  if (a.joursRestants === 1) return "J-1";
  if (a.joursRestants <= 3) return "J-3";
  return null;
}

export function messageRelance(jalon: Jalon, a: Abonnement): { title: string; body: string } {
  const quand = a.echeance.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const prix = `${a.prixMensuelXof.toLocaleString("fr-FR")} F CFA / mois`;
  const quoi = a.aDejaPaye ? "Votre abonnement EduCom" : "Votre essai gratuit EduCom";
  switch (jalon) {
    case "J-3":
      return { title: `${quoi} se termine dans 3 jours`, body: `Échéance le ${quand}. Réglez en 1 minute avec Wave (${prix}) pour continuer sans interruption.` };
    case "J-1":
      return { title: `${quoi} se termine demain`, body: `Échéance le ${quand}. Réglez avec Wave (${prix}) : aucune donnée ne sera perdue.` };
    case "J0":
      return { title: `${quoi} arrive à échéance`, body: `Vous avez ${GRACE_DAYS} jours de grâce : tout reste utilisable. Réglez avec Wave (${prix}).` };
    case "G+3":
      return { title: "Abonnement EduCom en retard", body: `Sans règlement, l'espace passera en lecture seule le ${a.lectureSeuleLe.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.` };
    case "LS":
      return { title: "Espace EduCom en lecture seule", body: "Vos données sont intactes. Un règlement Wave rouvre tout immédiatement." };
  }
}

/**
 * Passe quotidienne : dépose la relance du jour aux OWNER / ADMIN de chaque
 * école, une seule fois par échéance et par jalon (`remindersSent`).
 *
 * ⚠️ Canal : notification dans l'application + bandeau. Aucun envoi externe
 * (e-mail, SMS, WhatsApp, push) n'est opérationnel dans le dépôt : ne jamais
 * écrire « envoyé » tant qu'un canal n'est pas prouvé (`lib/channels.ts`).
 */
export async function passerRelancesAbonnement(maintenant = new Date()) {
  const ecoles = await prisma.school.findMany({
    where: { onboardingCompleted: true },
    select: { id: true },
  });
  let deposees = 0;
  for (const { id: schoolId } of ecoles) {
    const sub = await abonnementEcole(schoolId);
    const a = calculerEtat(sub, maintenant);
    const jalon = jalonDuJour(a);
    if (!jalon) continue;
    const cle = `${a.echeance.toISOString().slice(0, 10)}:${jalon}`;
    if (sub.remindersSent.includes(cle)) continue;

    const admins = await prisma.user.findMany({
      where: { schoolId, role: { in: ["OWNER", "ADMIN"] } },
      select: { id: true },
    });
    const m = messageRelance(jalon, a);
    await prisma.$transaction([
      prisma.staffNotification.createMany({
        data: admins.map((u) => ({
          userId: u.id,
          schoolId,
          kind: `abonnement.${jalon}`,
          title: m.title,
          body: m.body,
          link: "/dashboard/abonnement",
        })),
      }),
      prisma.schoolSubscription.update({
        where: { id: sub.id },
        data: { remindersSent: { push: cle } },
      }),
    ]);
    deposees += admins.length;
  }
  return { ecoles: ecoles.length, notificationsDeposees: deposees };
}
