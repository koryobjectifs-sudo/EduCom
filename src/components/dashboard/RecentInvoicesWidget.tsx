"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type Invoice = {
  id: string;
  title: string;
  status: string;
  totalAmount: number;
  student?: {
    firstName: string;
    lastName: string;
  } | null;
};

export default function RecentInvoicesWidget({ 
  invoices 
}: { 
  invoices: Invoice[] 
}) {
  const [activeTab, setActiveTab] = useState<"Récentes" | "En attente" | "Payées">("Récentes");

  const filteredInvoices = invoices.filter(invoice => {
    if (activeTab === "Récentes") return true;
    if (activeTab === "En attente") return invoice.status === "PENDING" || invoice.status === "OVERDUE";
    if (activeTab === "Payées") return invoice.status === "PAID";
    return true;
  }).slice(0, 4); // Keep layout consistent by limiting to 4

  return (
    <div className="group relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Decorative corner */}
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-indigo-50 opacity-70 pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out z-0"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <h3 className="text-lg font-semibold text-text-primary">Dernières Factures</h3>
          <Link href="/payments/new" className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors">
            <span className="text-xl leading-none -mt-1">+</span>
          </Link>
        </div>
        
        <div className="flex gap-6 text-sm font-semibold mb-6">
          <button 
            onClick={() => setActiveTab("Récentes")}
            className={`pb-1 transition-colors ${activeTab === "Récentes" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            Récentes
          </button>
          <button 
            onClick={() => setActiveTab("En attente")}
            className={`pb-1 transition-colors ${activeTab === "En attente" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            En attente
          </button>
          <button 
            onClick={() => setActiveTab("Payées")}
            className={`pb-1 transition-colors ${activeTab === "Payées" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            Payées
          </button>
        </div>
        
        <div className="space-y-6">
          {filteredInvoices.length === 0 ? (
            <EmptyState 
              icon={CheckCircle2} 
              title="Tout est à jour !" 
              description="Aucune facture ne correspond à ce filtre actuellement." 
            />
          ) : (
            filteredInvoices.map((invoice, index) => {
              // Determine colors and progress based on status
              let bgColor = "bg-[#ffb020]";
              let textColor = "text-white";
              let progressColor = "bg-[#ffb020]";
              let progressWidth = "50%";
              let progressText = "En attente";
              
              if (invoice.status === "PAID") {
                bgColor = "bg-[#2dd4bf]";
                progressColor = "bg-[#2dd4bf]";
                progressWidth = "100%";
                progressText = "Payé";
              } else if (invoice.status === "OVERDUE") {
                bgColor = "bg-[#ff5c35]";
                progressColor = "bg-[#ff5c35]";
                progressWidth = "25%";
                progressText = "En retard";
              }
  
              // Varied avatar color based on index
              // ⚠️ Teintes rendues LOCALEMENT. Elles servaient auparavant à
              // paramétrer une image distante ; ce sont désormais des classes.
              const avatarColors = [
                "bg-danger/10 text-danger",
                "bg-accent/10 text-accent",
                "bg-warning/10 text-warning",
                "bg-success/10 text-success",
              ];
              const aColor = avatarColors[index % avatarColors.length];
  
              return (
                <div key={invoice.id} className="flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-8 w-8 rounded-xl ${bgColor} ${textColor} flex items-center justify-center text-xs font-semibold shadow-sm flex-shrink-0 transition-colors`}>
                      {invoice.title.substring(0, 1)}
                    </div>
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {invoice.title}
                    </span>
                  </div>
                  <div className="w-48 hidden sm:flex items-center gap-3">
                    <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div className={`${progressColor} h-1.5 rounded-full transition-all duration-1000 ease-out`} style={{ width: progressWidth }}></div>
                    </div>
                    <span className="text-xs font-semibold text-text-muted w-16 text-right transition-colors">{progressText}</span>
                  </div>
                  <div className="flex -space-x-2 flex-shrink-0">
                    {/* ⚠️ Les initiales sont rendues ICI, pas récupérées chez un tiers.
                        Cette vignette appelait `ui-avatars.com` en lui passant le
                        NOM ET LE PRÉNOM D'UN ÉLÈVE dans l'URL — donc à chaque
                        affichage du tableau de bord, l'identité d'un enfant partait
                        chez un service extérieur, dans une requête journalisable.
                        `TopNav` avait déjà été corrigé de la même manière ; cette
                        vignette avait été oubliée, et c'est la plus sensible des
                        deux. Aucun appel réseau, et cela fonctionne hors ligne. */}
                    {invoice.student ? (
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold ${aColor}`}
                        title={`${invoice.student.firstName} ${invoice.student.lastName}`}
                      >
                        {`${invoice.student.firstName.charAt(0)}${invoice.student.lastName.charAt(0)}`.toUpperCase()}
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full border-2 border-white bg-sunk" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
