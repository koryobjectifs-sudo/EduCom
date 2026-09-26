"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { GERE_DISTRIBUTION, etatDistribution, annoncerDistributionsEchues } from "@/lib/bulletinsParents";

/** Distribution des bulletins aux familles — direction et secrétariat (26 sept. 2026). */
type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function contexte() {
  const auth = await requireActionContext("/dashboard/grades/distribution");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const actor = { userId: auth.ctx.userId, schoolId: auth.ctx.schoolId, role: auth.ctx.role };
  if (!GERE_DISTRIBUTION.includes(actor.role)) return { ok: false as const, error: "Réservé à la direction et au secrétariat." };
  return { ok: true as const, actor };
}

/**
 * Distribue les bulletins d'un trimestre aux familles des classes choisies.
 * `date` : "AAAA-MM-JJ" (le matin de ce jour) ou vide = maintenant.
 * Seules les classes dont TOUS les bulletins sont approuvés peuvent partir.
 */
export async function distribuerBulletins(termId: string, classIds: string[], date: string | null): Promise<R<{ classes: number; prevenus: number }>> {
  const c = await contexte();
  if (!c.ok) return c;
  const terme = await prisma.term.findFirst({ where: { id: String(termId), schoolId: c.actor.schoolId }, select: { id: true } });
  if (!terme) return { ok: false, error: "Trimestre introuvable." };
  const publishAt = date ? new Date(`${date}T07:00:00`) : new Date();
  if (Number.isNaN(publishAt.getTime())) return { ok: false, error: "Date invalide." };

  const etat = await etatDistribution(c.actor, terme.id);
  const demandees = new Set(Array.isArray(classIds) ? classIds : []);
  const pretes = etat.filter((x) => demandees.has(x.classId) && x.pret && !x.distribution?.publie);
  const refusees = etat.filter((x) => demandees.has(x.classId) && !x.pret);
  if (!pretes.length) {
    return {
      ok: false,
      error: refusees.length
        ? `Pas encore prêt : ${refusees.map((x) => x.classe).join(", ")}. Tous les bulletins doivent être approuvés par le secrétariat.`
        : "Choisissez au moins une classe.",
    };
  }
  await prisma.$transaction(
    pretes.map((x) =>
      prisma.bulletinDistribution.upsert({
        where: { termId_classId: { termId: terme.id, classId: x.classId } },
        update: { publishAt, createdById: c.actor.userId, notifiedAt: null },
        create: { schoolId: c.actor.schoolId, termId: terme.id, classId: x.classId, publishAt, createdById: c.actor.userId },
      }),
    ),
  );
  const prevenus = publishAt <= new Date() ? await annoncerDistributionsEchues(c.actor.schoolId) : 0;
  revalidatePath("/dashboard/grades/distribution");
  revalidatePath("/famille/notes");
  return { ok: true, classes: pretes.length, prevenus };
}

/** Annule une distribution programmée (impossible une fois la date passée : les parents l'ont déjà). */
export async function annulerDistribution(termId: string, classId: string): Promise<R> {
  const c = await contexte();
  if (!c.ok) return c;
  const r = await prisma.bulletinDistribution.deleteMany({
    where: { schoolId: c.actor.schoolId, termId: String(termId), classId: String(classId), publishAt: { gt: new Date() } },
  });
  if (!r.count) return { ok: false, error: "Déjà distribuée : les familles ont le bulletin." };
  revalidatePath("/dashboard/grades/distribution");
  return { ok: true };
}
