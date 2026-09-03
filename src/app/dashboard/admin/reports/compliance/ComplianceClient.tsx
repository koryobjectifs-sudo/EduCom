"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Check, AlertTriangle, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import type { ComplianceOverview } from "@/lib/documentCompliance";

type Filtre = "tous" | "conformes" | "non-conformes" | "non-configures";

/**
 * Portail de conformité — filtre client sur des données déjà calculées.
 *
 * ⚠️ Aucun calcul de complétude ici : `documentComplianceOverview()` a déjà
 * tranché conforme/non conforme, avec exactement la définition que le dossier
 * élève et son badge utilisent (`received === required`). Ce composant ne fait
 * que trier et filtrer une liste — recalculer localement ferait courir le
 * risque, un jour, d'un chiffre différent pour le même élève entre cet écran et
 * la fiche 360.
 */
export function ComplianceClient({ overview }: { overview: ComplianceOverview }) {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [recherche, setRecherche] = useState("");

  const lignes = useMemo(() => {
    const configurees = overview.configured.map((r) => ({ ...r, kind: "configure" as const }));
    const nonConfigurees = overview.unconfigured.map((r) => ({
      studentId: r.studentId, firstName: r.firstName, lastName: r.lastName, className: r.className,
      cycle: null, required: 0, received: 0, percent: 0, compliant: false, kind: "non-configure" as const,
    }));

    let base = filtre === "conformes" ? configurees.filter((r) => r.compliant)
      : filtre === "non-conformes" ? configurees.filter((r) => !r.compliant)
      : filtre === "non-configures" ? nonConfigurees
      : [...configurees, ...nonConfigurees];

    const q = recherche.trim().toLowerCase();
    if (q) {
      base = base.filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || (r.className ?? "").toLowerCase().includes(q));
    }
    return base.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"));
  }, [overview, filtre, recherche]);

  const cartes: { cle: Filtre; titre: string; valeur: number | string; ton: string }[] = [
    { cle: "tous", titre: "Taux de conformité", valeur: overview.complianceRate !== null ? `${overview.complianceRate} %` : "—", ton: "text-text" },
    { cle: "conformes", titre: "Conformes", valeur: overview.compliantCount, ton: "text-success" },
    { cle: "non-conformes", titre: "Non conformes", valeur: overview.nonCompliantCount, ton: "text-warning" },
    { cle: "non-configures", titre: "Sans checklist applicable", valeur: overview.unconfigured.length, ton: "text-text-faint" },
  ];

  return (
    <div className="space-y-6">
      {/* ───────────── RÉSUMÉ ─────────────
          Chaque carte EST un filtre — cliquer « Non conformes » filtre la liste
          en dessous, au lieu d'obliger à relire les mêmes chiffres dans un menu
          séparé. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cartes.map((c) => (
          <button
            key={c.cle}
            type="button"
            onClick={() => setFiltre(c.cle)}
            aria-pressed={filtre === c.cle}
            className={`rounded-surface border p-4 text-left shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${
              filtre === c.cle ? "border-primary bg-primary/5" : "border-rule bg-surface hover:bg-sunk"
            }`}
          >
            <p className={`text-role-page font-semibold tabular-nums ${c.ton}`}>{c.valeur}</p>
            <p className="mt-1 text-role-meta text-text-soft">{c.titre}</p>
          </button>
        ))}
      </div>

      <Card flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-rule px-5 py-4">
          <div className="relative w-full sm:w-72">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un élève, une classe…"
              inputClassName="pl-9"
            />
          </div>
          <span className="text-role-meta tabular-nums text-text-faint">
            {lignes.length} élève{lignes.length > 1 ? "s" : ""}
          </span>
        </div>

        {lignes.length === 0 ? (
          <div className="p-5">
            <EmptyState size="sm" icon={Search} title="Aucun résultat" description="Aucun élève ne correspond à ce filtre." />
          </div>
        ) : (
          <DataTable>
            <DataTable.Head>
              <tr>
                <DataTable.HeadCell>Élève</DataTable.HeadCell>
                <DataTable.HeadCell>Classe</DataTable.HeadCell>
                <DataTable.HeadCell>Pièces</DataTable.HeadCell>
                <DataTable.HeadCell>État</DataTable.HeadCell>
              </tr>
            </DataTable.Head>
            <DataTable.Body>
              {lignes.map((r) => (
                <DataTable.Row key={r.studentId}>
                  <DataTable.Cell>
                    <Link href={`/dashboard/students/${r.studentId}/dossier`} className="font-medium text-text hover:text-primary hover:underline">
                      {r.firstName} {r.lastName}
                    </Link>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <span className="text-text-soft">{r.className ?? "Sans classe"}</span>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {r.kind === "non-configure" ? (
                      <span className="text-role-meta text-text-faint">—</span>
                    ) : (
                      <span className="tabular-nums text-text-soft">{r.received} / {r.required} · {r.percent} %</span>
                    )}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {r.kind === "non-configure" ? (
                      <span className="inline-flex items-center gap-1.5 text-role-meta font-medium text-text-faint">
                        <HelpCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                        Aucune checklist applicable
                      </span>
                    ) : r.compliant ? (
                      <span className="inline-flex items-center gap-1.5 text-role-meta font-semibold text-success">
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                        Conforme
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-role-meta font-semibold text-warning">
                        <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
                        {r.required - r.received} manquant{r.required - r.received > 1 ? "s" : ""}
                      </span>
                    )}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable.Body>
          </DataTable>
        )}
      </Card>
    </div>
  );
}
