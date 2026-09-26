import { envoyerNotificationPush } from "@/lib/webpush";
import { prisma } from "@/lib/prisma";
import { reglesDuCanal, resoudreAudience } from "@/lib/audience";
import type { ActorContext } from "@/lib/audit";

/**
 * Notifications push du navigateur — phase 4, 25 sept. 2026.
 *
 * Sans WhatsApp, un parent ne sait pas qu'une annonce ou un message l'attend :
 * c'est le levier d'engagement de la Communauté. Web Push standard (VAPID),
 * gratuit, sans magasin d'applications. Sur iPhone, il faut « Ajouter à
 * l'écran d'accueil » (iOS 16.4+) avant de pouvoir autoriser les notifications.
 *
 * ⚠️ Canal honnête : sans clés VAPID dans l'environnement, RIEN n'est envoyé
 * et rien ne prétend l'avoir été (même principe que `lib/channels.ts`).
 *
 * Variables : NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
 * VAPID_SUBJECT (ex. « mailto:contact@educom.school »).
 * Implémentation native sans dépendance : `src/lib/webpush.ts`.
 */
let vapid: { sujet: string; clePublique: string; clePrivee: string } | null | undefined;

export function pushConfigure(): boolean {
  if (vapid === undefined) {
    const clePublique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const clePrivee = process.env.VAPID_PRIVATE_KEY?.trim();
    const sujet = process.env.VAPID_SUBJECT?.trim() || "mailto:contact@educom.school";
    vapid = clePublique && clePrivee ? { sujet, clePublique, clePrivee } : null;
  }
  return vapid !== null;
}

export type ContenuPush = { title: string; body: string; url: string; tag?: string };

/** Envoie à tous les appareils des utilisateurs donnés ; purge les abonnements expirés. */
export async function envoyerPush(userIds: string[], contenu: ContenuPush): Promise<number> {
  if (!pushConfigure() || userIds.length === 0) return 0;
  const abonnements = await prisma.pushSubscription.findMany({
    where: { userId: { in: [...new Set(userIds)] } },
  });
  const charge = JSON.stringify({ ...contenu, body: contenu.body.slice(0, 180) });
  const expires: string[] = [];
  let envoyes = 0;

  // Par paquets de 50 : jamais des centaines de requêtes simultanées.
  for (let i = 0; i < abonnements.length; i += 50) {
    const paquet = abonnements.slice(i, i + 50);
    const res = await Promise.allSettled(
      paquet.map((a) =>
        envoyerNotificationPush({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, vapid!),
      ),
    );
    res.forEach((r, j) => {
      if (r.status === "fulfilled") envoyes++;
      else {
        const code = (r.reason as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) expires.push(paquet[j].id);
      }
    });
  }
  if (expires.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: expires } } });
  return envoyes;
}

/**
 * Notifier = cloche dans EduCom (toujours) + notification du téléphone /
 * de l'ordinateur (si l'appareil l'a autorisée). 26 sept. 2026.
 * La cloche réutilise `StaffNotification` (une ligne par destinataire,
 * parents compris) : `kind` commence par « communaute. ».
 */
export async function notifier(
  schoolId: string,
  userIds: string[],
  contenu: ContenuPush & { kind?: string },
): Promise<void> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  for (let i = 0; i < ids.length; i += 1000) {
    await prisma.staffNotification.createMany({
      data: ids.slice(i, i + 1000).map((userId) => ({
        userId,
        schoolId,
        kind: contenu.kind ?? "communaute",
        title: contenu.title.slice(0, 200),
        body: contenu.body.slice(0, 500),
        link: contenu.url,
      })),
    });
  }
  await envoyerPush(ids, contenu).catch((e) => console.error("[notifications] push impossible :", (e as Error).message));
}

/**
 * Notifie des personnes de rôles mêlés : les parents reçoivent un lien vers
 * l'espace famille, le personnel vers le tableau de bord.
 */
export async function notifierPersonnes(
  schoolId: string,
  userIds: string[],
  contenu: { title: string; body: string; suffixe: string; tag?: string; kind?: string },
) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true } });
  const parents = users.filter((u) => u.role === "PARENT").map((u) => u.id);
  const equipe = users.filter((u) => u.role !== "PARENT").map((u) => u.id);
  const base = { title: contenu.title, body: contenu.body, tag: contenu.tag, kind: contenu.kind };
  await notifier(schoolId, parents, { ...base, url: `/famille/communaute${contenu.suffixe}` });
  await notifier(schoolId, equipe, { ...base, url: `/dashboard/communications/communaute${contenu.suffixe}` });
}

/* ═══════════════════════ Destinataires ═══════════════════════ */

async function enseignantsDeClasse(schoolId: string, classId: string | null): Promise<string[]> {
  if (!classId) return [];
  const [aff, cls] = await Promise.all([
    prisma.teachingAssignment.findMany({ where: { schoolId, classId }, select: { teacherId: true } }),
    prisma.class.findFirst({ where: { id: classId, schoolId }, select: { teacherId: true } }),
  ]);
  return [...aff.map((a) => a.teacherId), cls?.teacherId].filter((x): x is string => Boolean(x));
}

const ROLES_CANAL: Record<string, string[]> = {
  DIRECTION: ["OWNER", "ADMIN"],
  SECRETARIAT: ["SECRETARY", "ASSISTANT"],
  COMPTABILITE: ["ACCOUNTANT"],
};

/** Nouveau message privé : prévient l'autre côté de la conversation. */
export async function notifierNouveauMessage(auteur: ActorContext, conversationId: string, apercu: string) {
  const conv = await prisma.communityConversation.findFirst({
    where: { id: conversationId, schoolId: auteur.schoolId },
    select: { kind: true, parentId: true, canal: true, classId: true, userAId: true, userBId: true },
  });
  if (!conv) return;
  const moi = await prisma.user.findUnique({ where: { id: auteur.userId }, select: { firstName: true, lastName: true } });
  const nom = [moi?.firstName, moi?.lastName].filter(Boolean).join(" ") || "EduCom";

  if (conv.kind === "EQUIPE") {
    const autre = conv.userAId === auteur.userId ? conv.userBId : conv.userAId;
    if (!autre) return;
    await notifier(auteur.schoolId, [autre], {
      title: `Message de ${nom}`,
      body: apercu,
      url: `/dashboard/communications/communaute?c=${conversationId}`,
      tag: `conv-${conversationId}`,
    });
    return;
  }

  if (auteur.role === "PARENT") {
    const destinataires =
      conv.canal === "ENSEIGNANT"
        ? await enseignantsDeClasse(auteur.schoolId, conv.classId)
        : (
            await prisma.user.findMany({
              where: { schoolId: auteur.schoolId, role: { in: (ROLES_CANAL[conv.canal] ?? []) as never[] } },
              select: { id: true },
            })
          ).map((u) => u.id);
    await notifier(auteur.schoolId, destinataires, {
      title: `Message de ${nom}`,
      body: apercu,
      url: `/dashboard/communications/communaute?c=${conversationId}`,
      tag: `conv-${conversationId}`,
    });
  } else if (conv.parentId) {
    await notifier(auteur.schoolId, [conv.parentId], {
      title: `Message de l'école · ${nom}`,
      body: apercu,
      url: `/famille/communaute?c=${conversationId}`,
      tag: `conv-${conversationId}`,
    });
  }
}


/** Nouvelle publication : personnes concernées par l'espace, hors auteur. */
export async function notifierNouvellePublication(
  auteur: ActorContext,
  post: { id: string; audience: string; classId: string | null; channelId?: string | null; body: string },
) {
  const corps = post.body || "📷 Nouvelle photo";
  const cle = post.audience === "CLASSE" ? `classe:${post.classId}` : post.audience === "CANAL" ? `canal:${post.channelId}` : "ECOLE";
  const lien = (base: string) => `${base}?espace=${encodeURIComponent(cle)}#pub-${post.id}`;

  let parents: string[] = [];
  let personnel: string[] = [];
  let titre = "Nouvelle annonce de l'école";

  if (post.audience === "CANAL" && post.channelId) {
    const canal = await prisma.communityChannel.findFirst({
      where: { id: post.channelId, schoolId: auteur.schoolId, archivedAt: null },
      select: { name: true, kind: true, audience: true, members: { select: { userId: true } } },
    });
    if (!canal) return;
    titre = `Nouveau message dans #${canal.name}`;
    // Exactement les personnes du canal (règles « @ » + personnes nommées).
    const audience = await resoudreAudience(auteur.schoolId, reglesDuCanal(canal), canal.members.map((m) => m.userId));
    parents = audience.parents;
    personnel = audience.personnel;
  } else {
    const eleves = await prisma.student.findMany({
      where: {
        schoolId: auteur.schoolId,
        parentId: { not: null },
        ...(post.audience === "CLASSE" && post.classId ? { enrollments: { some: { classId: post.classId } } } : {}),
      },
      select: { parentId: true },
    });
    parents = eleves.map((e) => e.parentId!);
    personnel = post.audience === "CLASSE" ? await enseignantsDeClasse(auteur.schoolId, post.classId) : [];
    if (post.audience === "CLASSE") titre = "Nouvelle annonce pour la classe";
  }

  await notifier(auteur.schoolId, 
    parents.filter((id) => id !== auteur.userId),
    { title: titre, body: corps, url: lien("/famille/communaute"), tag: `pub-${post.id}` },
  );
  await notifier(auteur.schoolId, 
    personnel.filter((id) => id !== auteur.userId),
    { title: titre, body: corps, url: lien("/dashboard/communications/communaute"), tag: `pub-${post.id}` },
  );
}
