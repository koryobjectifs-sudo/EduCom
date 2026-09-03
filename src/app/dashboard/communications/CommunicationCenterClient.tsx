"use client";

import Link from "next/link";
import { CAMPAIGN_DISPATCH_AVAILABLE, campaignStateLabel } from "@/lib/campaignDispatch";
import { 
  MessageCircle, BarChart3, AlertCircle, FileText, Send, CheckCircle2, CheckSquare, ListTodo, Plus, ChevronRight 
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Role } from "@/generated/prisma/client";
import { WhatsAppConnectionWidget, WhatsAppSchoolInfo } from "@/components/dashboard/WhatsAppConnectionWidget";

type ConversationPreview = {
  id: string;
  status: string;
  lastActivityAt: Date;
  parent: { firstName: string; lastName: string; phone: string | null };
  messages: { content: string; status: string; direction: string; createdAt: Date }[];
};

type SurveyPreview = {
  id: string;
  title: string;
  _count: { responses: number };
};

type CampaignPreview = {
  id: string;
  name: string;
  type: string;
  status: string;
  sentCount: number;
  createdAt: Date;
};

export default function CommunicationCenterClient({
  stats,
  conversations,
  surveys,
  campaigns,
  totalParents,
  role,
  school
}: {
  stats: { SENT: number; DELIVERED: number; READ: number; RECEIVED: number; FAILED: number };
  conversations: ConversationPreview[];
  surveys: SurveyPreview[];
  campaigns: CampaignPreview[];
  totalParents: number;
  role: Role;
  school: WhatsAppSchoolInfo;
}) {
  const canSendExternal = role !== "TEACHER";
  const isAccountant = role === "ACCOUNTANT";

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Communications" }]}
        title="Communication Center"
        description="Centre de pilotage de la communication avec les parents."
        actions={<WhatsAppConnectionWidget school={school} />}
      />

      {/* 4. STATISTIQUES / ACTIVITÉ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold text-primary">{stats.SENT + stats.DELIVERED + stats.READ}</div>
          <div className="text-sm text-dim mt-1">Envoyés</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.DELIVERED + stats.READ}</div>
          <div className="text-sm text-dim mt-1">Délivrés</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold text-green-600">{stats.READ}</div>
          <div className="text-sm text-dim mt-1">Lus</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.RECEIVED}</div>
          <div className="text-sm text-dim mt-1">Réponses</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : WHATSAPP FOCUS */}
        <div className="lg:col-span-1 space-y-6">

          {/* MAIN CTA : WHATSAPP SEND */}
          {canSendExternal && (
            <Card className="p-8 bg-green-50 border-green-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366] opacity-10 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
              
              <div className="flex flex-col items-center justify-center text-center relative z-10">
                <div className="h-16 w-16 bg-[#25D366] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-200 text-white">
                  <Send className="h-8 w-8 ml-1" />
                </div>
                <h2 className="text-xl font-bold text-green-950 mb-2">Envoyer un WhatsApp</h2>
                <p className="text-sm text-green-800 mb-6 px-2">
                  Contactez instantanément un parent ou un groupe de parents directement sur leur téléphone.
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <Link href="/dashboard/communications/inbox" className="bg-[#25D366] hover:bg-[#1DA851] text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all hover:shadow-lg w-full flex items-center justify-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Ouvrir la messagerie
                  </Link>
                  <Link href="/dashboard/communications/campaigns/new" className="bg-white hover:bg-green-100 text-green-700 border border-green-200 px-6 py-3 rounded-xl font-medium transition-colors w-full flex items-center justify-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Créer une campagne
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* COLONNE DROITE : CONVERSATIONS & CAMPAGNES */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. CONVERSATIONS */}
          <Card className="p-0 overflow-hidden border-2 border-primary/20 shadow-md">
            <div className="p-5 border-b border-rule flex justify-between items-center bg-surface">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" /> 
                Boîte de réception (WhatsApp)
              </h2>
              <Link href="/dashboard/communications/inbox" className="text-sm font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg">
                Voir tout
              </Link>
            </div>
            
            <div className="divide-y divide-rule bg-white">
              {conversations.length > 0 ? (
                conversations.map(conv => (
                  <Link key={conv.id} href={`/dashboard/communications/inbox?id=${conv.id}`} className="block p-4 hover:bg-primary/5 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-text flex items-center gap-2">
                        {conv.parent.firstName} {conv.parent.lastName}
                        {conv.status === "REQUIRES_ATTENTION" && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">À traiter</span>
                        )}
                      </div>
                      <div className="text-xs text-dim font-medium">
                        {new Date(conv.lastActivityAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {conv.messages.length > 0 ? (
                      <div className="text-sm text-text-secondary line-clamp-1">
                        {conv.messages[0].direction === "INBOUND" ? (
                          <span className="font-medium text-blue-600">Reçu : </span>
                        ) : (
                          <span className="font-medium text-green-600">Vous : </span>
                        )}
                        {conv.messages[0].content}
                      </div>
                    ) : (
                      <div className="text-sm italic text-dim">Nouvelle conversation</div>
                    )}
                  </Link>
                ))
              ) : (
                <EmptyState 
                  icon={MessageCircle} 
                  title="Aucune conversation" 
                  description="Les parents n'ont pas encore contacté l'école via WhatsApp."
                />
              )}
            </div>
          </Card>

          {/* 2. CAMPAGNES */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-rule flex justify-between items-center bg-surface">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <Send className="h-5 w-5 text-dim" /> Campagnes récentes
              </h2>
            </div>
            
            <div className="divide-y divide-rule">
              {campaigns.length > 0 ? (
                campaigns.map(camp => (
                  <div key={camp.id} className="flex justify-between items-center p-4 hover:bg-sunk transition-colors">
                    <div>
                      <div className="font-medium text-text">{camp.name}</div>
                      <div className="text-sm text-dim">
                        {camp.type === "AUTOMATED_WORKFLOW" ? "Automatisée" : "Manuelle"} • {new Date(camp.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    {/* ⚠️ Le statut brut de la base ne s'affiche PLUS tel quel :
                        « SCHEDULED » et « PROCESSING » annoncent un envoi qui
                        n'existe pas. Le libellé passe par l'autorité unique, qui
                        couvre aussi les campagnes créées avant ce correctif. */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-text">
                        {campaignStateLabel(camp.status).label}
                      </div>
                      <div className="text-xs text-dim max-w-[15rem]">
                        {CAMPAIGN_DISPATCH_AVAILABLE
                          ? `${camp.sentCount} envoyés`
                          : campaignStateLabel(camp.status).hint}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState 
                  icon={Send} 
                  title="Aucune campagne" 
                  description="Créez votre première campagne pour communiquer avec les parents."
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* AUTRES ACTIONS (Reléguées en bas) */}
      {!isAccountant && (
        <div className="mt-12 pt-8 border-t border-rule">
          <h2 className="text-lg font-semibold text-text mb-6">Autres outils de communication</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Sondages */}
            <Card className="p-5">
              <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-dim" /> Sondages
              </h3>
              <div className="space-y-4">
                <Link href="/dashboard/communications/surveys/new" className="flex items-center justify-center w-full p-2 rounded-lg bg-surface hover:bg-sunk border border-rule transition-colors text-sm font-medium text-text">
                  <Plus className="h-4 w-4 mr-1" /> Créer un sondage
                </Link>
                
                {surveys.length > 0 ? (
                  <div className="space-y-3 mt-4 pt-4 border-t border-rule">
                    <div className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Sondages actifs</div>
                    {surveys.map(s => (
                      <div key={s.id} className="flex justify-between items-center text-sm">
                        <span className="text-text truncate pr-2">{s.title}</span>
                        <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">{s._count.responses} rép.</span>
                      </div>
                    ))}
                    <Link href="/dashboard/communications/surveys" className="text-xs font-medium text-primary hover:underline block pt-2">
                      Voir tous les sondages &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-dim border-t border-rule mt-4">
                    Aucun sondage actif.
                  </div>
                )}
              </div>
            </Card>

            {/* Formulaires */}
            <Card className="p-5">
              <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-dim" /> Formulaires
              </h3>
              <div className="space-y-4">
                <Link href="/dashboard/communications/forms/new" className="flex items-center justify-center w-full p-2 rounded-lg bg-surface hover:bg-sunk border border-rule transition-colors text-sm font-medium text-text">
                  <Plus className="h-4 w-4 mr-1" /> Créer un formulaire
                </Link>
                <div className="text-center py-6 text-xs text-dim">
                  Gérez les inscriptions et les collectes d'informations.
                </div>
              </div>
            </Card>

          </div>
        </div>
      )}
    </div>
  );
}
