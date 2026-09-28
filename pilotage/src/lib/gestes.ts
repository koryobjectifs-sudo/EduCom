"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { pilote } from "@/lib/acces";
import { nouvelleFinDePeriode } from "@/lib/abonnement";
import { directeurs, notifierCloche, tracer, urlEduCom } from "@/lib/educom";

/**
 * Gestes de l'équipe EduCom sur une école (27 sept. 2026).
 * Chaque geste : session pilote vérifiée, motif obligatoire, trace dans
 * `AuditLog` d'EduCom (entity « pilotage » / « support ») et notification à
 * la direction de l'école (cloche EduCom).
 */
type R = { ok: true; info?: string } | { ok: false; error: string };
const JOUR = 86_400_000;

async function garde() {
  const p = await pilote();
  if (!p) throw new Error("Session expirée : reconnectez-vous.");
  return p;
}

function rafraichir(schoolId?: string) {
  revalidatePath("/", "layout");
  if (schoolId) revalidatePath(`/ecoles/${schoolId}`);
}

/** Offrir des jours : repousse l'échéance en cours (essai ou période payée). */
export async function offrirJours(schoolId: string, jours: number, motif: string): Promise<R> {
  const p = await garde();
  const n = Math.round(Number(jours));
  if (!Number.isFinite(n) || n < 1 || n > 90) return { ok: false, error: "Entre 1 et 90 jours." };
  if (motif.trim().length < 3) return { ok: false, error: "Indiquez un motif." };
  if (!(await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } }))) return { ok: false, error: "École introuvable." };
  const maintenant = Date.now();
  const sub = await prisma.schoolSubscription.findUnique({ where: { schoolId } });
  let fin: Date;
  if (!sub) {
    fin = new Date(maintenant + n * JOUR);
    await prisma.schoolSubscription.create({ data: { schoolId, trialEndsAt: fin } });
  } else if (sub.currentPeriodEnd && sub.currentPeriodEnd > sub.trialEndsAt) {
    fin = new Date(Math.max(maintenant, sub.currentPeriodEnd.getTime()) + n * JOUR);
    await prisma.schoolSubscription.update({ where: { schoolId }, data: { currentPeriodEnd: fin } });
  } else {
    fin = new Date(Math.max(maintenant, sub.trialEndsAt.getTime()) + n * JOUR);
    await prisma.schoolSubscription.update({ where: { schoolId }, data: { trialEndsAt: fin } });
  }
  await tracer(p, schoolId, "offrir_jours", "pilotage", schoolId, { jours: n, motif: motif.trim(), nouvelleEcheance: fin.toISOString() });
  await notifierCloche(schoolId, await directeurs(schoolId), {
    kind: "abonnement.offert",
    title: "EduCom vous offre des jours",
    body: `${n} jour${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""}. Accès complet jusqu'au ${fin.toLocaleDateString("fr-FR")}.`,
    link: "/dashboard/abonnement",
  });
  rafraichir(schoolId);
  return { ok: true, info: `Échéance repoussée au ${fin.toLocaleDateString("fr-FR")}.` };
}

/** Paiement reçu hors Wave (espèces, virement, Orange Money…). */
export async function enregistrerPaiement(schoolId: string, mois: number, montant: number, reference: string): Promise<R> {
  const p = await garde();
  const m = Math.round(Number(mois));
  const x = Math.round(Number(montant));
  if (!Number.isFinite(m) || m < 1 || m > 24) return { ok: false, error: "Entre 1 et 24 mois." };
  if (!Number.isFinite(x) || x < 0 || x > 10_000_000) return { ok: false, error: "Montant invalide." };
  if (reference.trim().length < 3) return { ok: false, error: "Indiquez comment l'école a payé (moyen, référence)." };
  if (!(await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } }))) return { ok: false, error: "École introuvable." };
  const fin = await prisma.$transaction(async (tx) => {
    const sub =
      (await tx.schoolSubscription.findUnique({ where: { schoolId } })) ?? (await tx.schoolSubscription.create({ data: { schoolId, trialEndsAt: new Date() } }));
    const { debut, fin } = nouvelleFinDePeriode(sub, m);
    await tx.subscriptionPayment.create({
      data: {
        schoolId,
        subscriptionId: sub.id,
        provider: "MANUEL",
        amountXof: x,
        months: m,
        status: "PAYE",
        clientReference: `MANUEL-${randomUUID()}`,
        transactionId: reference.trim().slice(0, 120),
        periodStart: debut,
        periodEnd: fin,
        paidAt: new Date(),
        initiatedBy: p.userId,
      },
    });
    await tx.schoolSubscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: fin } });
    return fin;
  });
  await tracer(p, schoolId, "paiement_manuel", "pilotage", schoolId, { mois: m, montant: x, reference: reference.trim(), jusquAu: fin.toISOString() });
  await notifierCloche(schoolId, await directeurs(schoolId), {
    kind: "abonnement.paye",
    title: "Abonnement EduCom réglé",
    body: `Paiement de ${x.toLocaleString("fr-FR")} F CFA enregistré. Abonnement actif jusqu'au ${fin.toLocaleDateString("fr-FR")}.`,
    link: "/dashboard/abonnement",
  });
  rafraichir(schoolId);
  return { ok: true, info: `Abonnement actif jusqu'au ${fin.toLocaleDateString("fr-FR")}.` };
}

/**
 * « Renvoyer l'accès » : le pilotage n'a pas les clés Supabase d'EduCom
 * (séparation voulue). On prépare le message avec le lien « Mot de passe
 * oublié » d'EduCom, à envoyer par WhatsApp ; le geste est tracé.
 */
export async function preparerRenvoiAcces(schoolId: string, userId: string): Promise<R & { message?: string; telephone?: string | null }> {
  const p = await garde();
  const u = await prisma.user.findFirst({ where: { id: userId, schoolId, role: { not: "PARENT" } }, select: { email: true, firstName: true, phone: true } });
  if (!u) return { ok: false, error: "Compte introuvable." };
  await tracer(p, schoolId, "renvoyer_acces", "pilotage", userId, { email: u.email });
  return {
    ok: true,
    telephone: u.phone,
    message: `Bonjour ${u.firstName}, pour retrouver votre accès EduCom : ouvrez ${urlEduCom()}/forgot-password, saisissez ${u.email} et suivez le lien reçu par e-mail.`,
  };
}

/* ═══════════════════════ Support ═══════════════════════ */

export async function repondreTicket(ticketId: string, texte: string): Promise<R> {
  const p = await garde();
  const body = texte.trim();
  if (!body) return { ok: false, error: "Message vide." };
  if (body.length > 5000) return { ok: false, error: "Message trop long." };
  const t = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!t) return { ok: false, error: "Demande introuvable." };
  const maintenant = new Date();
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId, authorId: p.userId, fromEduCom: true, body } }),
    prisma.supportTicket.update({ where: { id: ticketId }, data: { lastMessageAt: maintenant, staffReadAt: maintenant, status: t.status === "OUVERT" ? "EN_COURS" : t.status } }),
  ]);
  await tracer(p, t.schoolId, "repondre", "support", ticketId);
  await notifierCloche(t.schoolId, [t.userId], {
    kind: "support.reponse",
    title: "L'équipe EduCom vous a répondu",
    body: `« ${t.subject} » — ${body.slice(0, 140)}`,
    link: `/dashboard/aide?t=${ticketId}`,
  });
  rafraichir();
  return { ok: true };
}

export async function changerStatutTicket(ticketId: string, statut: "OUVERT" | "EN_COURS" | "RESOLU"): Promise<R> {
  const p = await garde();
  if (!["OUVERT", "EN_COURS", "RESOLU"].includes(statut)) return { ok: false, error: "Statut invalide." };
  const t = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { schoolId: true, userId: true, subject: true } });
  if (!t) return { ok: false, error: "Demande introuvable." };
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: statut, resolvedAt: statut === "RESOLU" ? new Date() : null } });
  await tracer(p, t.schoolId, `statut_${statut.toLowerCase()}`, "support", ticketId);
  if (statut === "RESOLU") {
    await notifierCloche(t.schoolId, [t.userId], { kind: "support.resolu", title: "Demande résolue", body: `« ${t.subject} » est marquée résolue. Répondez si ce n'est pas le cas.`, link: `/dashboard/aide?t=${ticketId}` });
  }
  rafraichir();
  return { ok: true };
}

export async function marquerTicketLu(ticketId: string): Promise<void> {
  if (!(await pilote())) return;
  await prisma.supportTicket.updateMany({ where: { id: ticketId }, data: { staffReadAt: new Date() } });
}

/** Message aux directions des écoles d'une cible (cloche EduCom). */
export async function ecrireAuxEcoles(cible: "TOUTES" | "PAYANTES" | "ESSAI", titre: string, texte: string): Promise<R> {
  const p = await garde();
  if (titre.trim().length < 3 || texte.trim().length < 3) return { ok: false, error: "Titre et message requis." };
  const { lesEcoles } = await import("@/lib/donnees");
  const ecoles = (await lesEcoles()).filter((e) =>
    cible === "TOUTES" ? e.statut !== "PERDUE" && e.statut !== "NON_CONVERTIE" : cible === "PAYANTES" ? e.statut === "PAYANTE" || e.statut === "EN_RETARD" : e.statut === "ESSAI",
  );
  const dirs = await prisma.user.findMany({ where: { schoolId: { in: ecoles.map((e) => e.id) }, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, schoolId: true } });
  const parEcole = new Map<string, string[]>();
  for (const d of dirs) parEcole.set(d.schoolId, [...(parEcole.get(d.schoolId) ?? []), d.id]);
  if (dirs.length) {
    await prisma.staffNotification.createMany({
      data: dirs.map((d) => ({ userId: d.id, schoolId: d.schoolId, kind: "educom.annonce", title: titre.trim().slice(0, 120), body: texte.trim().slice(0, 500), link: "/dashboard" })),
    });
  }
  for (const schoolId of parEcole.keys()) await tracer(p, schoolId, "annonce", "pilotage", null, { titre: titre.trim(), cible });
  return { ok: true, info: `Envoyé à ${parEcole.size} école${parEcole.size > 1 ? "s" : ""} (${dirs.length} destinataire${dirs.length > 1 ? "s" : ""}).` };
}

/** Annuler ou marquer un paiement comme remboursé (Wave ou Manuel). */
export async function annulerPaiement(paiementId: string, motif: string): Promise<R> {
  const p = await garde();
  if (motif.trim().length < 3) return { ok: false, error: "Indiquez un motif d'annulation/remboursement." };

  const paiement = await prisma.subscriptionPayment.findUnique({
    where: { id: paiementId },
    include: { subscription: true },
  });
  if (!paiement) return { ok: false, error: "Paiement introuvable." };
  if (paiement.status === "REMBOURSE") return { ok: false, error: "Ce paiement est déjà remboursé." };

  const schoolId = paiement.schoolId;

  await prisma.$transaction(async (tx) => {
    // 1. Marquer le paiement remboursé
    await tx.subscriptionPayment.update({
      where: { id: paiementId },
      data: { status: "REMBOURSE" },
    });

    // 2. Trouver les autres paiements encore actifs de l'école
    const paiementsActifs = await tx.subscriptionPayment.findMany({
      where: { schoolId, status: "PAYE", id: { not: paiementId } },
      orderBy: { periodEnd: "desc" },
    });

    // 3. Réajuster la fin de période de l'école
    const finRestante = paiementsActifs[0]?.periodEnd ?? null;
    await tx.schoolSubscription.update({
      where: { id: paiement.subscriptionId },
      data: { currentPeriodEnd: finRestante },
    });
  });

  // 4. Trace audit log
  await tracer(p, schoolId, "remboursement_paiement", "pilotage", paiementId, {
    montant: paiement.amountXof,
    motif: motif.trim(),
  });

  // 5. Notification dans la cloche EduCom
  await notifierCloche(schoolId, await directeurs(schoolId), {
    kind: "abonnement.rembourse",
    title: "Paiement EduCom annulé / remboursé",
    body: `Le règlement de ${paiement.amountXof.toLocaleString("fr-FR")} F CFA a été remboursé. Vos données restent conservées en consultation.`,
    link: "/dashboard/abonnement",
  });

  rafraichir(schoolId);
  return { ok: true, info: `Paiement de ${paiement.amountXof.toLocaleString("fr-FR")} F CFA marqué remboursé.` };
}

