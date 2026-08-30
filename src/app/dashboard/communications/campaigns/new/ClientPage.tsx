"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Search, CheckSquare, Square, Filter, Users, Send, Check, Copy, History, ChevronRight, Loader2, Bot, Calendar, Settings } from "lucide-react";
import { toast } from "sonner";
import { createCommunicationCampaign } from "./actions";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export default function CommunicationsClient({
  classes,
  parents,
  templates,
  schoolName
}: {
  classes: any[];
  parents: any[];
  templates: any[];
  schoolName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [type, setType] = useState<"MANUAL_SCHEDULED" | "AUTOMATED_WORKFLOW">("MANUAL_SCHEDULED");
  const [trigger, setTrigger] = useState<"NONE" | "PAYMENT_DUE" | "PAYMENT_OVERDUE">("NONE");
  const [daysOffset, setDaysOffset] = useState("0");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedTemplateId) {
      toast.error("Veuillez renseigner le nom et choisir un modèle.");
      return;
    }

    startTransition(async () => {
      const res = await createCommunicationCampaign({
        name,
        type,
        trigger: type === "AUTOMATED_WORKFLOW" ? trigger : "NONE",
        triggerConfig: type === "AUTOMATED_WORKFLOW" ? { daysOffset: parseInt(daysOffset) || 0 } : null,
        templateId: selectedTemplateId,
        audienceConfig: { target: "ALL_PARENTS" } // Simplifié pour la V1
      });

      if (res.success) {
        toast.success("Campagne créée avec succès !");
        router.push("/dashboard/communications");
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Informations Générales</h2>
            
            <div className="space-y-4">
              <Input
                label="Nom de la campagne"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Rappel facturation Octobre"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div 
                  className={`border rounded-control p-4 cursor-pointer transition-colors ${type === "MANUAL_SCHEDULED" ? "border-primary bg-primary/5" : "border-rule hover:bg-sunk"}`}
                  onClick={() => { setType("MANUAL_SCHEDULED"); setTrigger("NONE"); }}
                >
                  <div className="flex items-center gap-2 font-medium text-text mb-1">
                    <Calendar className="w-5 h-5" /> Envoi ponctuel
                  </div>
                  <div className="text-sm text-dim">Envoi immédiat ou programmé à une date précise.</div>
                </div>
                
                <div 
                  className={`border rounded-control p-4 cursor-pointer transition-colors ${type === "AUTOMATED_WORKFLOW" ? "border-primary bg-primary/5" : "border-rule hover:bg-sunk"}`}
                  onClick={() => setType("AUTOMATED_WORKFLOW")}
                >
                  <div className="flex items-center gap-2 font-medium text-text mb-1">
                    <Bot className="w-5 h-5" /> Workflow Automatisé
                  </div>
                  <div className="text-sm text-dim">S'exécute automatiquement selon un événement.</div>
                </div>
              </div>
            </div>
          </Card>

          {type === "AUTOMATED_WORKFLOW" && (
            <Card className="p-6 border-l-4 border-l-blue-500">
              <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" /> Configuration du Déclencheur
              </h2>
              <div className="space-y-4">
                <Select
                  label="Événement déclencheur"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as any)}
                >
                  <option value="NONE">Sélectionnez un événement</option>
                  <option value="PAYMENT_DUE">Échéance de facture (Paiement attendu)</option>
                  <option value="PAYMENT_OVERDUE">Retard de paiement (Facture échue)</option>
                </Select>

                {trigger !== "NONE" && (
                  <Input
                    type="number"
                    label="Décalage (en jours)"
                    value={daysOffset}
                    onChange={(e) => setDaysOffset(e.target.value)}
                    hint="Ex: 0 pour le jour même, 3 pour 3 jours après l'échéance."
                  />
                )}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Message (Modèle WhatsApp)</h2>
            <div className="space-y-4">
              <Select
                label="Modèle approuvé par Meta"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                required
              >
                <option value="">Sélectionnez un modèle...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                ))}
              </Select>
              
              <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-control border border-yellow-200">
                Les modèles WhatsApp sont en lecture seule. Les variables seront automatiquement injectées par EduCom.
              </div>
            </div>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/communications")} className="w-full sm:w-auto justify-center">
              Annuler
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto justify-center">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {type === "MANUAL_SCHEDULED" ? "Créer et Planifier" : "Activer le Workflow"}
            </Button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-1">
        <Card className="p-6 bg-sunk/50 sticky top-6">
          <h3 className="font-semibold text-text mb-4">Aperçu et Règles</h3>
          <ul className="text-sm text-dim space-y-3">
            <li className="flex gap-2">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              Idempotence : Les workflows automatisés n'enverront jamais deux fois le même rappel pour une même facture.
            </li>
            <li className="flex gap-2">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              Opt-in : Seuls les parents ayant explicitement accepté les communications WhatsApp recevront les messages.
            </li>
            <li className="flex gap-2">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              Sécurité : Les liens d'action ({`{{actionUrl}}`}) expirent au bout de 7 jours et sont révocables.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
