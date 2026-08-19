import { CreditCard, UserPlus, MessageSquare, Activity, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * « Activité récente » — priorité 3 du tableau de bord.
 *
 * ═══ CE QUI REMPLACE QUOI ═══
 *
 * `ActivityFeedWidget` était **entièrement fictif** : quatre événements écrits en
 * dur dans un tableau, avec des noms d'élèves inventés (« Paiement de 50 000
 * FCFA reçu pour Jean D. ») et des horodatages inventés (« Il y a 10 min »).
 * `context.md` le décrivait pourtant comme un « widget Flux d'Activité en temps
 * réel ».
 *
 * Ce flux est construit depuis trois sources réelles, toutes horodatées et
 * filtrées par établissement :
 *   · `Payment.createdAt`  → un paiement encaissé, avec son montant réel
 *   · `Student.createdAt`  → une admission enregistrée
 *   · `Message.createdAt`  → un message entrant de famille
 *
 * Les trois sont fusionnées et triées par date décroissante. Aucun événement
 * n'est généré : si la base est vide, l'état vide le dit.
 */

export type ActivityKind = "payment" | "enrollment" | "message";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  /** Texte complet de l'événement, construit depuis les données réelles. */
  label: string;
  at: Date;
};

const KIND: Record<ActivityKind, { icon: LucideIcon; tone: string }> = {
  payment: { icon: CreditCard, tone: "text-success" },
  enrollment: { icon: UserPlus, tone: "text-accent" },
  message: { icon: MessageSquare, tone: "text-text-soft" },
};

/**
 * Date relative en français.
 *
 * Rendu côté serveur, donc l'écart est calculé au moment du rendu de la page —
 * pas d'horodatage inventé, et pas de décalage entre serveur et client puisque
 * la date absolue reste disponible en infobulle.
 */
function relative(at: Date, now: number): string {
  const min = Math.floor((now - at.getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  if (d < 30) return `il y a ${d} jours`;
  return at.toLocaleDateString("fr-FR");
}

export default function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const now = Date.now();

  return (
    <Card flush title="Activité récente" description="Derniers mouvements enregistrés">
      {events.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={Activity}
            title="Aucune activité"
            description="Les paiements, admissions et messages reçus apparaîtront ici."
            size="sm"
          />
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {events.map((e) => {
            const { icon: Icon, tone } = KIND[e.kind];
            return (
              <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-sunk ${tone}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-role-body text-text">{e.label}</p>
                  <time
                    dateTime={e.at.toISOString()}
                    title={e.at.toLocaleString("fr-FR")}
                    className="text-role-meta text-text-faint"
                  >
                    {relative(e.at, now)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
