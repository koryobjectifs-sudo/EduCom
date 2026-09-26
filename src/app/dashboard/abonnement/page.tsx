import { redirect } from "next/navigation";
import { ShieldCheck, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  abonnementEcole,
  calculerEtat,
  confirmerPaiementAbonnement,
  GRACE_DAYS,
  type EtatAbonnement,
} from "@/lib/subscription";
import { waveConfigure } from "@/lib/wave";
import PayerAvecWave from "./PayerAvecWave";

const PATH = "/dashboard/abonnement";

/**
 * Abonnement de l'école à EduCom — 25 sept. 2026.
 *
 * ⚠️ Rien à voir avec les paiements des familles (Finance) : ici, c'est
 * l'école qui règle EduCom, par Wave. Réservé à OWNER / ADMIN.
 */
export const dynamic = "force-dynamic";

const LIBELLE: Record<EtatAbonnement, { texte: string; variante: "success" | "info" | "warning" | "danger" }> = {
  ESSAI: { texte: "Essai gratuit", variante: "info" },
  ACTIF: { texte: "Actif", variante: "success" },
  EN_RETARD: { texte: "Échéance dépassée", variante: "warning" },
  LECTURE_SEULE: { texte: "Lecture seule", variante: "danger" },
};

const date = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} F CFA`;

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role as RoleType, PATH)) redirect(firstAllowedPath(user.role as RoleType));
  const { paiement } = await searchParams;

  // Retour du navigateur après Wave : on relit la session chez Wave, sans
  // attendre le webhook (idempotent — le premier des deux qui arrive l'emporte).
  let retour: "PAYE" | "EN_ATTENTE" | "ECHEC" | null = null;
  if (paiement === "retour") {
    const enAttente = await prisma.subscriptionPayment.findFirst({
      where: { schoolId, status: "EN_ATTENTE", checkoutSessionId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (enAttente?.checkoutSessionId && waveConfigure()) {
      try {
        const r = await confirmerPaiementAbonnement(enAttente.checkoutSessionId);
        retour = r === "PAYE" || r === "DEJA_PAYE" ? "PAYE" : r === "ECHEC" ? "ECHEC" : "EN_ATTENTE";
      } catch (e) {
        console.error("[abonnement] relecture de la session au retour impossible", e);
        retour = "EN_ATTENTE";
      }
    } else {
      retour = "PAYE";
    }
  }

  const sub = await abonnementEcole(schoolId);
  const etat = calculerEtat(sub);
  const libelle = LIBELLE[etat.etat];
  const historique = await prisma.subscriptionPayment.findMany({
    where: { schoolId, status: { in: ["PAYE", "EN_ATTENTE"] } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const phrase =
    etat.etat === "ESSAI"
      ? `Votre essai gratuit se termine le ${date(etat.echeance)}${etat.joursRestants > 0 ? ` (dans ${etat.joursRestants} jour${etat.joursRestants > 1 ? "s" : ""})` : ""}.`
      : etat.etat === "ACTIF"
        ? `Votre abonnement est réglé jusqu'au ${date(etat.echeance)}.`
        : etat.etat === "EN_RETARD"
          ? `L'échéance du ${date(etat.echeance)} est dépassée. Sans règlement, votre espace passera en lecture seule le ${date(etat.lectureSeuleLe)}.`
          : `Votre espace est en lecture seule depuis le ${date(etat.lectureSeuleLe)} : vous consultez et imprimez, sans pouvoir modifier. Aucune donnée n'est supprimée ; un règlement rouvre tout immédiatement.`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Abonnement EduCom"
        description="L'abonnement de votre établissement à EduCom, réglé par Wave. Les paiements des familles restent dans Finance."
        breadcrumb={[{ label: "Administration", href: "/dashboard/settings" }, { label: "Abonnement" }]}
      />

      {retour === "PAYE" && (
        <p role="status" className="rounded-surface border border-success/30 bg-success/10 p-4 text-sm font-medium text-text">
          Paiement reçu : merci. Votre abonnement est à jour.
        </p>
      )}
      {retour === "EN_ATTENTE" && (
        <p role="status" className="rounded-surface border border-warning/30 bg-warning/10 p-4 text-sm font-medium text-text">
          Paiement en cours de confirmation par Wave. Actualisez la page dans une minute.
        </p>
      )}
      {(retour === "ECHEC" || paiement === "echec") && (
        <p role="alert" className="rounded-surface border border-danger/30 bg-danger/10 p-4 text-sm font-medium text-text">
          Le paiement n&apos;a pas abouti. Aucun montant n&apos;a été prélevé pour cet abonnement ; vous pouvez réessayer.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="Votre situation">
          <div className="space-y-3">
            <Badge variant={libelle.variante}>{libelle.texte}</Badge>
            <p className="text-sm leading-relaxed text-text">{phrase}</p>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-text-soft">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Après l&apos;échéance, {GRACE_DAYS} jours de grâce : tout reste utilisable. Ensuite, lecture seule — jamais de suppression.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-3" title="Plan Pro" description="Toutes les fonctionnalités, pour toute l'équipe de l'établissement.">
          <div className="space-y-4">
            <p className="text-2xl font-bold text-text">
              {fcfa(etat.prixMensuelXof)} <span className="text-sm font-medium text-text-soft">/ mois</span>
            </p>
            <PayerAvecWave prixMensuel={etat.prixMensuelXof} actif={waveConfigure()} />
            <p className="flex items-center gap-2 text-xs text-text-soft">
              <Wallet aria-hidden="true" className="h-4 w-4 shrink-0" />
              Le paiement s&apos;ouvre dans Wave. Payer en avance ne fait perdre aucun jour : la période s&apos;ajoute à la suite.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Historique des règlements" flush>
        {historique.length === 0 ? (
          <p className="p-5 text-sm text-text-soft">Aucun règlement pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {historique.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="text-text">
                  {date(p.paidAt ?? p.createdAt)} · {p.months} mois
                  {p.periodEnd ? <span className="text-text-soft"> · jusqu&apos;au {date(p.periodEnd)}</span> : null}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-text">{fcfa(p.amountXof)}</span>
                  <Badge variant={p.status === "PAYE" ? "success" : "warning"}>
                    {p.status === "PAYE" ? "Payé" : "En attente"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
