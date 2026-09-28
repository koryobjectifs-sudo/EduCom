import { prisma } from "@/lib/prisma";

/**
 * Écritures du pilotage DANS la base d'EduCom, au format qu'EduCom lit déjà :
 * trace `AuditLog` et notification `StaffNotification` (la cloche).
 * Pas de notification push ici (clés VAPID propres à EduCom) : la cloche suffit.
 */
export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Propriétaire", ADMIN: "Administrateur", SECRETARY: "Secrétaire", ACCOUNTANT: "Comptable", TEACHER: "Enseignant", ASSISTANT: "Assistant", PARENT: "Parent",
};
export const roleLabel = (r: string) => ROLE_LABEL[r] ?? r;

export async function tracer(p: { userId: string; email: string }, schoolId: string, action: string, entity: "pilotage" | "support", entityId: string | null, details: Record<string, unknown> = {}) {
  try {
    await prisma.auditLog.create({
      data: { action, entity, entityId, userId: p.userId, schoolId, details: JSON.stringify({ role: "EDUCOM", outcome: "success", par: p.email, ...details }) },
    });
  } catch (e) {
    console.error("[pilotage] trace impossible :", (e as Error).message);
  }
}

export async function notifierCloche(schoolId: string, userIds: string[], n: { kind: string; title: string; body: string; link: string }) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  await prisma.staffNotification
    .createMany({ data: ids.map((userId) => ({ userId, schoolId, kind: n.kind, title: n.title.slice(0, 200), body: n.body.slice(0, 500), link: n.link })) })
    .catch((e: Error) => console.error("[pilotage] notification impossible :", e.message));
}

export async function directeurs(schoolId: string) {
  return (await prisma.user.findMany({ where: { schoolId, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true } })).map((u) => u.id);
}

export const urlEduCom = () => (process.env.EDUCOM_URL || "https://www.educom.school").replace(/\/$/, "");
