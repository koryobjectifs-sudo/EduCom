"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { perimetre, postVisible, filtreVisible, lireEspace } from "@/lib/community";
import { chargerFormulaire, type Question } from "@/lib/formulaires";
import { demanderIA, iaConfiguree, quotaIA, SYSTEME_ECOLE } from "@/lib/ia";

/**
 * IA de la Communauté — personnel uniquement (26 sept. 2026).
 * Chaque demande revérifie que la personne voit bien ce qu'elle fait résumer.
 */
type R = { ok: true; texte: string } | { ok: false; error: string };

async function contexte() {
  const auth = await requireActionContext(undefined, { lecture: true });
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const actor = { userId: auth.ctx.userId, schoolId: auth.ctx.schoolId, role: auth.ctx.role };
  if (actor.role === "PARENT") return { ok: false as const, error: "Réservé à l'équipe de l'école." };
  if (!iaConfiguree()) return { ok: false as const, error: "L'IA n'est pas encore activée (clé ANTHROPIC_API_KEY manquante)." };
  if (!quotaIA(actor.userId)) return { ok: false as const, error: "Limite atteinte : 40 demandes par heure. Réessayez plus tard." };
  return { ok: true as const, actor };
}

const MODES: Record<string, string> = {
  rediger: "Rédige une publication pour la communauté de l'école à partir de cette consigne.",
  ameliorer: "Améliore ce message : plus clair, plus chaleureux, même sens, même longueur environ.",
  raccourcir: "Raccourcis ce message de moitié en gardant toutes les informations utiles (dates, heures, lieux).",
  corriger: "Corrige uniquement l'orthographe, la grammaire et la ponctuation de ce message. Ne change pas le style.",
  formel: "Réécris ce message sur un ton plus formel et institutionnel, adapté à une direction d'école.",
};

export async function iaRediger(mode: string, texte: string, consigne: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const instruction = MODES[mode];
  if (!instruction) return { ok: false, error: "Demande inconnue." };
  const t = String(texte ?? "").slice(0, 4000);
  const q = String(consigne ?? "").slice(0, 1000);
  if (mode === "rediger" ? !q.trim() && !t.trim() : !t.trim()) return { ok: false, error: "Écrivez d'abord une consigne ou un message." };
  try {
    const sortie = await demanderIA(
      SYSTEME_ECOLE,
      `${instruction}\n${q ? `Consigne : ${q}\n` : ""}${t ? `Message actuel :\n${t}\n` : ""}Réponds uniquement avec le texte final, sans commentaire.`,
    );
    return { ok: true, texte: sortie };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function iaResumerSondage(pollId: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const poll = await prisma.communityPoll.findFirst({
    where: { id: String(pollId), post: { schoolId: c.actor.schoolId } },
    select: {
      postId: true,
      question: true,
      closesAt: true,
      options: { orderBy: { position: "asc" }, select: { id: true, label: true } },
      votes: { select: { optionId: true, userId: true } },
      post: { select: { body: true, comments: { where: { hiddenAt: null }, select: { body: true }, take: 60 } } },
    },
  });
  if (!poll || !(await postVisible(c.actor, await perimetre(c.actor), poll.postId))) return { ok: false, error: "Sondage introuvable." };
  const votants = new Set(poll.votes.map((v) => v.userId)).size;
  const lignes = poll.options.map((o) => `- ${o.label} : ${poll.votes.filter((v) => v.optionId === o.id).length} vote(s)`).join("\n");
  const commentaires = poll.post.comments.map((x) => `- ${x.body.slice(0, 300)}`).join("\n");
  try {
    const texte = await demanderIA(
      SYSTEME_ECOLE,
      `Résume les résultats de ce sondage pour la direction, en 3 à 5 phrases : tendance principale, écarts notables, et une suggestion concrète de suite à donner.
Question : ${poll.question}
${poll.post.body ? `Contexte : ${poll.post.body.slice(0, 800)}\n` : ""}Votants : ${votants}
Résultats :
${lignes}
${commentaires ? `Réponses écrites (anonymisées) :\n${commentaires}` : ""}`,
      500,
    );
    return { ok: true, texte };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function iaAnalyserFormulaire(formId: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const f = await chargerFormulaire(c.actor, String(formId));
  if (!f?.resultats) return { ok: false, error: "Réservé à l'auteur et à la direction." };
  const blocs = (f.questions as Question[]).map((q) => {
    const valeurs = f.resultats!.reponses.map((r) => r.answers[q.id]).filter((v) => v !== undefined && v !== "");
    if (q.type === "choix" || q.type === "cases" || q.type === "echelle") {
      const options = q.type === "echelle" ? ["1", "2", "3", "4", "5"] : q.options;
      const comptes = options.map((o) => `${o} : ${valeurs.filter((v) => (Array.isArray(v) ? v.includes(o) : v === o)).length}`).join(", ");
      return `« ${q.titre} » (${valeurs.length} réponses) — ${comptes}`;
    }
    // Réponses libres : sans aucun nom.
    return `« ${q.titre} » (${valeurs.length} réponses libres) :\n${valeurs.slice(0, 80).map((v) => `- ${String(v).slice(0, 300)}`).join("\n")}`;
  });
  try {
    const texte = await demanderIA(
      SYSTEME_ECOLE,
      `Analyse les réponses de ce formulaire pour la direction. Donne : 1) les chiffres clés en une phrase, 2) les 3 enseignements principaux, 3) les actions à mener. Sois concret et bref (10 lignes au plus), sans puces markdown : utilise des tirets simples.
Formulaire : ${f.titre}
Taux de réponse : ${f.resultats.reponses.length} sur ${f.resultats.destinataires}
${blocs.join("\n\n")}`,
      700,
    );
    return { ok: true, texte };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Récap des 7 derniers jours d'un espace (canal, classe, général) ou du fil. */
export async function iaRecapEspace(espace: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const p = await perimetre(c.actor);
  const e = lireEspace(espace);
  const posts = await prisma.communityPost.findMany({
    where: { AND: [filtreVisible(c.actor, p, e.type === "TOUT" ? null : espace), { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) }, hiddenAt: null }] },
    orderBy: { createdAt: "asc" },
    take: 60,
    select: {
      body: true,
      createdAt: true,
      poll: { select: { question: true, _count: { select: { votes: true } } } },
      _count: { select: { comments: true, reactions: true } },
    },
  });
  if (!posts.length) return { ok: true, texte: "Rien de publié ces 7 derniers jours dans cet espace." };
  const lignes = posts
    .map(
      (x) =>
        `- ${x.createdAt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} : ${(x.body || "").slice(0, 400)}${
          x.poll ? ` [Sondage : ${x.poll.question}, ${x.poll._count.votes} votes]` : ""
        } (${x._count.reactions} réactions, ${x._count.comments} réponses)`,
    )
    .join("\n");
  try {
    const texte = await demanderIA(
      SYSTEME_ECOLE,
      `Fais le récapitulatif de la semaine de cet espace pour quelqu'un qui n'a pas suivi : ce qui a été annoncé, ce qui est à retenir (dates, rappels) et ce qui a fait réagir. 6 lignes au plus, tirets simples.
Publications :
${lignes}`,
      600,
    );
    return { ok: true, texte };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
