import Link from "next/link";
import { AlertTriangle, Clock, Lock } from "lucide-react";

/**
 * Bandeau d'abonnement EduCom, en haut de chaque écran — 25 sept. 2026.
 *
 * Premier canal de relance, et le seul qui atteint sûrement la direction :
 * aucun canal sortant (e-mail, SMS, WhatsApp) n'est opérationnel dans le
 * dépôt (voir `lib/channels.ts`). Silencieux tant que l'essai a plus de 3 jours
 * devant lui ou que l'abonnement est actif.
 */
export type InfoBandeau = {
  etat: "ESSAI" | "ACTIF" | "EN_RETARD" | "LECTURE_SEULE";
  joursRestants: number;
  echeance: string;
  lectureSeuleLe: string;
  peutPayer: boolean;
};

export default function BandeauAbonnement({ info }: { info: InfoBandeau }) {
  const { etat, joursRestants } = info;
  if (etat === "ACTIF" || (etat === "ESSAI" && joursRestants > 3)) return null;

  const ton =
    etat === "LECTURE_SEULE"
      ? { cls: "border-danger/30 bg-danger/10", Icon: Lock }
      : etat === "EN_RETARD"
        ? { cls: "border-warning/40 bg-warning/15", Icon: AlertTriangle }
        : { cls: "border-primary/25 bg-primary/10", Icon: Clock };

  const message =
    etat === "ESSAI"
      ? joursRestants <= 0
        ? "Votre essai gratuit se termine aujourd'hui."
        : `Votre essai gratuit se termine dans ${joursRestants} jour${joursRestants > 1 ? "s" : ""} (le ${info.echeance}).`
      : etat === "EN_RETARD"
        ? `Abonnement échu le ${info.echeance}. Sans règlement, l'espace passera en lecture seule le ${info.lectureSeuleLe}.`
        : "Abonnement échu : l'espace est en lecture seule. Vos données sont intactes ; un règlement rouvre tout immédiatement.";

  return (
    <div role={etat === "ESSAI" ? "status" : "alert"} className={`mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-surface border px-4 py-2.5 text-sm text-text ${ton.cls}`}>
      <ton.Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {info.peutPayer ? (
        <Link
          href="/dashboard/abonnement"
          className="inline-flex min-h-9 items-center rounded-control bg-primary px-3.5 text-[13px] font-semibold text-white hover:bg-primary-hover"
        >
          {etat === "ESSAI" ? "Choisir l'abonnement" : "Régler avec Wave"}
        </Link>
      ) : (
        <span className="text-xs text-text-soft">La direction peut régler l&apos;abonnement.</span>
      )}
    </div>
  );
}
