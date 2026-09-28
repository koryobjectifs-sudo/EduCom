"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { perimetre } from "@/lib/community";
import { notifier, notifierPersonnes } from "@/lib/notifications";
import {
  peutCreerFormulaire,
  questionsValides,
  reponsesValides,
  destinatairesAutorises,
  resoudreDestinataires,
  type Question,
} from "@/lib/formulaires";

/** Formulaires — actions (26 sept. 2026). Règles : `lib/formulaires.ts`. */
type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const DIRECTION = ["OWNER", "ADMIN"];

function rafraichir() {
  revalidatePath("/dashboard/communications/communaute");
  revalidatePath("/famille/communaute");
}

export async function creerFormulaire(input: {
  titre: string;
  description?: string;
  questions: unknown;
  regles?: string[];
  personnes?: string[];
  anonyme?: boolean;
  closesAt?: string | null;
  /** « M'envoyer aussi le formulaire » : l'auteur le reçoit comme les autres (pratique pour tester). */
  inclureMoi?: boolean;
}): Promise<R<{ id: string; destinataires: number }>> {
  const auth = await requireActionContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const actor = { userId: auth.ctx.userId, schoolId: auth.ctx.schoolId, role: auth.ctx.role };
  if (!peutCreerFormulaire(actor.role, auth.ctx.grants)) return { ok: false, error: "Votre rôle ne permet pas d'envoyer des formulaires." };

  const titre = typeof input.titre === "string" ? input.titre.trim().slice(0, 200) : "";
  if (!titre) return { ok: false, error: "Donnez un titre au formulaire." };
  const questions = questionsValides(input.questions);
  if (typeof questions === "string") return { ok: false, error: questions };
  const fin = input.closesAt ? new Date(input.closesAt) : null;
  if (fin && (Number.isNaN(fin.getTime()) || fin <= new Date())) return { ok: false, error: "La date limite doit être dans le futur." };

  const p = await perimetre(actor);
  const cible = await destinatairesAutorises(actor, p.classIds, input.regles, input.personnes);
  const resolus = (await resoudreDestinataires(actor.schoolId, cible.regles, cible.personnes)).filter((id) => id !== actor.userId);
  const destinataires = input.inclureMoi ? [...resolus, actor.userId] : resolus;
  if (!resolus.length && !input.inclureMoi) {
    return {
      ok: false,
      error: "Personne ne correspond à ces destinataires (aucun compte parent ou membre rattaché). Ajoutez un groupe ou un nom.",
    };
  }

  const form = await prisma.communityForm.create({
    data: {
      schoolId: actor.schoolId,
      authorId: actor.userId,
      title: titre,
      description: typeof input.description === "string" ? input.description.trim().slice(0, 2000) || null : null,
      questions,
      audience: cible.regles,
      anonymous: Boolean(input.anonyme),
      closesAt: fin,
    },
    select: { id: true },
  });
  for (let i = 0; i < destinataires.length; i += 1000) {
    await prisma.communityFormRecipient.createMany({
      data: destinataires.slice(i, i + 1000).map((userId) => ({ formId: form.id, userId })),
      skipDuplicates: true,
    });
  }
  await notifierPersonnes(actor.schoolId, destinataires, {
    title: `📝 Formulaire à remplir : ${titre}`,
    body: fin ? `À remplir avant le ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.` : "Quelques questions de l'école.",
    suffixe: `?form=${form.id}`,
    tag: `form-${form.id}`,
    kind: "communaute.formulaire",
  }).catch((e) => console.error("[formulaires] notification impossible :", (e as Error).message));
  // Confirmation dans la cloche de l'auteur (trace de l'envoi).
  await notifier(actor.schoolId, [actor.userId], {
    title: `📨 Formulaire envoyé : ${titre}`,
    body: `${resolus.length} destinataire${resolus.length > 1 ? "s" : ""} prévenu${resolus.length > 1 ? "s" : ""}. Suivez les ouvertures et les réponses.`,
    url: `${actor.role === "PARENT" ? "/famille/communaute" : "/dashboard/communications/communaute"}?form=${form.id}`,
    kind: "communaute.formulaire.envoi",
  }).catch(() => null);
  rafraichir();
  return { ok: true, id: form.id, destinataires: resolus.length };
}

export async function repondreFormulaire(formId: string, answers: unknown): Promise<R> {
  const auth = await requireActionContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { userId, schoolId } = auth.ctx;
  const f = await prisma.communityForm.findFirst({
    where: { id: typeof formId === "string" ? formId : "", schoolId, recipients: { some: { userId } } },
    select: { id: true, questions: true, closesAt: true },
  });
  if (!f) return { ok: false, error: "Formulaire introuvable." };
  if (f.closesAt && f.closesAt <= new Date()) return { ok: false, error: "Ce formulaire est clos." };
  const propres = reponsesValides(f.questions as Question[], answers);
  if (typeof propres === "string") return { ok: false, error: propres };
  await prisma.communityFormResponse.upsert({
    where: { formId_userId: { formId: f.id, userId } },
    update: { answers: propres },
    create: { formId: f.id, userId, answers: propres },
  });
  rafraichir();
  return { ok: true };
}

/** Relance : notifie les destinataires qui n'ont pas encore répondu. */
export async function relancerFormulaire(formId: string): Promise<R<{ relances: number }>> {
  const auth = await requireActionContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { userId, schoolId, role } = auth.ctx;
  const f = await prisma.communityForm.findFirst({
    where: { id: typeof formId === "string" ? formId : "", schoolId },
    select: { id: true, title: true, authorId: true, closesAt: true, recipients: { select: { userId: true } }, responses: { select: { userId: true } } },
  });
  if (!f || (f.authorId !== userId && !DIRECTION.includes(role))) return { ok: false, error: "Formulaire introuvable." };
  if (f.closesAt && f.closesAt <= new Date()) return { ok: false, error: "Ce formulaire est clos." };
  const repondu = new Set(f.responses.map((r) => r.userId));
  const cibles = f.recipients.map((r) => r.userId).filter((id) => !repondu.has(id));
  await notifierPersonnes(schoolId, cibles, {
    title: `⏰ Rappel : ${f.title}`,
    body: "Votre réponse est attendue. Cela prend une minute.",
    suffixe: `?form=${f.id}`,
    tag: `form-${f.id}`,
    kind: "communaute.formulaire",
  });
  return { ok: true, relances: cibles.length };
}

export async function cloreFormulaire(formId: string): Promise<R> {
  const auth = await requireActionContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { userId, schoolId, role } = auth.ctx;
  const f = await prisma.communityForm.findFirst({ where: { id: typeof formId === "string" ? formId : "", schoolId }, select: { id: true, authorId: true } });
  if (!f || (f.authorId !== userId && !DIRECTION.includes(role))) return { ok: false, error: "Formulaire introuvable." };
  await prisma.communityForm.update({ where: { id: f.id }, data: { closesAt: new Date() } });
  rafraichir();
  return { ok: true };
}
