"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { chargerSemaineClasse, semaineValide, matiereAutorisee, actionsPerso } from "@/lib/bilanSemaine";
import { construireRecap, estVerdict, jourDe, lundiDe, normaliser, VERDICTS, formaterNote } from "@/lib/bilanRegles";
import { notifier } from "@/lib/notifications";

/**
 * Bilan de la semaine (v2) — actions. Droits : `lib/bilanSemaine.ts`.
 * Tout identifiant reçu est revérifié (classe accessible, élève inscrit,
 * matière que l'acteur enseigne).
 */
const PATH = "/dashboard/grades/bilan-semaine";
type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function contexte() {
  const auth = await requireActionContext(PATH);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return { ok: true as const, actor: { userId: auth.ctx.userId, schoolId: auth.ctx.schoolId, role: auth.ctx.role } };
}

async function prevenirParents(schoolId: string, messages: { studentId: string; titre: string; texte: string; tag: string }[]) {
  if (!messages.length) return 0;
  const eleves = await prisma.student.findMany({
    where: { id: { in: [...new Set(messages.map((m) => m.studentId))] }, schoolId, parentId: { not: null } },
    select: { id: true, parentId: true },
  });
  const parent = new Map(eleves.map((e) => [e.id, e.parentId!]));
  let n = 0;
  for (const m of messages) {
    const p = parent.get(m.studentId);
    if (!p) continue;
    await notifier(schoolId, [p], { title: m.titre, body: m.texte, url: `/famille/notes#bilan-${m.studentId}`, tag: m.tag, kind: "famille.bilan" }).catch((e) =>
      console.error("[bilan] notification impossible :", (e as Error).message),
    );
    n++;
  }
  return n;
}

const resume = (o: { subjectName: string; kind: string; topics: string[]; gradeLabel?: string | null; gradeValue?: number | null; gradeMax?: number | null }) =>
  `${o.subjectName} ${o.kind === "FORT" ? "✅" : "❌"}${o.topics.length ? ` ${o.topics.join(", ")}` : ""}${
    o.gradeValue != null && o.gradeMax ? ` · ${o.gradeLabel ?? "Note"} ${formaterNote(o.gradeValue, o.gradeMax)}` : ""
  }`;

export async function ajouterObservation(input: {
  classId: string;
  studentIds: string[];
  subjectKey: string;
  date: string;
  kind: "TRAVAIL" | "FORT";
  topics: string[];
  note?: { libelle: string; valeur: number; max: number } | null;
  action?: string | null;
  commentaire?: string | null;
  prevenir?: boolean;
}): Promise<R<{ ajoutees: number; prevenus: number }>> {
  const c = await contexte();
  if (!c.ok) return c;
  const d = new Date(typeof input.date === "string" ? input.date : "");
  if (Number.isNaN(d.getTime())) return { ok: false, error: "Date invalide." };
  const jour = jourDe(d);
  if (jour > jourDe()) return { ok: false, error: "Pas d'observation dans le futur." };
  const s = await chargerSemaineClasse(c.actor, typeof input.classId === "string" ? input.classId : "", semaineValide(jour.toISOString()));
  if (!s) return { ok: false, error: "Classe introuvable." };
  if (lundiDe(jour).toISOString() !== s.semaine) return { ok: false, error: "Date hors des 26 dernières semaines." };
  if (!s.peutObserver) return { ok: false, error: "Seuls les enseignants de la classe et la direction ajoutent des observations." };
  const matiere = matiereAutorisee(s, input.subjectKey);
  if (!matiere) return { ok: false, error: "Vous n'enseignez pas cette matière dans cette classe." };
  const inscrits = new Set(s.eleves.map((e) => e.id));
  const eleves = [...new Set(Array.isArray(input.studentIds) ? input.studentIds : [])].filter((id) => inscrits.has(id));
  if (!eleves.length) return { ok: false, error: "Choisissez au moins un élève." };
  const kind = input.kind === "FORT" ? "FORT" : "TRAVAIL";
  const topics = [...new Set((Array.isArray(input.topics) ? input.topics : []).map((t) => String(t).trim().slice(0, 60)).filter(Boolean))].slice(0, 8);
  let note: { libelle: string; valeur: number; max: number } | null = null;
  if (input.note && Number.isFinite(input.note.valeur) && Number.isFinite(input.note.max)) {
    if (input.note.max <= 0 || input.note.max > 100 || input.note.valeur < 0 || input.note.valeur > input.note.max) return { ok: false, error: "Note invalide." };
    note = { libelle: String(input.note.libelle || "Devoir").trim().slice(0, 60), valeur: input.note.valeur, max: input.note.max };
  }
  const commentaire = typeof input.commentaire === "string" ? input.commentaire.trim().slice(0, 500) || null : null;
  if (!topics.length && !note && !commentaire && input.subjectKey !== "LECONS" && input.subjectKey !== "DEVOIRS") {
    return { ok: false, error: "Précisez au moins un point, une note ou un commentaire." };
  }
  const action = kind === "TRAVAIL" && typeof input.action === "string" ? input.action.trim().slice(0, 300) || null : null;
  const maintenant = new Date();

  await prisma.studentObservation.createMany({
    data: eleves.map((studentId) => ({
      schoolId: c.actor.schoolId,
      classId: s.classe.id,
      studentId,
      subjectKey: input.subjectKey,
      subjectName: matiere.nom,
      date: jour,
      kind,
      topics,
      gradeLabel: note?.libelle ?? null,
      gradeValue: note?.valeur ?? null,
      gradeMax: note?.max ?? null,
      action,
      comment: commentaire,
      authorId: c.actor.userId,
      notifiedAt: input.prevenir ? maintenant : null,
    })),
  });
  let prevenus = 0;
  if (input.prevenir) {
    const nomEleve = new Map(s.eleves.map((e) => [e.id, e.nom.split(" ")[0]]));
    prevenus = await prevenirParents(
      c.actor.schoolId,
      eleves.map((id) => ({
        studentId: id,
        titre: `📝 ${nomEleve.get(id)} — ${matiere.nom}`,
        texte: `${resume({ subjectName: matiere.nom, kind, topics, gradeLabel: note?.libelle, gradeValue: note?.valeur, gradeMax: note?.max })}${action ? ` → ${action}` : ""}`,
        tag: `obs-${id}-${jour.toISOString().slice(0, 10)}`,
      })),
    );
  }
  revalidatePath(PATH);
  return { ok: true, ajoutees: eleves.length, prevenus };
}

export async function supprimerObservation(id: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const o = await prisma.studentObservation.findFirst({ where: { id: typeof id === "string" ? id : "", schoolId: c.actor.schoolId }, select: { id: true, authorId: true } });
  if (!o || (o.authorId !== c.actor.userId && !["OWNER", "ADMIN"].includes(c.actor.role))) return { ok: false, error: "Observation introuvable." };
  await prisma.studentObservation.delete({ where: { id: o.id } });
  revalidatePath(PATH);
  return { ok: true };
}

/** Point du jour : prévient les parents des observations du jour pas encore envoyées (celles de l'acteur). */
export async function envoyerPointDuJour(classId: string): Promise<R<{ prevenus: number }>> {
  const c = await contexte();
  if (!c.ok) return c;
  const s = await chargerSemaineClasse(c.actor, typeof classId === "string" ? classId : "", lundiDe());
  if (!s || !s.peutObserver) return { ok: false, error: "Classe introuvable." };
  const jour = jourDe();
  const obs = await prisma.studentObservation.findMany({
    where: { schoolId: c.actor.schoolId, classId: s.classe.id, date: jour, authorId: c.actor.userId, notifiedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!obs.length) return { ok: true, prevenus: 0 };
  const parEleve = new Map<string, typeof obs>();
  for (const o of obs) parEleve.set(o.studentId, [...(parEleve.get(o.studentId) ?? []), o]);
  const nomEleve = new Map(s.eleves.map((e) => [e.id, e.nom.split(" ")[0]]));
  const prevenus = await prevenirParents(
    c.actor.schoolId,
    [...parEleve.entries()].map(([id, liste]) => ({
      studentId: id,
      titre: `📝 Point du jour — ${nomEleve.get(id)}`,
      texte: liste
        .map((o) => resume({ ...o, topics: Array.isArray(o.topics) ? (o.topics as string[]) : [] }))
        .join(" · ")
        .slice(0, 300),
      tag: `jour-${id}-${jour.toISOString().slice(0, 10)}`,
    })),
  );
  await prisma.studentObservation.updateMany({ where: { id: { in: obs.map((o) => o.id) } }, data: { notifiedAt: new Date() } });
  revalidatePath(PATH);
  return { ok: true, prevenus };
}

/** Commentaire et verdict du bilan de la semaine d'un élève (professeur principal, direction). */
export async function modifierRecap(classId: string, semaineIso: string, studentId: string, champ: { commentaire?: string; verdict?: string | null }): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const semaine = semaineValide(semaineIso);
  const s = await chargerSemaineClasse(c.actor, typeof classId === "string" ? classId : "", semaine);
  if (!s) return { ok: false, error: "Classe introuvable." };
  if (!s.peutEnvoyer) return { ok: false, error: `Le bilan de la semaine est rédigé par le professeur principal${s.principal ? ` (${s.principal})` : ""}.` };
  if (!s.eleves.some((e) => e.id === studentId)) return { ok: false, error: "Élève introuvable dans cette classe." };
  const data: { comment?: string | null; verdict?: string | null } = {};
  if (typeof champ.commentaire === "string") data.comment = champ.commentaire.trim().slice(0, 600) || null;
  if ("verdict" in champ) {
    if (champ.verdict !== null && !estVerdict(champ.verdict)) return { ok: false, error: "Verdict inconnu." };
    data.verdict = champ.verdict ?? null;
  }
  await prisma.weeklyReview.upsert({
    where: { studentId_weekStart: { studentId, weekStart: semaine } },
    update: { ...data, authorId: c.actor.userId },
    create: { schoolId: c.actor.schoolId, classId: s.classe.id, studentId, weekStart: semaine, authorId: c.actor.userId, levels: {}, ...data },
  });
  return { ok: true };
}

/**
 * Envoie le bilan de la semaine aux parents : récapitulatif par matière (observations
 * de tous les enseignants + notes de la semaine), figé à l'envoi. Un élève sans
 * rien à dire n'est pas envoyé. Renvoyer met à jour et prévient de nouveau.
 */
export async function envoyerBilans(classId: string, semaineIso: string): Promise<R<{ envoyes: number; vides: number; sansParent: number }>> {
  const c = await contexte();
  if (!c.ok) return c;
  const semaine = semaineValide(semaineIso);
  const s = await chargerSemaineClasse(c.actor, typeof classId === "string" ? classId : "", semaine);
  if (!s) return { ok: false, error: "Classe introuvable." };
  if (!s.peutEnvoyer) return { ok: false, error: `Le bilan de la semaine est envoyé par le professeur principal${s.principal ? ` (${s.principal})` : ""}.` };
  const perso = await actionsPerso(c.actor.schoolId);
  const maintenant = new Date();
  let envoyes = 0;
  let vides = 0;
  let sansParent = 0;
  const messages: { studentId: string; titre: string; texte: string; tag: string }[] = [];
  for (const e of s.eleves) {
    const snap = construireRecap({
      semaine: s.libelleSemaine,
      eleve: e.nom,
      classe: s.classe.nom,
      enseignant: s.principal ?? s.moi,
      observations: s.observations.filter((o) => o.studentId === e.id),
      notes: s.notes.filter((n) => n.studentId === e.id),
      verdictChoisi: e.verdict,
      commentaire: e.commentaire,
      perso,
    });
    if (!snap) {
      vides++;
      continue;
    }
    await prisma.weeklyReview.upsert({
      where: { studentId_weekStart: { studentId: e.id, weekStart: semaine } },
      update: { snapshot: snap, sentAt: maintenant, seenAt: null },
      create: { schoolId: c.actor.schoolId, classId: s.classe.id, studentId: e.id, weekStart: semaine, authorId: c.actor.userId, levels: {}, snapshot: snap, sentAt: maintenant },
    });
    envoyes++;
    if (!e.aUnParent) sansParent++;
    const v = snap.verdict ? `${VERDICTS[snap.verdict].emoji} ${VERDICTS[snap.verdict].libelle}` : "Bilan";
    messages.push({
      studentId: e.id,
      titre: `📘 ${e.envoyeLe ? "Bilan mis à jour" : "Bilan de la semaine"} — ${e.nom.split(" ")[0]}`,
      texte: `${v}${snap.actions.length ? ` · ${snap.actions.length} action${snap.actions.length > 1 ? "s" : ""} pour le week-end` : ""}`,
      tag: `bilan-${e.id}-${semaine.toISOString().slice(0, 10)}`,
    });
  }
  await prevenirParents(c.actor.schoolId, messages);
  revalidatePath(PATH);
  revalidatePath("/famille/notes");
  return { ok: true, envoyes, vides, sansParent };
}

/** Actions proposées aux parents, par matière — direction seulement. */
export async function enregistrerActionsBilan(actions: Record<string, string>): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  if (!["OWNER", "ADMIN"].includes(c.actor.role)) return { ok: false, error: "Réservé à la direction." };
  const propre: Record<string, string> = {};
  for (const [k, v] of Object.entries(actions ?? {})) {
    if (typeof v !== "string") continue;
    const cle = k === "LECONS" || k === "DEVOIRS" ? k : normaliser(k);
    if (cle && v.trim()) propre[cle.slice(0, 80)] = v.trim().slice(0, 300);
  }
  await prisma.weeklyReviewSetting.upsert({
    where: { schoolId: c.actor.schoolId },
    update: { actions: propre },
    create: { schoolId: c.actor.schoolId, actions: propre },
  });
  revalidatePath(PATH);
  return { ok: true };
}
