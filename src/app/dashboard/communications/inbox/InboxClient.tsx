"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, User, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";

/**
 * Historique des messages enregistrés — réécrit le 19 août 2026.
 *
 * ═══ CE QUE CET ÉCRAN AFFICHAIT ═══
 *
 * ⚠️ **Un simulateur de webhook livré dans le produit.** Un champ « Simuler une
 * réponse du parent (Webhook) » fabriquait une charge utile Meta complète
 * (`whatsapp_business_account`, `wamid.HBgLM…`, un numéro sénégalais en dur) et
 * la postait sur `/api/webhooks/whatsapp`. En cas de succès l'écran affichait
 * « 200 OK - Traité par l'API ! » en vert. C'était un banc d'essai, dans une
 * page que des secrétaires d'établissement pouvaient ouvrir.
 *
 * ⚠️ **Des accusés de lecture.** Chaque message sortant portait le double chevron
 * bleu de WhatsApp. Aucun accusé de réception n'existe dans ce produit : le
 * signe était purement décoratif, et c'est exactement le genre de détail qu'une
 * directrice lit comme une preuve que la famille a vu le message.
 *
 * ⚠️ **Le décor de WhatsApp.** Le fond de conversation était chargé depuis
 * `web.whatsapp.com`. Outre l'emprunt d'identité visuelle, cela envoyait une
 * requête vers Meta à chaque ouverture de la page.
 *
 * ⚠️ **« WhatsApp Automatisé · Premium CRM »**, et « Synchronisé avec la base
 * de données ». Aucune automatisation n'existe ; le webhook qui l'aurait rendue
 * possible a été supprimé le même jour parce qu'il acceptait des POST anonymes.
 *
 * ═══ CE QUI RESTE ═══
 *
 * La seule chose vraie : **la relecture des messages déjà enregistrés en base**,
 * cloisonnée à l'établissement. Rien ne s'écrit depuis cet écran, et l'encadré
 * du haut dit ce que valent réellement ces lignes.
 */

export type InboxMessage = {
  id: string;
  direction: string;
  content: string;
  status: string;
  createdAt: string;
};

export type InboxChat = {
  id: string;
  name: string;
  phone: string;
  messages: InboxMessage[];
  lastMessageText: string;
  time: string;
};

export default function InboxClient({
  chats,
  canalReel,
  raisonCanal,
}: {
  chats: InboxChat[];
  /** Un canal peut-il RÉELLEMENT émettre ? Résolu par `channels()`, côté serveur. */
  canalReel: boolean;
  /** Phrase à afficher telle quelle — l'écran n'invente pas l'explication. */
  raisonCanal: string;
}) {
  const [activeChatId, setActiveChatId] = useState<string | null>(chats[0]?.id ?? null);
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  const total = chats.reduce((n, c) => n + c.messages.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Communications", href: "/dashboard/communications" },
          { label: "Messages enregistrés" },
        ]}
        title="Messages enregistrés"
        description="Historique des messages présents en base pour votre établissement. Cet écran ne permet ni d'écrire ni d'envoyer."
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

      {/* ⚠️ L'encadré le plus important de la page : ce que valent ces lignes. */}
      <div className="flex gap-3 rounded-surface border border-warning/30 bg-warning/5 p-4">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="min-w-0 space-y-2">
          <p className="text-role-body font-semibold text-text-primary">
            Ces messages n&apos;ont jamais quitté EduCom.
          </p>
          <p className="text-role-meta leading-relaxed text-text-soft">
            {raisonCanal}
          </p>
          <p className="text-role-meta leading-relaxed text-text-soft">
            Les lignes ci-dessous ont été enregistrées avant que cette vérification n&apos;existe :
            leur statut est celui qui avait été écrit à l&apos;époque, et il ne prouve aucune remise.
            Aucun code n&apos;en crée de nouvelles.
          </p>
        </div>
      </div>

      {chats.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Aucun message enregistré"
          description="Aucun message n'a été enregistré pour votre établissement. Pour transmettre un document à une famille, passez par le centre de documents : EduCom prépare le texte et le lien, que vous envoyez depuis votre propre téléphone."
          action={{ label: "Ouvrir le centre de documents", href: "/dashboard/documents/centre" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
          {/* Liste des familles */}
          <div className="overflow-hidden rounded-surface border border-rule bg-surface">
            <p className="border-b border-rule px-4 py-3 text-role-meta font-semibold uppercase tracking-wider text-text-faint">
              {chats.length} famille{chats.length > 1 ? "s" : ""} · {total} message{total > 1 ? "s" : ""}
            </p>
            <ul className="max-h-[28rem] overflow-y-auto">
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
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-sunk">
                        <User aria-hidden="true" className="h-4 w-4 text-text-faint" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-role-label font-semibold text-text-primary">
                            {chat.name}
                          </span>
                          <span className="shrink-0 text-role-meta text-text-faint">{chat.time}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-role-meta text-text-soft">
                          {chat.lastMessageText}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Conversation */}
          <div className="rounded-surface border border-rule bg-surface">
            {activeChat ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-role-label font-semibold text-text-primary">
                      {activeChat.name}
                    </p>
                    <p className="text-role-meta text-text-soft">{activeChat.phone}</p>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {activeChat.messages.map((msg) => {
                    const sortant = msg.direction === "OUTBOUND";
                    return (
                      <div key={msg.id} className={`flex ${sortant ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-md rounded-control border border-rule bg-ground p-3">
                          <p className="whitespace-pre-wrap text-role-body text-text">{msg.content}</p>
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <span className="text-role-meta text-text-faint">
                              {new Date(msg.createdAt).toLocaleString("fr-FR", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            {/* ⚠️ Le statut brut enregistré, via le vocabulaire commun —
                                jamais un double chevron bleu, qui se lit « la famille
                                a lu ». Aucun accusé de lecture n'existe. */}
                            {sortant && <StatusBadge domain="message" status={msg.status} size="sm" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="p-8">
                <p className="text-role-body text-text-soft">Sélectionnez une famille.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚠️ Aucun champ de saisie : rien ne peut partir d'ici. Le seul chemin
          honnête vers une famille est la préparation du lot 17. */}
      {!canalReel && (
        <p className="text-role-meta leading-relaxed text-text-soft">
          Pour joindre une famille aujourd&apos;hui : ouvrez le{" "}
          <Link href="/dashboard/documents/centre" className="font-medium text-text underline underline-offset-2">
            centre de documents
          </Link>{" "}
          — EduCom prépare le message et un lien temporaire, que vous envoyez depuis votre propre téléphone.
        </p>
      )}
    </div>
  );
}
