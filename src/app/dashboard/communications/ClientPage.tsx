"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { MessageCircle, Search, CheckSquare, Square, Filter, Users, Send, Check, Copy, History, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendBulkWhatsAppMessages } from "./actions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type Parent = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  studentNames: string;
  classIds: string[];
  hasOverdueInvoices: boolean;
  totalOverdue: number;
};

export default function CommunicationsClient({
  classes,
  parents,
  schoolName
}: {
  classes: any[];
  parents: Parent[];
  schoolName: string;
}) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL"); // ALL, OVERDUE, UP_TO_DATE

  // Message state
  // Le nom de l'école vient du serveur : un nom en dur dans ce gabarit part
  // réellement aux familles, signé d'un établissement qui n'est pas le leur.
  const [message, setMessage] = useState(
    `Bonjour [Nom_Parent],\n\nCeci est un message de la direction de ${schoolName} concernant [Nom_Enfant].\n\nCordialement,\nLa Direction`
  );
  const [selectedParentIds, setSelectedParentIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sendSuccess, setSendSuccess] = useState(false);
  /**
   * ⚠️ Lot 17 — ce que le module a réellement pu faire de la campagne.
   * Aucun canal n'envoie aujourd'hui : le bouton ne doit donc jamais afficher
   * « Campagne envoyée » — c'est précisément ce qu'il faisait, pour six
   * campagnes qui n'ont jamais quitté EduCom.
   */
  const [sendError, setSendError] = useState<string | null>(null);

  // Filtered list
  const filteredParents = useMemo(() => {
    return parents.filter(parent => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(query);
        const matchesStudent = parent.studentNames.toLowerCase().includes(query);
        if (!matchesName && !matchesStudent) return false;
      }

      // 2. Class Filter
      if (selectedClassId !== "ALL") {
        if (!parent.classIds.includes(selectedClassId)) return false;
      }

      // 3. Payment Status Filter
      if (paymentStatus === "OVERDUE" && !parent.hasOverdueInvoices) return false;
      if (paymentStatus === "UP_TO_DATE" && parent.hasOverdueInvoices) return false;

      return true;
    });
  }, [parents, searchQuery, selectedClassId, paymentStatus]);

  // Auto-select when filters change
  useEffect(() => {
    setSelectedParentIds(new Set(filteredParents.map(p => p.id)));
  }, [filteredParents]);

  const toggleParentSelection = (id: string) => {
    const newSet = new Set(selectedParentIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedParentIds(newSet);
  };

  const selectAll = () => {
    setSelectedParentIds(new Set(filteredParents.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedParentIds(new Set());
  };

  const targetedParents = filteredParents.filter(p => selectedParentIds.has(p.id));

  // WhatsApp link generation
  const getReplacedMessage = (parent: Parent) => {
    return message
      .replace(/\[Nom_Parent\]/g, `${parent.firstName} ${parent.lastName}`)
      .replace(/\[Nom_Enfant\]/g, parent.studentNames)
      .replace(/\[Montant_Dû\]/g, `${parent.totalOverdue.toLocaleString()} FCFA`);
  };

  const copyAllNumbers = () => {
    const numbers = targetedParents.map(p => p.phone).join(", ");
    navigator.clipboard.writeText(numbers);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendCampaign = () => {
    if (targetedParents.length === 0) return;

    startTransition(async () => {
      // Ni `schoolId` ni `phone` ne transitent plus par le client : l'action
      // résout l'établissement depuis la session et relit les numéros en base
      // après vérification que chaque parent en fait bien partie.
      const messagesToLog = targetedParents.map(parent => ({
        parentId: parent.id,
        content: getReplacedMessage(parent)
      }));

      const res = await sendBulkWhatsAppMessages(messagesToLog);
      if (res.success) {
        setSendError(null);
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
        return;
      }
      // L'échec est dit, pas avalé. Un bouton qui ne réagit pas laisse croire
      // que le message est parti.
      setSendError(res.error ?? "L'envoi n'a pas abouti.");
      toast.error(res.error ?? "L'envoi n'a pas abouti.");
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[80vh] overflow-hidden">
      
      {/* PANE 1: Filters (Left) */}
      <Card
        flush
        className="w-full flex-shrink-0 lg:w-1/4"
        title={
          <span className="flex items-center gap-2">
            <Filter aria-hidden="true" className="h-4 w-4 text-text-faint" />
            Filtres de ciblage
          </span>
        }
      >
        <div className="space-y-5 overflow-y-auto p-5">
          <Input
            label="Rechercher"
            type="search"
            placeholder="Nom du parent ou de l'élève…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            label="Classe"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="ALL">Toutes les classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Statut Financier</label>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${paymentStatus === "ALL" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 hover:bg-secondary/30"}`}>
                <input type="radio" name="payment" value="ALL" checked={paymentStatus === "ALL"} onChange={() => setPaymentStatus("ALL")} className="h-4 w-4 text-primary focus:ring-primary/30" />
                <span className={`text-sm font-semibold ${paymentStatus === "ALL" ? "text-primary" : "text-text-secondary"}`}>Tous les parents</span>
              </label>
              <label className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${paymentStatus === "OVERDUE" ? "border-error bg-error/5 shadow-sm" : "border-border hover:border-error/30 hover:bg-error/5"}`}>
                <input type="radio" name="payment" value="OVERDUE" checked={paymentStatus === "OVERDUE"} onChange={() => setPaymentStatus("OVERDUE")} className="h-4 w-4 text-error focus:ring-error/30" />
                <span className={`text-sm font-semibold ${paymentStatus === "OVERDUE" ? "text-error" : "text-text-secondary"}`}>En retard de paiement</span>
              </label>
              <label className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${paymentStatus === "UP_TO_DATE" ? "border-[var(--color-success)] bg-success/10/30 shadow-sm" : "border-border hover:border-[var(--color-success)]/30 hover:bg-success/10/10"}`}>
                <input type="radio" name="payment" value="UP_TO_DATE" checked={paymentStatus === "UP_TO_DATE"} onChange={() => setPaymentStatus("UP_TO_DATE")} className="h-4 w-4 text-success focus:ring-success/30" />
                <span className={`text-sm font-semibold ${paymentStatus === "UP_TO_DATE" ? "text-success" : "text-text-secondary"}`}>À jour (Soldé)</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* PANE 2: Selection (Middle) */}
      <div className="w-full lg:w-1/3 flex flex-col rounded-surface border border-rule bg-surface shadow-card overflow-hidden flex-shrink-0">
        <div className="p-5 border-b border-white/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-control bg-sunk">
              <Users className="w-4 h-4 text-text-muted" />
            </div>
            <h2 className="text-role-card font-semibold text-text">Destinataires</h2>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{targetedParents.length} sélectionnés</span>
        </div>

        <div className="px-5 py-3 bg-secondary/20 border-b border-border/50 flex justify-between items-center">
          <button onClick={selectAll} className="text-xs font-semibold text-text-muted hover:text-primary transition-colors">Tout cocher</button>
          <div className="h-3 w-px bg-border"></div>
          <button onClick={deselectAll} className="text-xs font-semibold text-text-muted hover:text-text-primary transition-colors">Tout décocher</button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-transparent p-2">
          {filteredParents.length === 0 ? (
            <div className="p-3">
              <EmptyState
                icon={Search}
                title="Aucun parent ne correspond"
                description="Élargissez les filtres de ciblage pour retrouver des destinataires."
                size="sm"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredParents.map(parent => {
                const isSelected = selectedParentIds.has(parent.id);
                return (
                  <div 
                    key={parent.id} 
                    className={`p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center gap-4 ${isSelected ? "bg-primary/5" : "hover:bg-secondary/50"}`} 
                    onClick={() => toggleParentSelection(parent.id)}
                  >
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <div className="h-6 w-6 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-lg border-2 border-border flex items-center justify-center"></div>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold transition-colors ${isSelected ? "text-primary" : "text-text-primary"}`}>{parent.lastName} {parent.firstName}</p>
                      <p className="text-xs font-medium text-text-muted mt-0.5">{parent.studentNames}</p>
                      {parent.hasOverdueInvoices && (
                        <span className="mt-1.5 inline-block text-[10px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-md">
                          Retard: {parent.totalOverdue.toLocaleString()} FCFA
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PANE 3: Composer & Action (Right) */}
      <div className="w-full lg:w-5/12 flex flex-col rounded-surface border border-rule bg-surface shadow-card overflow-hidden flex-shrink-0">
        <div className="flex items-center gap-3 border-b border-rule px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-sunk">
            <MessageCircle className="w-4 h-4 text-text-muted" />
          </div>
          <h2 className="text-role-card font-semibold text-text">Message Whatsapp</h2>
        </div>
        
        <div className="p-5 flex-1 flex flex-col relative bg-transparent">
          {/* ⚠️ Ce fond était l'image de conversation de WhatsApp, chargée
              depuis `web.whatsapp.com`. Deux problèmes en un : chaque ouverture
              de la page émettait une requête vers Meta, et le décor faisait
              passer un composeur de texte pour une messagerie WhatsApp
              fonctionnelle — alors qu'aucun canal ne peut émettre. Retiré le
              19 août 2026 ; aucun hôte extérieur n'est plus appelé par le
              produit, et `scripts/verify-integrations.ts` en fait un invariant. */}
          
          <div className="relative flex-1 flex flex-col">
            <textarea
              id="campaign-message"
              aria-label="Message de la campagne"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 w-full resize-none rounded-control border border-rule bg-surface p-4 text-role-body leading-relaxed text-text shadow-card focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              placeholder="Écrivez votre message ici..."
            />
            
            <div className="mt-4 rounded-control border border-rule bg-ground p-4">
              <p className="text-xs font-semibold text-text-muted mb-2.5 uppercase tracking-wider">Variables magiques</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMessage(m => m + " [Nom_Parent]")} className="rounded-control border border-rule bg-surface px-2.5 py-1.5 text-role-meta font-medium text-text-soft transition-colors hover:bg-sunk hover:text-text">[Nom_Parent]</button>
                <button onClick={() => setMessage(m => m + " [Nom_Enfant]")} className="rounded-control border border-rule bg-surface px-2.5 py-1.5 text-role-meta font-medium text-text-soft transition-colors hover:bg-sunk hover:text-text">[Nom_Enfant]</button>
                <button onClick={() => setMessage(m => m + " [Montant_Dû]")} className="rounded-control border border-rule bg-surface px-2.5 py-1.5 text-role-meta font-medium text-text-soft transition-colors hover:bg-sunk hover:text-text">[Montant_Dû]</button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-rule bg-ground p-5">
          <Button
            variant="secondary"
            block
            onClick={copyAllNumbers}
            disabled={targetedParents.length === 0}
            icon={copied
              ? <Check aria-hidden="true" className="h-4 w-4 text-success" />
              : <Copy aria-hidden="true" className="h-4 w-4" />}
          >
            {copied ? "Numéros copiés" : `Copier les ${targetedParents.length} numéros`}
          </Button>
          
          <Button
            block
            size="lg"
            disabled={targetedParents.length === 0}
            loading={isPending}
            onClick={handleSendCampaign}
          >
            {/* `loading` de Button affiche déjà son propre indicateur : ne pas
                en superposer un second. */}
            {!isPending && (sendSuccess
              ? <Check aria-hidden="true" className="h-4 w-4" />
              : <Send aria-hidden="true" className="h-4 w-4" />)}
            {sendSuccess ? "Campagne envoyée" : `Envoyer la campagne (${targetedParents.length})`}
          </Button>

          {/* ⚠️ Affiché sous le bouton, et non seulement en toast : la raison
              doit rester lisible pendant qu'on copie les numéros. */}
          {sendError && (
            <p className="mt-2 rounded-control border border-warning/30 bg-warning/5 px-3 py-2 text-role-meta leading-relaxed text-text-soft">
              {sendError}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
