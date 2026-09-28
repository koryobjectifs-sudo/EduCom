import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
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
  type EtatAbonnement,
} from "@/lib/subscription";
import { waveConfigure } from "@/lib/wave";
import { TRIAL_DAYS } from "@/lib/pricing";
import PayerAvecWave from "./PayerAvecWave";

const PATH = "/dashboard/abonnement";

export const dynamic = "force-dynamic";

const LIBELLE: Record<
  EtatAbonnement,
  { texte: string; variante: "success" | "info" | "warning" | "danger" }
> = {
  ESSAI: { texte: "Période d'essai gratuit", variante: "info" },
  ACTIF: { texte: "Abonnement Actif", variante: "success" },
  EN_RETARD: { texte: "Échéance dépassée", variante: "warning" },
  LECTURE_SEULE: { texte: "Accès en lecture seule", variante: "danger" },
};

const dateHeure = (d: Date) =>
  `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

const dateSimple = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} F CFA`;

type LigneHistorique = {
  id: string;
  dateOperation: Date;
  duree: string;
  periode: string;
  reference: string;
  montant: number;
  statut: "PAYE" | "REMBOURSE" | "EN_ATTENTE";
  motif?: string | null;
};

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role as RoleType, PATH))
    redirect(firstAllowedPath(user.role as RoleType));
  const { paiement } = await searchParams;

  // Relecture immédiate de la session Wave au retour du navigateur
  let retour: "PAYE" | "EN_ATTENTE" | "ECHEC" | null = null;
  if (paiement === "retour") {
    const enAttente = await prisma.subscriptionPayment.findFirst({
      where: { schoolId, status: "EN_ATTENTE", checkoutSessionId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (enAttente?.checkoutSessionId && waveConfigure()) {
      try {
        const r = await confirmerPaiementAbonnement(enAttente.checkoutSessionId);
        retour =
          r === "PAYE" || r === "DEJA_PAYE"
            ? "PAYE"
            : r === "ECHEC"
              ? "ECHEC"
              : "EN_ATTENTE";
      } catch (e) {
        console.error("[abonnement] relecture de session impossible au retour", e);
        retour = "EN_ATTENTE";
      }
    } else {
      retour = "PAYE";
    }
  }

  const sub = await abonnementEcole(schoolId);
  const etat = calculerEtat(sub);
  const libelle = LIBELLE[etat.etat];
  const paiementsRaw = await prisma.subscriptionPayment.findMany({
    where: { schoolId, status: { in: ["PAYE", "EN_ATTENTE", "REMBOURSE"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Construction de l'historique comptable immuable :
  // Chaque encaissement est conservé sous l'opération "Payé" avec sa date/heure d'origine.
  // Tout remboursement fait l'objet d'une ligne d'écriture distincte avec son horodatage et son motif.
  const historique: LigneHistorique[] = [];
  for (const p of paiementsRaw) {
    if (p.status === "PAYE" || p.status === "REMBOURSE") {
      // 1. Événement d'encaissement d'origine
      historique.push({
        id: `${p.id}-paye`,
        dateOperation: p.paidAt ?? p.createdAt,
        duree: `${p.months} mois`,
        periode: p.periodEnd ? `Jusqu'au ${dateSimple(p.periodEnd)}` : "—",
        reference: p.clientReference,
        montant: p.amountXof,
        statut: "PAYE",
      });

      // 2. Si remboursé, création d'une ligne d'écriture distincte de remboursement
      if (p.status === "REMBOURSE") {
        historique.push({
          id: `${p.id}-rembourse`,
          dateOperation: p.refundedAt ?? p.createdAt,
          duree: `${p.months} mois annulés`,
          periode: p.refundReason ? `Motif : ${p.refundReason}` : "Annulation & remboursement",
          reference: `${p.clientReference}-REMBOURSEMENT`,
          montant: -p.amountXof,
          statut: "REMBOURSE",
          motif: p.refundReason,
        });
      }
    } else {
      historique.push({
        id: p.id,
        dateOperation: p.createdAt,
        duree: `${p.months} mois`,
        periode: "En attente de règlement",
        reference: p.clientReference,
        montant: p.amountXof,
        statut: "EN_ATTENTE",
      });
    }
  }

  // Tri antichronologique strict
  historique.sort((a, b) => b.dateOperation.getTime() - a.dateOperation.getTime());

  const dernierPaiementValide = paiementsRaw.find((h) => h.status === "PAYE" || h.paidAt);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Abonnement & Licence Établissement"
        description="Gérez la licence de votre établissement en toute transparence. Règlement direct et sécurisé via Wave Business."
        breadcrumb={[
          { label: "Administration", href: "/dashboard/settings" },
          { label: "Abonnement" },
        ]}
      />

      {/* ── Bannières de statut de paiement ── */}
      {retour === "PAYE" && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-950 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Paiement confirmé avec succès par Wave ! Votre abonnement est immédiatement prolongé.
          </span>
        </div>
      )}
      {retour === "EN_ATTENTE" && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-950 dark:text-amber-200">
          <Clock className="h-4 w-4 shrink-0 text-amber-600 animate-spin" />
          <span>
            Votre règlement est en cours de validation par le réseau Wave. Statut mis à jour d&apos;ici 1 minute.
          </span>
        </div>
      )}
      {(retour === "ECHEC" || paiement === "echec") && (
        <div className="flex items-center gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
          <span>
            Le paiement n&apos;a pas abouti. Aucun montant n&apos;a été prélevé sur votre compte Wave.
          </span>
        </div>
      )}

      {/* ── Statut Actuel de l'Établissement (Design raffiné & compact) ── */}
      <div className="relative overflow-hidden rounded-xl border border-rule/70 bg-surface px-4 py-4 sm:px-5 sm:py-4.5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant={libelle.variante} size="sm">{libelle.texte}</Badge>
              <span className="text-[11px] font-medium text-text-soft">
                Formule :{" "}
                <strong className="text-text font-semibold">
                  {sub.plan === "STANDARD" ? "Standard" : "Premium"}
                </strong>
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold tracking-tight text-text">
              {etat.etat === "ACTIF"
                ? `Abonnement actif jusqu'au ${dateSimple(etat.echeance)}`
                : etat.etat === "ESSAI"
                  ? `Essai gratuit de ${TRIAL_DAYS} jours en cours (fin le ${dateSimple(etat.echeance)})`
                  : etat.etat === "EN_RETARD"
                    ? `Votre abonnement est arrivé à échéance le ${dateSimple(etat.echeance)}`
                    : `Votre espace est en consultation : renouvelez pour débloquer les écritures`}
            </h2>

            <p className="text-[11.5px] leading-relaxed text-text-soft">
              {etat.etat === "ACTIF"
                ? "Toutes les fonctionnalités sont débloquées. Vous pouvez anticiper votre renouvellement sans perte de jours (les mois s'ajoutent à la suite)."
                : etat.etat === "ESSAI"
                  ? "Profitez de votre évaluation. Activez votre formule dès aujourd'hui pour pérenniser l'accès de vos équipes."
                  : "Vos données, élèves, bulletins et comptabilité sont préservés à 100%. Un règlement via Wave réactive instantanément la saisie."}
            </p>
          </div>

          {/* 3 micro-cartes compactes & raffinées */}
          <div className="grid grid-cols-3 gap-2 shrink-0 sm:w-auto">
            <div className="rounded-lg border border-rule/60 bg-sunk/40 px-2.5 py-2">
              <div className="flex items-center gap-1 text-[10px] font-medium text-text-soft">
                <Calendar className="h-3 w-3 text-primary shrink-0" />
                <span>Échéance</span>
              </div>
              <div className="mt-0.5 text-xs font-bold text-text truncate">
                {etat.joursRestants > 0 ? `Dans ${etat.joursRestants} j` : "Échue"}
              </div>
              <div className="text-[9.5px] text-text-faint truncate">{dateSimple(etat.echeance)}</div>
            </div>

            <div className="rounded-lg border border-rule/60 bg-sunk/40 px-2.5 py-2">
              <div className="flex items-center gap-1 text-[10px] font-medium text-text-soft">
                <CreditCard className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>Dernier règlement</span>
              </div>
              <div className="mt-0.5 text-xs font-bold text-text truncate">
                {dernierPaiementValide ? fcfa(dernierPaiementValide.amountXof) : "Essai offert"}
              </div>
              <div className="text-[9.5px] text-text-faint truncate">
                {dernierPaiementValide ? dateSimple(dernierPaiementValide.paidAt ?? dernierPaiementValide.createdAt) : "0 F CFA"}
              </div>
            </div>

            <div className="rounded-lg border border-rule/60 bg-sunk/40 px-2.5 py-2">
              <div className="flex items-center gap-1 text-[10px] font-medium text-text-soft">
                <ShieldCheck className="h-3 w-3 text-purple-600 shrink-0" />
                <span>Garantie</span>
              </div>
              <div className="mt-0.5 text-xs font-bold text-text truncate">Souveraine</div>
              <div className="text-[9.5px] text-text-faint truncate">100% préservé</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section Choix de Formule, Durées & Paiement Wave ── */}
      <Card
        title="Formules d'abonnement & Renouvellement"
        description="Choisissez la formule adaptée à votre établissement et réglez en toute simplicité."
      >
        <PayerAvecWave
          formuleInitiale={sub.plan}
          actif={waveConfigure()}
        />
      </Card>

      {/* ── Historique des règlements & Factures (Traçabilité complète) ── */}
      <Card
        title="Historique des règlements & Justificatifs"
        description="Consultez l'historique complet et certifié de vos transactions pour la comptabilité de votre établissement."
        flush
      >
        {historique.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-8 w-8 text-text-soft/60" />
            <p className="mt-2 text-xs font-medium text-text">
              Aucun règlement enregistré pour le moment.
            </p>
            <p className="text-[11px] text-text-soft">
              Votre établissement est actuellement sous période d&apos;évaluation gratuite.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-rule bg-sunk/40 text-text-soft">
                <tr>
                  <th className="py-2.5 px-4 font-semibold text-[11px]">Date & Heure</th>
                  <th className="py-2.5 px-3 font-semibold text-[11px]">Opération</th>
                  <th className="py-2.5 px-3 font-semibold text-[11px]">Période / Détail</th>
                  <th className="py-2.5 px-3 font-semibold text-[11px]">Référence</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-[11px]">Montant</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-[11px]">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-text">
                {historique.map((l) => (
                  <tr key={l.id} className="hover:bg-sunk/20 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-[11.5px] tabular-nums whitespace-nowrap">
                      {dateHeure(l.dateOperation)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[11.5px]">
                      {l.duree}
                    </td>
                    <td className="py-2.5 px-3 text-text-soft text-[11px]">
                      {l.periode}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10.5px] text-text-soft">
                      {l.reference}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold tabular-nums text-[11.5px] ${
                      l.statut === "REMBOURSE" ? "text-danger" : "text-text"
                    }`}>
                      {l.montant < 0 ? `- ${fcfa(Math.abs(l.montant))}` : fcfa(l.montant)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Badge
                        size="sm"
                        variant={
                          l.statut === "PAYE"
                            ? "success"
                            : l.statut === "REMBOURSE"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {l.statut === "PAYE"
                          ? "Payé"
                          : l.statut === "REMBOURSE"
                          ? "Remboursé"
                          : "En attente"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
