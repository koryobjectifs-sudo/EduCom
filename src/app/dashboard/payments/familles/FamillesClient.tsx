"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Search,
  Users,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Receipt,
  Phone,
  ArrowRight,
  GraduationCap,
  X,
  CreditCard,
  Banknote,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatXOF } from "@/lib/finance/numbering";
import { recordInvoicePayment } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { FamilyRow, FamiliesSummary, FamilyInvoice } from "@/lib/finance/familyService";

type TabFilter = "ALL" | "OVERDUE" | "PARTIAL" | "UP_TO_DATE";

export default function FamillesClient({
  initialFamilies,
  summary,
  canCollect,
}: {
  initialFamilies: FamilyRow[];
  summary: FamiliesSummary;
  canCollect: boolean;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");

  // Modal d'encaissement rapide
  const [selectedFamily, setSelectedFamily] = useState<FamilyRow | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [collectMethod, setCollectMethod] = useState<"CASH" | "CHECK" | "MOBILE_MONEY" | "BANK_TRANSFER">("CASH");
  const [collectReference, setCollectReference] = useState("");
  const [isPending, startTransition] = useTransition();
  const [lastPaymentResult, setLastPaymentResult] = useState<{
    paymentId: string;
    receiptNumber: string | null;
    amount: number;
  } | null>(null);

  // Filtrage ultra-rapide côté client
  const filteredFamilies = useMemo(() => {
    let list = initialFamilies;

    // Filtre par onglet
    if (activeTab === "OVERDUE") {
      list = list.filter((f) => f.status === "OVERDUE");
    } else if (activeTab === "PARTIAL") {
      list = list.filter((f) => f.status === "PARTIAL");
    } else if (activeTab === "UP_TO_DATE") {
      list = list.filter((f) => f.status === "UP_TO_DATE");
    }

    // Filtre par terme de recherche
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((f) => {
        const inFamily = f.familyName.toLowerCase().includes(q);
        const inGuardian = f.guardianName.toLowerCase().includes(q);
        const inPhone = f.guardianPhone?.toLowerCase().includes(q);
        const inChildren = f.children.some(
          (c) =>
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            (c.matricule && c.matricule.toLowerCase().includes(q)) ||
            (c.className && c.className.toLowerCase().includes(q))
        );
        return inFamily || inGuardian || inPhone || inChildren;
      });
    }

    return list;
  }, [initialFamilies, activeTab, searchTerm]);

  // Ouverture du modal d'encaissement pour une famille
  const handleOpenCollect = (fam: FamilyRow) => {
    setSelectedFamily(fam);
    setLastPaymentResult(null);
    setCollectReference("");
    setCollectMethod("CASH");

    if (fam.unpaidInvoices.length > 0) {
      // Sélectionne la plus ancienne facture impayée par défaut
      const defaultInv = fam.unpaidInvoices[0];
      setSelectedInvoiceId(defaultInv.id);
      setCollectAmount(String(defaultInv.reliquat));
    } else {
      setSelectedInvoiceId("");
      setCollectAmount("");
    }
  };

  const handleCloseModal = () => {
    setSelectedFamily(null);
    setSelectedInvoiceId("");
    setCollectAmount("");
    setCollectReference("");
    setLastPaymentResult(null);
  };

  // Changement de facture sélectionnée dans le modal
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const target = selectedFamily?.unpaidInvoices.find((i) => i.id === invId);
    if (target) {
      setCollectAmount(String(target.reliquat));
    }
  };

  // Validation de l'encaissement
  const handleSubmitCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily || !selectedInvoiceId) return;

    const targetInv = selectedFamily.unpaidInvoices.find((i) => i.id === selectedInvoiceId);
    if (!targetInv) {
      toast.error("Veuillez sélectionner une facture.");
      return;
    }

    const parsed = parseInt(collectAmount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Veuillez saisir un montant supérieur à zéro.");
      return;
    }

    if (parsed > targetInv.reliquat) {
      toast.error(
        `Le montant ne peut pas dépasser le reliquat restant (${formatXOF(targetInv.reliquat)}).`
      );
      return;
    }

    startTransition(async () => {
      const res = await recordInvoicePayment({
        invoiceId: targetInv.id,
        amount: parsed,
        method: collectMethod,
        reference: collectReference.trim() || undefined,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      if (res?.success && res.paymentId) {
        setLastPaymentResult({
          paymentId: res.paymentId,
          receiptNumber: res.receiptNumber ?? null,
          amount: parsed,
        });
        toast.success(
          `Encaissement de ${formatXOF(parsed)} validé pour la ${selectedFamily.familyName}.`
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ═══ BANDEAU DE STATISTIQUES RÉACTIVES ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4 bg-surface">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
            Total Familles
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-text">
            {summary.totalFamilies}
          </p>
          <p className="text-xs text-text-soft mt-0.5">inscrites dans l&apos;école</p>
        </Card>

        <Card className="p-3 sm:p-4 bg-surface">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
            Total Dû
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-text">
            {formatXOF(summary.totalDue)}
          </p>
          <p className="text-xs text-text-soft mt-0.5">facturation globale</p>
        </Card>

        <Card className="p-3 sm:p-4 bg-surface">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
            Total Encaissé
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatXOF(summary.totalPaid)}
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-0.5">versements enregistrés</p>
        </Card>

        <Card className="p-3 sm:p-4 bg-surface border-t-2 border-t-danger">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            Reliquat Global
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums text-red-700 dark:text-red-400">
            {formatXOF(summary.totalReliquat)}
          </p>
          <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5 font-medium">
            reste à recouvrer
          </p>
        </Card>
      </div>

      {/* ═══ BARRE D'OUTILS : RECHERCHE + ONGLETS DE FILTRES ═══ */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl bg-surface border border-rule p-2.5 sm:p-3 shadow-2xs">
        {/* Recherche instantanée */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint" />
          <input
            type="text"
            placeholder="Rechercher par nom de famille, responsable, élève ou classe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-rule bg-sunk/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/40 text-text placeholder:text-text-faint transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-faint hover:text-text rounded-full"
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Onglets de filtrage */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "ALL"
                ? "bg-text text-bg shadow-2xs"
                : "text-text-soft hover:bg-sunk hover:text-text"
            }`}
          >
            Toutes
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "ALL" ? "bg-bg text-text" : "bg-sunk text-text-faint"
            }`}>
              {summary.totalFamilies}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("OVERDUE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "OVERDUE"
                ? "bg-red-600 text-white shadow-2xs"
                : "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            En retard
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "OVERDUE" ? "bg-white text-red-700" : "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200"
            }`}>
              {summary.overdueCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("PARTIAL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "PARTIAL"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            }`}
          >
            <Clock className="h-3 w-3" />
            Partielles
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "PARTIAL" ? "bg-white text-amber-700" : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
            }`}>
              {summary.partialCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("UP_TO_DATE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "UP_TO_DATE"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            À jour
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "UP_TO_DATE" ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
            }`}>
              {summary.upToDateCount}
            </span>
          </button>
        </div>
      </div>

      {/* ═══ MOBILE : UNE CARTE PAR FAMILLE (25 sept. 2026) ═══
          Sous 768 px, le tableau à 7 colonnes débordait : le reliquat et le
          bouton « Encaisser » — les deux informations utiles — sortaient de
          l'écran. Sur téléphone, chaque famille devient une carte : nom et
          statut, enfants, reliquat en évidence, puis l'action pleine largeur.
          Mêmes données, même `handleOpenCollect` : aucune règle métier ajoutée. */}
      <div className="space-y-2.5 md:hidden">
        {filteredFamilies.length === 0 ? (
          <div className="rounded-xl border border-rule bg-surface py-10 text-center text-text-soft">
            <Users className="mx-auto mb-2 h-8 w-8 text-text-faint opacity-60" />
            <p className="text-sm font-medium">Aucune famille trouvée</p>
            <p className="mt-0.5 text-xs text-text-faint">
              {searchTerm ? "Modifiez votre recherche pour voir d'autres résultats." : "Aucune famille ne correspond à ce filtre."}
            </p>
          </div>
        ) : (
          filteredFamilies.map((fam) => {
            const hasReliquat = fam.reliquat > 0;
            return (
              <div key={fam.id} className="rounded-xl border border-rule bg-surface p-3.5 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text">{fam.familyName}</p>
                    <p className="mt-0.5 truncate text-xs text-text-soft">
                      {fam.guardianName}
                      {fam.guardianPhone && <span className="font-mono text-[11px] text-text-faint"> · {fam.guardianPhone}</span>}
                    </p>
                  </div>
                  {fam.status === "UP_TO_DATE" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> À jour
                    </span>
                  )}
                  {fam.status === "PARTIAL" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <Clock className="h-3 w-3" /> Partiel
                    </span>
                  )}
                  {fam.status === "OVERDUE" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      <AlertTriangle className="h-3 w-3" /> En retard
                    </span>
                  )}
                </div>

                {fam.children.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {fam.children.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-rule bg-sunk px-2 py-0.5 text-xs font-medium text-text">
                        <GraduationCap className="h-3 w-3 text-text-faint" />
                        {c.firstName}
                        {c.className && <span className="text-[11px] font-bold text-primary">({c.className})</span>}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-rule pt-3 text-center">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">Dû</p>
                    <p className="mt-0.5 text-xs font-medium tabular-nums text-text-soft">{formatXOF(fam.totalDue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">Versé</p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatXOF(fam.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">Reliquat</p>
                    <p className={`mt-0.5 text-xs font-extrabold tabular-nums ${hasReliquat ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                      {hasReliquat ? formatXOF(fam.reliquat) : "Soldé"}
                    </p>
                  </div>
                </div>

                {canCollect && (
                  <Button
                    size="sm"
                    variant={hasReliquat ? undefined : "secondary"}
                    className={`mt-3 h-11 w-full justify-center gap-1.5 text-xs font-bold ${
                      hasReliquat ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-rule text-text-soft"
                    }`}
                    onClick={() => handleOpenCollect(fam)}
                  >
                    {hasReliquat ? (<><Banknote className="h-4 w-4" /> ENCAISSER</>) : "Historique"}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ═══ TABLEAU DES FAMILLES : 1 LIGNE PAR FAMILLE (768 px et plus) ═══ */}
      <div className="hidden rounded-xl border border-rule bg-surface shadow-2xs overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-rule bg-sunk/60 text-[11px] font-bold uppercase tracking-wider text-text-faint">
                <th className="py-3 px-4">Famille & Contact</th>
                <th className="py-3 px-4">Enfants & Classes</th>
                <th className="py-3 px-4 text-right">Total Dû</th>
                <th className="py-3 px-4 text-right">Versé</th>
                <th className="py-3 px-4 text-right">Reliquat</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right min-w-[130px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule text-xs sm:text-sm">
              {filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-soft">
                    <Users className="h-8 w-8 mx-auto mb-2 text-text-faint opacity-60" />
                    <p className="font-medium text-sm">Aucune famille trouvée</p>
                    <p className="text-xs text-text-faint mt-0.5">
                      {searchTerm ? "Modifiez votre recherche pour voir d'autres résultats." : "Aucune famille ne correspond à ce filtre."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((fam) => {
                  const hasReliquat = fam.reliquat > 0;
                  return (
                    <tr
                      key={fam.id}
                      className="hover:bg-sunk/30 transition-colors group"
                    >
                      {/* 1. Famille & Contact */}
                      <td className="py-3 px-4 align-middle">
                        <div className="font-bold text-text text-sm">
                          {fam.familyName}
                        </div>
                        <div className="text-xs text-text-soft flex items-center gap-1.5 mt-0.5">
                          <span>{fam.guardianName}</span>
                          {fam.guardianPhone && (
                            <span className="inline-flex items-center gap-0.5 text-text-faint font-mono text-[11px]">
                              · <Phone className="h-2.5 w-2.5" />
                              {fam.guardianPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Enfants & Classes sur la même ligne */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {fam.children.length === 0 ? (
                            <span className="text-text-faint text-xs italic">Aucun élève rattaché</span>
                          ) : (
                            fam.children.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sunk text-text border border-rule"
                              >
                                <GraduationCap className="h-3 w-3 text-text-faint" />
                                <span>{c.firstName}</span>
                                {c.className && (
                                  <span className="font-bold text-primary text-[11px]">
                                    ({c.className})
                                  </span>
                                )}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* 3. Total Dû */}
                      <td className="py-3 px-4 text-right align-middle tabular-nums font-medium text-text-soft">
                        {formatXOF(fam.totalDue)}
                      </td>

                      {/* 4. Versé */}
                      <td className="py-3 px-4 text-right align-middle tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatXOF(fam.totalPaid)}
                      </td>

                      {/* 5. RELIQUAT (En évidence !) */}
                      <td className="py-3 px-4 text-right align-middle">
                        {hasReliquat ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs sm:text-sm font-extrabold tabular-nums bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 shadow-2xs">
                            {formatXOF(fam.reliquat)}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                            Soldé (0 F)
                          </span>
                        )}
                      </td>

                      {/* 6. Statut */}
                      <td className="py-3 px-4 text-center align-middle">
                        {fam.status === "UP_TO_DATE" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> À jour
                          </span>
                        )}
                        {fam.status === "PARTIAL" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            <Clock className="h-3 w-3" /> Partiel
                          </span>
                        )}
                        {fam.status === "OVERDUE" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                            <AlertTriangle className="h-3 w-3" /> En retard
                          </span>
                        )}
                      </td>

                      {/* 7. Bouton ENCAISSER toujours à la même place */}
                      <td className="py-3 px-4 text-right align-middle">
                        {canCollect ? (
                          hasReliquat ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 shadow-2xs gap-1.5 w-full justify-center"
                              onClick={() => handleOpenCollect(fam)}
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              ENCAISSER
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-8 px-3 text-text-soft hover:text-text border border-rule w-full justify-center"
                              onClick={() => handleOpenCollect(fam)}
                            >
                              Historique
                            </Button>
                          )
                        ) : (
                          <span className="text-text-faint text-xs">Consultation</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ MODAL D'ENCAISSEMENT RAPIDE FAMILLE (< 10 SECONDES) ═══ */}
      {selectedFamily && (
        <Modal
          open={Boolean(selectedFamily)}
          onClose={handleCloseModal}
          title={
            lastPaymentResult ? (
              <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" /> Règlement validé
              </span>
            ) : (
              <span className="flex items-center gap-2 text-text">
                <Banknote className="h-5 w-5 text-emerald-600" />
                Encaisser · {selectedFamily.familyName}
              </span>
            )
          }
          description={
            lastPaymentResult
              ? `Reçu officiel généré : ${lastPaymentResult.receiptNumber || ""}`
              : `Responsable : ${selectedFamily.guardianName} ${selectedFamily.guardianPhone ? `(${selectedFamily.guardianPhone})` : ""}`
          }
          size="md"
        >
          {lastPaymentResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  N° de Reçu officiel
                </p>
                <p className="mt-1 font-mono text-2xl font-black text-emerald-900 dark:text-emerald-100">
                  {lastPaymentResult.receiptNumber || "Généré"}
                </p>
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                  Montant encaissé : <strong>{formatXOF(lastPaymentResult.amount)}</strong>. Le reliquat familial a été actualisé.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleCloseModal}
                >
                  Fermer
                </Button>
                <Button
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1.5"
                  onClick={() => {
                    router.push(`/dashboard/payments/receipt?paymentId=${lastPaymentResult.paymentId}`);
                    handleCloseModal();
                  }}
                >
                  <Receipt className="h-4 w-4" />
                  Imprimer le reçu (Demi-A4)
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitCollect} className="space-y-4">
              {/* Situation des enfants */}
              <div className="rounded-lg bg-sunk/60 border border-rule p-2.5">
                <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wider">
                  Enfants rattachés
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedFamily.children.map((c) => (
                    <span key={c.id} className="text-xs font-medium bg-surface px-2 py-0.5 rounded border border-rule text-text">
                      {c.firstName} {c.lastName} {c.className ? `· ${c.className}` : ""}
                    </span>
                  ))}
                </div>
              </div>

              {selectedFamily.unpaidInvoices.length === 0 ? (
                <div className="py-6 text-center text-text-soft">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600 mb-2" />
                  <p className="font-bold text-sm text-text">Toutes les factures de cette famille sont soldées !</p>
                  <p className="text-xs text-text-faint mt-1">Aucun reliquat restant dû pour le moment.</p>
                  <div className="pt-4">
                    <Button variant="secondary" onClick={handleCloseModal}>Fermer</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Sélection de la facture à régler */}
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Facture concernée
                    </label>
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => handleInvoiceChange(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-rule bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    >
                      {selectedFamily.unpaidInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber || inv.title} — {inv.title} (Reliquat : {formatXOF(inv.reliquat)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Montant à encaisser */}
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Montant à encaisser (FCFA)
                    </label>
                    <Input
                      type="number"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder="Ex: 50000"
                      required
                      min={1}
                      autoFocus
                      className="text-base font-bold tabular-nums"
                    />
                    <div className="flex justify-between items-center mt-1 text-[11px] text-text-faint">
                      <span>Saisie libre pour versement partiel</span>
                      {selectedInvoiceId && (
                        <button
                          type="button"
                          onClick={() => {
                            const inv = selectedFamily.unpaidInvoices.find((i) => i.id === selectedInvoiceId);
                            if (inv) setCollectAmount(String(inv.reliquat));
                          }}
                          className="text-primary hover:underline font-semibold"
                        >
                          Solder la facture
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mode de règlement */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "CASH", label: "Espèces" },
                      { key: "MOBILE_MONEY", label: "Wave / OM" },
                      { key: "CHECK", label: "Chèque" },
                      { key: "BANK_TRANSFER", label: "Virement" },
                    ].map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setCollectMethod(m.key as never)}
                        className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                          collectMethod === m.key
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 shadow-2xs font-bold"
                            : "border-rule bg-surface text-text hover:bg-sunk"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Référence optionnelle */}
                  {collectMethod !== "CASH" && (
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">
                        Référence / N° de transaction
                      </label>
                      <Input
                        value={collectReference}
                        onChange={(e) => setCollectReference(e.target.value)}
                        placeholder="Ex: N° Chèque, Réf Wave / Orange Money"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={handleCloseModal}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9"
                    >
                      {isPending ? "Validation..." : "Valider l'encaissement"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
