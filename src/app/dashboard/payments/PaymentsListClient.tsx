"use client";

import { useMemo, useState } from "react";
import { Search, DollarSign, X, Wallet, History, Send } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { describeStatus } from "@/lib/status";
import { PayButton } from "./PayButton";
import { toast } from "sonner";
import { quickCollect } from "./actions"; // We will create this

type Invoice = {
  id: string;
  title: string;
  totalAmount: number;
  status: string;
  dueDate: string | Date;
  student: { 
    firstName: string; 
    lastName: string;
    enrollments: { class: { id: string, name: string } }[];
  } | null;
};

type ExpectedDetail = {
  studentId: string;
  firstName: string;
  lastName: string;
  classId: string;
  className: string;
  expected: number;
};

const TABS: { key: string; label: string }[] = [
  { key: "ALL", label: "Toutes" },
  { key: "PAID", label: "Payées" },
  { key: "PENDING", label: "En attente" },
  { key: "OVERDUE", label: "En retard" },
];

export default function PaymentsListClient({
  invoices,
  canCollect,
  expectedDetails,
}: {
  invoices: Invoice[];
  canCollect: boolean;
  expectedDetails?: ExpectedDetail[];
}) {
  const [view, setView] = useState<"expected" | "history">("expected");
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const classes = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoices) {
      if (inv.student?.enrollments) {
        for (const enr of inv.student.enrollments) {
          map.set(enr.class.id, enr.class.name);
        }
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [invoices]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: invoices.length };
    for (const i of invoices) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((i) => {
      const matchesTab = tab === "ALL" || i.status === tab;
      
      let matchesClass = true;
      if (classFilter !== "ALL") {
        matchesClass = i.student?.enrollments.some(e => e.class.id === classFilter) ?? false;
      }

      const student = i.student ? `${i.student.firstName} ${i.student.lastName}`.toLowerCase() : "";
      const matchesQuery = !q || i.title.toLowerCase().includes(q) || student.includes(q);
      
      return matchesTab && matchesQuery && matchesClass;
    });
  }, [invoices, tab, query, classFilter]);

  // Group expected details by class
  const expectedByClass = useMemo(() => {
    if (!expectedDetails) return {};
    const grouped: Record<string, { className: string, total: number, students: ExpectedDetail[] }> = {};
    for (const d of expectedDetails) {
      if (!grouped[d.classId]) {
        grouped[d.classId] = { className: d.className, total: 0, students: [] };
      }
      grouped[d.classId].students.push(d);
      grouped[d.classId].total += d.expected;
    }
    // Sort students alphabetically inside each class
    for (const classId in grouped) {
      grouped[classId].students.sort((a, b) => a.lastName.localeCompare(b.lastName));
    }
    return grouped;
  }, [expectedDetails]);

  const expectedClasses = useMemo(() => {
    if (!expectedDetails) return [];
    const map = new Map<string, string>();
    for (const d of expectedDetails) {
      map.set(d.classId, d.className);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [expectedDetails]);

  const filteredExpectedByClass = useMemo(() => {
    if (classFilter === "ALL") return expectedByClass;
    if (!expectedByClass[classFilter]) return {};
    return { [classFilter]: expectedByClass[classFilter] };
  }, [expectedByClass, classFilter]);

  const expectedTotal = useMemo(() => {
    let sum = 0;
    for (const data of Object.values(filteredExpectedByClass)) {
      sum += data.total;
    }
    return sum;
  }, [filteredExpectedByClass]);

  const isFiltered = tab !== "ALL" || query.trim() !== "" || classFilter !== "ALL";
  const reset = () => {
    setTab("ALL");
    setQuery("");
    setClassFilter("ALL");
  };

  const handleQuickCollect = async (studentId: string, amount: number) => {
    setLoadingId(studentId);
    try {
      const res = await quickCollect(studentId, amount);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Encaissement enregistré avec succès");
      }
    } catch (e) {
      toast.error("Erreur inattendue");
    }
    setLoadingId(null);
  };

  const now = Date.now();

  return (
    <div className="space-y-4">
      {/* Navigation entre vues */}
      <div role="tablist" className="flex gap-1 rounded-control bg-sunk p-1 w-fit">
        <button
          role="tab"
          aria-selected={view === "expected"}
          onClick={() => setView("expected")}
          className={`flex items-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            view === "expected"
              ? "bg-surface font-semibold text-text shadow-card"
              : "text-text-soft hover:text-text"
          }`}
        >
          <Wallet className="h-4 w-4" /> Reste à encaisser
        </button>
        <button
          role="tab"
          aria-selected={view === "history"}
          onClick={() => setView("history")}
          className={`flex items-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            view === "history"
              ? "bg-surface font-semibold text-text shadow-card"
              : "text-text-soft hover:text-text"
          }`}
        >
          <History className="h-4 w-4" /> Historique
        </button>
      </div>

      {view === "history" && (
        <>
          <Card>
            <div className="flex flex-col gap-4">
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
                <div className="flex-1 max-w-sm">
                  <Input
                    label="Rechercher"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Motif ou nom de l'élève…"
                  />
                </div>
                {classes.length > 0 && (
                  <div className="w-full sm:w-48">
                    <Select
                      label="Classe"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="ALL">Toutes les classes</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
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
        </>
      )}

      {view === "expected" && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {expectedClasses.length > 0 && (
                  <div className="w-full sm:w-64">
                    <Select
                      label="Filtrer par classe"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="ALL">Toutes les classes</option>
                      {expectedClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
                {classFilter !== "ALL" && (
                  <Button
                    variant="ghost"
                    onClick={() => setClassFilter("ALL")}
                    icon={<X aria-hidden="true" className="h-4 w-4" />}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text-faint">Total affiché</span>
                <span className="text-lg font-semibold text-text">{expectedTotal.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
          {Object.entries(filteredExpectedByClass).length === 0 ? (
            <Card>
              <EmptyState
                icon={Wallet}
                title="Aucun reste à encaisser"
                description="Aucun tarif mensuel obligatoire n'est configuré, ou aucun élève n'est inscrit."
                size="sm"
              />
            </Card>
          ) : (
            Object.entries(filteredExpectedByClass).map(([classId, classData]) => (
              <Card key={classId} flush title={classData.className} actions={<span className="font-semibold">{classData.total.toLocaleString("fr-FR")} FCFA</span>}>
                <DataTable>
                  <DataTable.Head>
                    <tr>
                      <DataTable.HeadCell>Élève</DataTable.HeadCell>
                      <DataTable.HeadCell numeric>Attendu (Mensuel)</DataTable.HeadCell>
                      <DataTable.HeadCell className="text-right">Action</DataTable.HeadCell>
                    </tr>
                  </DataTable.Head>
                  <DataTable.Body>
                    {classData.students.map((student) => (
                      <DataTable.Row key={student.studentId}>
                        <DataTable.Cell>
                          <span className="font-semibold text-text">{student.firstName} {student.lastName}</span>
                        </DataTable.Cell>
                        <DataTable.Cell numeric>
                          <span className="font-medium text-text">{student.expected.toLocaleString("fr-FR")}</span>
                          <span className="ml-1 text-role-meta text-text-faint">FCFA</span>
                        </DataTable.Cell>
                        <DataTable.Cell className="text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            loading={loadingId === student.studentId}
                            disabled={!canCollect || loadingId !== null}
                            onClick={() => handleQuickCollect(student.studentId, student.expected)}
                            icon={<Send className="h-4 w-4" />}
                          >
                            Encaisser
                          </Button>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))}
                  </DataTable.Body>
                </DataTable>
              </Card>
            ))
          )}
          </div>
        </div>
      )}
    </div>
  );
}
