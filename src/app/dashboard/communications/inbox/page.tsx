import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { channels } from "@/lib/channels";
import InboxClient, { type InboxChat } from "./InboxClient";

/**
 * Historique des messages — page serveur.
 *
 * ⚠️ L'état du canal est résolu **ici**, jamais dans le composant client :
 * `src/lib/channels.ts` lit `process.env` et doit rester côté serveur. L'écran
 * reçoit une phrase déjà rédigée, pas de quoi la deviner.
 */
export default async function InboxPage() {
  // Redirige vers /login si la session ou l'école manque — même garde que les
  // générateurs de documents, pas une vérification parallèle.
  const { schoolId } = await requireSchoolContext();

  const parents = await prisma.user.findMany({
    where: { role: "PARENT", schoolId },
    select: {
      id: true, firstName: true, lastName: true, phone: true,
      messages: {
        orderBy: { createdAt: "desc" },
        select: { id: true, direction: true, content: true, status: true, createdAt: true },
      },
    },
  });

  const chats: InboxChat[] = parents
    .filter((p) => p.messages.length > 0)
    .map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      phone: p.phone || "Téléphone non renseigné",
      messages: p.messages.map((m) => ({
        id: m.id,
        direction: String(m.direction),
        content: m.content,
        status: String(m.status),
        createdAt: m.createdAt.toISOString(),
      })),
      lastMessageText: p.messages[0].content,
      time: p.messages[0].createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    }))
    .sort((a, b) => +new Date(b.messages[0].createdAt) - +new Date(a.messages[0].createdAt));

  // Le canal WhatsApp est le seul pertinent pour cet historique.
  const whatsapp = channels().find((c) => c.id === "whatsapp")!;

  return (
    <InboxClient
      chats={chats}
      canalReel={whatsapp.canSend}
      raisonCanal={whatsapp.reason}
    />
  );
}
