"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";

/**
 * Support côté école (27 sept. 2026) : le personnel écrit à l'équipe EduCom.
 * Reçu dans l'outil de pilotage, application séparée (`pilotage/`, écran Support).
 *
 * Visibilité : l'auteur voit ses demandes ; la direction (OWNER, ADMIN) voit
 * toutes celles de son école. Les parents n'ont pas accès (chemin absent de
 * leur liste blanche).
 */
const TYPES = ["QUESTION", "PROBLEME", "CHANGEMENT"] as const;
type R = { ok: true; id: string } | { ok: false; error: string };

// Lecture seule d'abonnement : écrire au support doit rester possible.
const OPTIONS = { lecture: true } as const;

export async function envoyerDemande(kind: string, texte: string, page: string): Promise<R> {
  const auth = await requireActionContext("/dashboard/aide", OPTIONS);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { ctx } = auth;
  const body = texte.trim();
  if (body.length < 5) return { ok: false, error: "Décrivez votre demande en quelques mots." };
  if (body.length > 5000) return { ok: false, error: "Message trop long (5 000 caractères max.)." };
  const type = TYPES.includes(kind as (typeof TYPES)[number]) ? kind : "QUESTION";
  const premiere = body.split("\n").find((l) => l.trim())?.trim() ?? body;
  const subject = premiere.length > 80 ? `${premiere.slice(0, 77)}…` : premiere;
  const maintenant = new Date();
  const t = await prisma.supportTicket.create({
    data: {
      schoolId: ctx.schoolId,
      userId: ctx.userId,
      kind: type,
      subject,
      page: page.startsWith("/") ? page.slice(0, 300) : null,
      lastMessageAt: maintenant,
      schoolReadAt: maintenant,
      messages: { create: { authorId: ctx.userId, body } },
    },
  });
  await recordAudit(ctx, { action: "creer", entity: "support", entityId: t.id, details: { kind: type } });
  revalidatePath("/dashboard/aide");
  return { ok: true, id: t.id };
}

async function ticketVisible(id: string, ctx: { schoolId: string; userId: string; role: string }) {
  const t = await prisma.supportTicket.findFirst({ where: { id, schoolId: ctx.schoolId } });
  if (!t) return null;
  if (t.userId !== ctx.userId && ctx.role !== "OWNER" && ctx.role !== "ADMIN") return null;
  return t;
}

export async function ajouterMessage(ticketId: string, texte: string): Promise<R> {
  const auth = await requireActionContext("/dashboard/aide", OPTIONS);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { ctx } = auth;
  const body = texte.trim();
  if (!body) return { ok: false, error: "Message vide." };
  if (body.length > 5000) return { ok: false, error: "Message trop long." };
  const t = await ticketVisible(ticketId, ctx);
  if (!t) return { ok: false, error: "Demande introuvable." };
  const maintenant = new Date();
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId, authorId: ctx.userId, body } }),
    // Un nouveau message sur une demande résolue la rouvre.
    prisma.supportTicket.update({ where: { id: ticketId }, data: { lastMessageAt: maintenant, schoolReadAt: maintenant, ...(t.status === "RESOLU" ? { status: "OUVERT", resolvedAt: null } : {}) } }),
  ]);
  await recordAudit(ctx, { action: "message", entity: "support", entityId: ticketId });
  revalidatePath("/dashboard/aide");
  return { ok: true, id: ticketId };
}

export async function marquerLuEcole(ticketId: string): Promise<void> {
  const auth = await requireActionContext("/dashboard/aide", OPTIONS);
  if (!auth.ok) return;
  const t = await ticketVisible(ticketId, auth.ctx);
  if (t) await prisma.supportTicket.update({ where: { id: ticketId }, data: { schoolReadAt: new Date() } });
}

/**
 * Guide de démarrage par métier (27 sept. 2026) : popup obligatoire à la
 * première connexion. Marque le guide du métier courant comme vu — n'ouvre
 * plus la popup ensuite, mais le contenu reste accessible via l'onglet Aide.
 */
export async function marquerGuideVu(): Promise<void> {
  const auth = await requireActionContext();
  if (!auth.ok) return;
  await prisma.user.update({ where: { id: auth.ctx.userId }, data: { guideVuAt: new Date() } });
}

export interface OnboardingRealStatus {
  schoolConfigured: boolean;
  studentsImported: boolean;
  teachersInvited: boolean;
  staffInvited: boolean;
  completedStepIds: string[];
  totalSteps: number;
  completedStepsCount: number;
  isComplete: boolean;
}

export async function getOnboardingRealStatus(): Promise<OnboardingRealStatus> {
  const auth = await requireActionContext();
  if (!auth.ok) {
    return {
      schoolConfigured: false,
      studentsImported: false,
      teachersInvited: false,
      staffInvited: false,
      completedStepIds: [],
      totalSteps: 4,
      completedStepsCount: 0,
      isComplete: false,
    };
  }

  const { ctx } = auth;

  const [school, studentCount, teacherUsers, teacherInvites, staffUsers, staffInvites] = await Promise.all([
    prisma.school.findUnique({
      where: { id: ctx.schoolId },
      select: { name: true, logo: true, phone: true, address: true, activeAcademicYear: true },
    }),
    prisma.student.count({
      where: { schoolId: ctx.schoolId, status: { not: "INACTIVE" } },
    }),
    prisma.user.count({
      where: { schoolId: ctx.schoolId, role: "TEACHER" },
    }),
    prisma.invitation.count({
      where: { schoolId: ctx.schoolId, role: "TEACHER", status: "PENDING" },
    }),
    prisma.user.count({
      where: { schoolId: ctx.schoolId, role: { in: ["SECRETARY", "ACCOUNTANT"] } },
    }),
    prisma.invitation.count({
      where: { schoolId: ctx.schoolId, role: { in: ["SECRETARY", "ACCOUNTANT"] }, status: "PENDING" },
    }),
  ]);

  const schoolConfigured = Boolean(
    school?.logo ||
    school?.phone ||
    school?.address ||
    (school?.name && !["EduCom", "Mon École", "Mon Etablissement"].includes(school.name.trim()))
  );

  const studentsImported = studentCount > 0;
  const teachersInvited = (teacherUsers + teacherInvites) > 0;
  const staffInvited = (staffUsers + staffInvites) > 0;

  const completedStepIds: string[] = [];
  if (schoolConfigured) completedStepIds.push("settings");
  if (studentsImported) completedStepIds.push("import");
  if (teachersInvited) completedStepIds.push("teachers");
  if (staffInvited) completedStepIds.push("staff");

  const totalSteps = 4;
  const completedStepsCount = completedStepIds.length;
  const isComplete = completedStepsCount === totalSteps;

  return {
    schoolConfigured,
    studentsImported,
    teachersInvited,
    staffInvited,
    completedStepIds,
    totalSteps,
    completedStepsCount,
    isComplete,
  };
}

export type DonneesTicketJira = {
  template: "BUG" | "QUESTION" | "AMELIORATION";
  titre: string;
  priorite: "URGENT" | "NORMAL" | "BAS";
  description: string;
  etapesReproduction?: string;
  resultatAttendu?: string;
  page?: string;
  systemeInfo?: {
    navigateur?: string;
    os?: string;
    resolution?: string;
  };
};

export async function creerTicketJira(d: DonneesTicketJira): Promise<{ ok: true; id: string; ref: string } | { ok: false; error: string }> {
  const auth = await requireActionContext("/dashboard/aide", OPTIONS);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { ctx } = auth;

  const titre = d.titre.trim();
  if (!titre) return { ok: false, error: "Veuillez préciser un résumé pour votre demande." };

  const kind = d.template === "BUG" ? "PROBLEME" : d.template === "AMELIORATION" ? "CHANGEMENT" : "QUESTION";
  
  // Numéro séquentiel de ticket
  const count = await prisma.supportTicket.count({ where: { schoolId: ctx.schoolId } });
  const ref = `EDU-${1000 + count + 1}`;
  const subject = `[${ref}] [${d.priorite}] ${titre}`;

  // Construction du corps structuré style Jira
  const sections: string[] = [];
  sections.push(`📌 **Priorité** : ${d.priorite}`);
  sections.push(`📋 **Description** :\n${d.description.trim()}`);
  
  if (d.etapesReproduction?.trim()) {
    sections.push(`🔄 **Étapes pour reproduire** :\n${d.etapesReproduction.trim()}`);
  }
  if (d.resultatAttendu?.trim()) {
    sections.push(`🎯 **Résultat attendu** :\n${d.resultatAttendu.trim()}`);
  }
  
  // Métadonnées système auto
  const sys: string[] = [];
  if (d.page) sys.push(`Page : \`${d.page}\``);
  if (d.systemeInfo?.navigateur) sys.push(`Navigateur : ${d.systemeInfo.navigateur}`);
  if (d.systemeInfo?.os) sys.push(`OS : ${d.systemeInfo.os}`);
  if (d.systemeInfo?.resolution) sys.push(`Écran : ${d.systemeInfo.resolution}`);
  if (sys.length > 0) {
    sections.push(`💻 **Contexte d'exécution** :\n${sys.join(" · ")}`);
  }

  const body = sections.join("\n\n");
  const maintenant = new Date();

  const t = await prisma.supportTicket.create({
    data: {
      schoolId: ctx.schoolId,
      userId: ctx.userId,
      kind,
      subject,
      page: d.page?.slice(0, 300) ?? null,
      lastMessageAt: maintenant,
      schoolReadAt: maintenant,
      messages: {
        create: {
          authorId: ctx.userId,
          body,
        },
      },
    },
  });

  await recordAudit(ctx, { action: "creer", entity: "support", entityId: t.id, details: { ref, kind, priorite: d.priorite } });
  revalidatePath("/dashboard/aide");
  revalidatePath("/dashboard/communications/communaute");
  return { ok: true, id: t.id, ref };
}

export async function listerTicketsEcole(): Promise<{
  id: string;
  subject: string;
  kind: string;
  status: string;
  page: string | null;
  lastMessageAt: string;
  createdAt: string;
  nonLu: boolean;
  messages: { id: string; authorId: string; fromEduCom: boolean; body: string; createdAt: string }[];
}[]> {
  const auth = await requireActionContext("/dashboard/aide", OPTIONS);
  if (!auth.ok) return [];
  const { ctx } = auth;

  const tickets = await prisma.supportTicket.findMany({
    where: { schoolId: ctx.schoolId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
    take: 50,
  });

  return tickets.map((t) => {
    const nonLu = Boolean(t.schoolReadAt && t.lastMessageAt > t.schoolReadAt);
    return {
      id: t.id,
      subject: t.subject,
      kind: t.kind,
      status: t.status,
      page: t.page,
      lastMessageAt: t.lastMessageAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      nonLu,
      messages: t.messages.map((m) => ({
        id: m.id,
        authorId: m.authorId,
        fromEduCom: m.fromEduCom,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  });
}

