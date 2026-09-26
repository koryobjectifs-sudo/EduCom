"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, User, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export type InboxMessage = {
  id: string;
  direction: string;
  content: string;
  status: string;
  createdAt: string;
};

export type InboxChat = {
  id: string;
  parentId: string;
  name: string;
  phone: string;
  studentNames: string;
  status: string;
  windowExpiresAt: string | null;
  messages: InboxMessage[];
  lastMessageText: string;
  time: string;
  detectedIntent?: string | null;
  attentionLevel?: string | null;
  pendingActionType?: string | null;
  pendingActionData?: Record<string, unknown> | null;
};

import { approvePendingAction, rejectPendingAction, sendManualReply } from "./actions";

export default function InboxClient({ chats }: { chats: InboxChat[] }) {
  const [activeChatId, setActiveChatId] = useState<string | null>(chats[0]?.id ?? null);
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const [isProcessing, setIsProcessing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleApprove = async (chatId: string) => {
    setIsProcessing(true);
    try {
      await approvePendingAction(chatId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (chatId: string) => {
    setIsProcessing(true);
    try {
      await rejectPendingAction(chatId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const total = chats.reduce((n, c) => n + c.messages.length, 0);

  const getStatusBadge = (status: string) => {
    if (status === "REQUIRES_ATTENTION") return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">À traiter</span>;
    if (status === "WAITING") return <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">En attente</span>;
    if (status === "RESOLVED") return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Résolu</span>;
    return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">Ouvert</span>;
  };

  const isWindowActive = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() > Date.now();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Communications", href: "/dashboard/communications" },
          { label: "Boîte de réception" },
        ]}
        title="Boîte de réception WhatsApp"
        description="Gérez les conversations WhatsApp officielles avec les familles."
        actions={
          <Link
            href="/dashboard/communications"
            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-rule px-3 text-role-label font-medium text-text-soft transition-colors hover:bg-sunk"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Retour
          </Link>
        }
      />


      {chats.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Aucune conversation"
          description="Les parents n'ont pas encore contacté l'école via WhatsApp."
          action={{ label: "Retour au centre", href: "/dashboard/communications" }}
        />
      ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-4 h-[calc(100vh-200px)] min-h-[500px]">
          {/* Liste des conversations */}
          <div className={`flex flex-col overflow-hidden rounded-surface border border-rule bg-surface h-full ${activeChatId ? 'hidden lg:flex' : 'flex'}`}>
            <p className="border-b border-rule px-4 py-3 text-role-meta font-semibold uppercase tracking-wider text-text-faint shrink-0">
              {chats.length} conversation{chats.length > 1 ? "s" : ""}
            </p>
            <ul className="flex-1 overflow-y-auto">
              {chats.map((chat) => {
                const actif = chat.id === activeChatId;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => setActiveChatId(chat.id)}
                      aria-current={actif ? "true" : undefined}
                      className={`flex w-full gap-3 border-b border-rule p-4 text-left transition-colors ${
                        actif ? "bg-sunk" : "hover:bg-sunk/60"
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-sunk">
                        <User aria-hidden="true" className="h-5 w-5 text-text-faint" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-role-label font-semibold text-text-primary">
                            {chat.name}
                          </span>
                          <span className="shrink-0 text-role-meta text-text-faint">{chat.time}</span>
                        </span>
                        <span className="text-xs text-text-soft truncate block mb-1">
                          Enfant(s) : {chat.studentNames || "Non identifié"}
                        </span>
                        <span className="flex items-center gap-2 mt-0.5">
                          {getStatusBadge(chat.status)}
                          <span className="block truncate text-role-meta text-text-soft flex-1">
                            {chat.lastMessageText}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Fil de discussion */}
          <div className={`flex flex-col overflow-hidden rounded-surface border border-rule bg-surface h-full ${!activeChatId ? 'hidden lg:flex' : 'flex'}`}>
            {activeChat ? (
              <>
                <div className="border-b border-rule px-4 sm:px-6 py-4 flex justify-between items-center bg-sunk/30 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button 
                      onClick={() => setActiveChatId(null)} 
                      className="lg:hidden p-2 -ml-2 text-text-soft hover:text-text-primary transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className="text-role-body font-semibold text-text-primary">
                        {activeChat.name}
                      </h3>
                      <p className="text-role-meta text-text-soft">
                        {activeChat.phone} · Enfant(s) : {activeChat.studentNames || "Inconnu"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(activeChat.status)}
                    {isWindowActive(activeChat.windowExpiresAt) ? (
                      <span className="text-[10px] uppercase font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        Fenêtre 24h active
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        Hors fenêtre
                      </span>
                    )}
                  </div>
                </div>

                {/* Bloc d'action en attente (Secrétariat) */}
                {activeChat.pendingActionType && (
                  <div className="mx-4 sm:mx-6 mt-4 mb-2 p-4 rounded-surface border border-orange-200 bg-orange-50 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <h4 className="text-role-body font-semibold text-orange-900">
                            Action requise : {activeChat.pendingActionType === "VALIDATE_ABSENCE" ? "Justification d&apos;absence" : activeChat.pendingActionType}
                          </h4>
                          <p className="text-sm text-orange-800 mt-1">
                            Le bot a détecté une demande d&apos;absence. <br/>
                            <strong>Motif :</strong> {activeChat.pendingActionData?.reason ? String(activeChat.pendingActionData.reason) : "Non précisé"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap sm:flex-nowrap gap-2">
                        <button
                          onClick={() => handleReject(activeChat.id)}
                          disabled={isProcessing}
                          className="flex-1 sm:flex-none justify-center px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-control disabled:opacity-50 transition-colors"
                        >
                          Refuser
                        </button>
                        <button
                          onClick={() => handleApprove(activeChat.id)}
                          disabled={isProcessing}
                          className="flex-1 sm:flex-none justify-center px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-control flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approuver
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50">
                  {/* Messages sont triés desc dans page.tsx, on doit les inverser pour l'affichage chronologique */}
                  {[...activeChat.messages].reverse().map((msg) => {
                    const isOutbound = msg.direction === "OUTBOUND";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isOutbound
                              ? "bg-primary text-white rounded-br-sm"
                              : "bg-white border border-rule text-text-primary rounded-bl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-role-body break-words">{msg.content}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-text-faint">
                          {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          {isOutbound && (
                            <span className="ml-1">
                              {msg.status === "SENT" ? "Envoyé" : msg.status === "DELIVERED" ? "Délivré" : msg.status === "READ" ? "Lu" : msg.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <form 
                  className="p-4 border-t border-rule bg-white shrink-0"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!replyText.trim() || isSending) return;
                    setIsSending(true);
                    try {
                      await sendManualReply(activeChat.id, replyText);
                      setReplyText("");
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsSending(false);
                    }
                  }}
                >
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Tapez votre message..." 
                      className="flex-1 rounded-control border border-rule px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      disabled={isSending}
                    />
                    <button 
                      type="submit" 
                      disabled={!replyText.trim() || isSending} 
                      className="bg-primary text-white p-2 rounded-control disabled:opacity-50 transition-opacity"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-text-faint p-6 text-center">
                <p>Sélectionnez une conversation pour afficher l'historique.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
