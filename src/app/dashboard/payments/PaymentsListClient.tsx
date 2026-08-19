"use client";

import { useMemo, useState } from "react";
import { Search, DollarSign, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { describeStatus } from "@/lib/status";
import { PayButton } from "./PayButton";

/**
 * Liste des factures — écran quotidien du comptable.
 *
 * ═══ CE QUI CHANGE ═══
 *
 * 1. **Trois contrôles factices retirés.** L'ancienne barre portait un champ
 *    « Rechercher une facture… » et deux boutons « Filtrer » / « Statut »,
 *    **aucun n'ayant de handler**. Remplacés par une recherche et des onglets de
 *    statut réellement branchés, sur les factures déjà chargées.
 *
 * 2. **Le bouton d'encaissement était caché au survol** (`opacity-0
 *    group-hover:opacity-100`). Invisible au clavier, inatteignable au tactile —
 *    or c'est l'action principale de l'écran. Il est désormais toujours visible.
 *
 * 3. **Hiérarchie montant / statut.** Le montant passe en graisse forte et
 *    chiffres tabulaires, l'échéance dépassée se colore, et le reste à payer
 *    n'est plus noyé au même niveau que le motif.
 *
 * ⚠️ Aucun calcul financier modifié, aucun indicateur ajouté : les totaux
 * viennent de la page serveur, à l'identique.
 */

type Invoice = {
  id: string;
  title: string;
  totalAmount: number;
  status: string;
  dueDate: string | Date;
  student: { firstName: string; lastName: string } | null;
};

/** Onglets construits depuis les statuts réellement présents. */
const TABS: { key: string; label: string }[] = [
  { key: "ALL", label: "Toutes" },
  { key: "PAID", label: "Payées" },
  { key: "PENDING", label: "En attente" },
  { key: "OVERDUE", label: "En retard" },
];

export default function PaymentsListClient({
  invoices,
  canCollect,
}: {
  invoices: Invoice[];
  /**
   * L'acteur peut-il encaisser ? Résolu côté serveur par `hasAccess()`.
   *
   * ⚠️ Confort d'affichage, PAS une sécurité : `markInvoiceAsPaid` revérifie le
   * droit depuis la session. Avant le lot 11.1 cette action n'avait **aucun
   * contrôle de rôle**, et un parent pouvait solder n'importe quelle facture de
   * son école.
   */
  canCollect: boolean;
}) {
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: invoices.length };
    for (const i of invoices) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((i) => {
      const matchesTab = tab === "ALL" || i.status === tab;
      const student = i.student ? `${i.student.firstName} ${i.student.lastName}`.toLowerCase() : "";
      const matchesQuery = !q || i.title.toLowerCase().includes(q) || student.includes(q);
      return matchesTab && matchesQuery;
    });
  }, [invoices, tab, query]);

  const isFiltered = tab !== "ALL" || query.trim() !== "";
  const reset = () => {
    setTab("ALL");
    setQuery("");
  };

  const now = Date.now();

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-4">
          {/* Onglets de statut. Le libellé porte l'information, le compteur la
              précise — la couleur ne fait que renforcer, comme au lot 03. */}
          <div role="tablist" aria-label="Filtrer par statut" className="flex flex-wrap gap-1">
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              const n = counts[key] ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-role-body font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    active
                      ? "bg-primary/8 font-semibold text-primary"
                      : "text-text-soft hover:bg-sunk hover:text-text",
                  ].join(" ")}
                >
                  {label}
                  <span className={`tabular-nums ${active ? "text-primary" : "text-text-faint"}`}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label="Rechercher"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Motif de la facture ou nom de l'élève…"
              className="flex-1"
            />
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={reset}
                icon={<X aria-hidden="true" className="h-4 w-4" />}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card flush>
        <DataTable caption="Factures de l'établissement">
          <DataTable.Head>
            <tr>
              <DataTable.HeadCell>Motif</DataTable.HeadCell>
              <DataTable.HeadCell className="hidden sm:table-cell">Élève</DataTable.HeadCell>
              <DataTable.HeadCell numeric>Montant</DataTable.HeadCell>
              <DataTable.HeadCell className="hidden md:table-cell">Échéance</DataTable.HeadCell>
              <DataTable.HeadCell>Statut</DataTable.HeadCell>
              <DataTable.HeadCell className="text-right">
                <span className="sr-only">Actions</span>
              </DataTable.HeadCell>
            </tr>
          </DataTable.Head>
          <DataTable.Body>
            {filtered.length === 0 ? (
              <DataTable.EmptyRow colSpan={6}>
                {isFiltered ? (
                  <EmptyState
                    icon={Search}
                    title="Aucune facture ne correspond"
                    description="Essayez un autre statut ou d'autres termes de recherche."
                    action={{ label: "Réinitialiser les filtres", onClick: reset }}
                    size="sm"
                  />
                ) : (
                  <EmptyState
                    icon={DollarSign}
                    title="Aucune facture"
                    description="Commencez par créer une facture pour un élève."
                    action={{ label: "Nouvelle facture", href: "/dashboard/payments/new" }}
                    size="sm"
                  />
                )}
              </DataTable.EmptyRow>
            ) : (
              filtered.map((invoice) => {
                const due = new Date(invoice.dueDate);
                const late = invoice.status === "OVERDUE" || (invoice.status !== "PAID" && due.getTime() < now);
                const studentName = invoice.student
                  ? `${invoice.student.firstName} ${invoice.student.lastName}`
                  : null;

                return (
                  <DataTable.Row key={invoice.id}>
                    <DataTable.Cell>
                      <span className="font-semibold text-text">{invoice.title}</span>
                      {/* Sous sm, l'élève se replie ici plutôt que de disparaître. */}
                      {studentName && (
                        <span className="block text-role-meta text-text-soft sm:hidden">
                          {studentName}
                        </span>
                      )}
                    </DataTable.Cell>

                    <DataTable.Cell className="hidden sm:table-cell text-text-soft">
                      {studentName ?? <span className="text-text-faint">Destinataire non défini</span>}
                    </DataTable.Cell>

                    <DataTable.Cell numeric>
                      <span className="font-semibold text-text">
                        {invoice.totalAmount.toLocaleString("fr-FR")}
                      </span>
                      <span className="ml-1 text-role-meta text-text-faint">FCFA</span>
                    </DataTable.Cell>

                    <DataTable.Cell className="hidden md:table-cell whitespace-nowrap">
                      <span className={late ? "font-medium text-danger" : "text-text-soft"}>
                        {due.toLocaleDateString("fr-FR")}
                      </span>
                    </DataTable.Cell>

                    <DataTable.Cell>
                      <StatusBadge domain="invoice" status={invoice.status} />
                      {/* Sous md, l'échéance dépassée reste signalée en texte. */}
                      {late && (
                        <span className="block text-role-meta text-danger md:hidden">
                          échue le {due.toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </DataTable.Cell>

                    <DataTable.Cell className="text-right">
                      {invoice.status !== "PAID" && canCollect ? (
                        <PayButton invoiceId={invoice.id} />
                      ) : invoice.status !== "PAID" ? (
                        <span className="text-role-meta text-text-faint">
                          {describeStatus("invoice", invoice.status).label}
                        </span>
                      ) : (
                        <span className="text-role-meta text-text-faint">
                          {describeStatus("invoice", "PAID").label}
                        </span>
                      )}
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })
            )}
          </DataTable.Body>
        </DataTable>

        {filtered.length > 0 && (
          <DataTable.Footer>
            <span>
              {filtered.length} facture{filtered.length > 1 ? "s" : ""} affichée
              {filtered.length > 1 ? "s" : ""}
              {isFiltered ? ` sur ${invoices.length}` : ""}
            </span>
          </DataTable.Footer>
        )}
      </Card>
    </div>
  );
}
