"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { BellDot, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { markNotificationRead } from "../../settings/fees/actions";

/**
 * Une notification non lue, avec son bouton de lecture. Lot 12.2.
 *
 * ═══ CE QUI REND CE BOUTON SÛR ═══
 *
 * L'action ne reçoit que l'`id`. Le destinataire et l'école viennent de la
 * session : `markNotificationRead()` filtre sur `userId` **et** `schoolId`, donc
 * marquer la notification d'un collègue ou d'un autre établissement ne
 * correspond à aucune ligne — l'action renvoie « introuvable » plutôt que
 * d'écrire. Aucun identifiant d'utilisateur ne transite par le client.
 *
 * La ligne disparaît de l'écran après lecture (`revalidatePath` côté action,
 * plus un retrait optimiste local pour que le retour soit immédiat).
 */
export function NotificationItem({
  id,
  title,
  body,
  link,
  createdAtIso,
}: {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAtIso: string;
}) {
  const [pending, start] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const when = new Date(createdAtIso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  function markRead() {
    start(async () => {
      const r = await markNotificationRead(id);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      setDismissed(true);
      toast.success("Notification marquée comme lue.");
    });
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-surface border border-primary/25 bg-primary/5 px-4 py-3"
    >
      <BellDot aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

      <div className="min-w-0 flex-1">
        <p className="text-role-body font-semibold text-text">
          {title}
          {/* L'état « non lue » est écrit, pas seulement coloré. */}
          <span className="ml-2 rounded-pill bg-primary/15 px-2 py-0.5 text-role-meta font-medium text-primary">
            Non lue
          </span>
        </p>
        <p className="mt-0.5 text-role-meta leading-relaxed text-text-soft">{body}</p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {link && (
            <Link href={link} className="text-role-meta font-medium text-primary hover:underline">
              Consulter
            </Link>
          )}
          <Button size="sm" variant="ghost" loading={pending} onClick={markRead}>
            <Check aria-hidden="true" className="h-4 w-4" />
            Marquer comme lue
          </Button>
        </div>
      </div>

      <time dateTime={createdAtIso} className="shrink-0 text-role-meta tabular-nums text-text-faint">
        {when}
      </time>
    </div>
  );
}
