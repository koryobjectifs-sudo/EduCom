import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataState } from "./DataState";

/**
 * « Dernières factures » — volontairement **rétrogradé**.
 *
 * ═══ POURQUOI CE BLOC A MAIGRI ═══
 *
 * Il occupait auparavant trois cinquièmes de la largeur, en tableau complet avec
 * en-têtes de colonnes, juste sous les indicateurs. Le matin, une directrice y
 * lisait d'abord de la facturation — alors que sa question est « comment va mon
 * école ». La facturation est un **travail de gestionnaire**, pas un état de
 * santé d'établissement.
 *
 * Le bloc est conservé (rien n'est retiré à qui s'en sert) mais il descend en
 * bas de page, passe en liste compacte, et perd ses en-têtes de colonnes. Son
 * lien « Tout voir » mène là où ce travail se fait réellement.
 *
 * ⚠️ Ce n'est pas une suppression de fonctionnalité : les cinq mêmes factures,
 * avec le même statut et le même montant, restent accessibles en un coup d'œil.
 */
export default function RecentInvoices({
  invoices,
}: {
  invoices: {
    id: string; title: string; status: string; totalAmount: number;
    createdAt: Date; student: string | null;
  }[];
}) {
  return (
    <Card
      flush
      title="Dernières factures"
      description="Suivi détaillé dans Paiements"
      actions={
        <Link
          href="/dashboard/payments"
          className="group inline-flex items-center gap-1.5 text-role-meta font-medium text-text-soft transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Tout voir
          <ArrowRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      }
    >
      {invoices.length === 0 ? (
        <div className="p-4">
          <DataState
            kind="empty"
            icon={CreditCard}
            title="Aucune facture"
            description="Les factures émises apparaîtront ici."
            action={{ label: "Facturer", href: "/dashboard/payments" }}
          />
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors duration-200 hover:bg-sunk/40">
              <div className="min-w-0 flex-1">
                <p className="truncate text-role-body font-medium text-text">{inv.title}</p>
                <p className="truncate text-role-meta text-text-faint">
                  {inv.student ?? "Destinataire non défini"}
                  {" · "}
                  <time dateTime={inv.createdAt.toISOString()}>
                    {inv.createdAt.toLocaleDateString("fr-FR")}
                  </time>
                </p>
              </div>
              <span className="shrink-0 text-role-body font-semibold tabular-nums text-text">
                {inv.totalAmount.toLocaleString("fr-FR")}
                <span className="ml-1 text-role-meta font-normal text-text-faint">FCFA</span>
              </span>
              <span className="shrink-0">
                <StatusBadge domain="invoice" status={inv.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
