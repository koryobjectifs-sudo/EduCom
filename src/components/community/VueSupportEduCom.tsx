"use client";

import { useEffect, useState, useTransition } from "react";
import {
  LifeBuoy,
  Plus,
  Send,
  Loader2,
  Bug,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { listerTicketsEcole, ajouterMessage } from "@/app/dashboard/aide/actions";
import ModalSupportJira from "@/components/support/ModalSupportJira";

export type VueSupportEduComProps = {
  role: string;
};

type Ticket = {
  id: string;
  subject: string;
  kind: string;
  status: string;
  page: string | null;
  lastMessageAt: string;
  createdAt: string;
  nonLu: boolean;
  messages: { id: string; authorId: string; fromEduCom: boolean; body: string; createdAt: string }[];
};

export default function VueSupportEduCom({ role }: VueSupportEduComProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketActifId, setTicketActifId] = useState<string | null>(null);
  const [reponse, setReponse] = useState("");
  const [chargement, setChargement] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [filtre, setFiltre] = useState<"TOUS" | "ACTIFS" | "RESOLU">("ACTIFS");
  const [enCoursEnvoi, demarrerEnvoi] = useTransition();

  const rafraichir = async () => {
    try {
      const data = await listerTicketsEcole();
      setTickets(data);
      if (!ticketActifId && data.length > 0) {
        setTicketActifId(data[0].id);
      }
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    void rafraichir();
    // Rafraîchissement automatique toutes les 15s pour le temps réel
    const interval = setInterval(() => {
      void rafraichir();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const ticketActif = tickets.find((t) => t.id === ticketActifId) ?? tickets[0] ?? null;

  const envoyerReponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketActif || !reponse.trim()) return;
    const texte = reponse.trim();
    setReponse("");

    demarrerEnvoi(async () => {
      await ajouterMessage(ticketActif.id, texte);
      await rafraichir();
    });
  };

  const ticketsFiltres = tickets.filter((t) => {
    if (filtre === "ACTIFS") return t.status !== "RESOLU";
    if (filtre === "RESOLU") return t.status === "RESOLU";
    return true;
  });

  const badgeType = (kind: string) => {
    if (kind === "PROBLEME") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
          <Bug className="h-3 w-3" />
          <span>Bug</span>
        </span>
      );
    }
    if (kind === "CHANGEMENT") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-700">
          <Sparkles className="h-3 w-3" />
          <span>Amélioration</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-primary-ink/10 px-2 py-0.5 text-[11px] font-bold text-primary-ink">
        <HelpCircle className="h-3 w-3" />
        <span>Question</span>
      </span>
    );
  };

  const badgeStatut = (status: string) => {
    if (status === "RESOLU") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          <span>Résolu</span>
        </span>
      );
    }
    if (status === "EN_COURS") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
          <Clock className="h-3 w-3" />
          <span>En cours</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700">
        <Clock className="h-3 w-3" />
        <span>Ouvert</span>
      </span>
    );
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-1 flex-col bg-surface">
      {/* En-tête du canal façon Slack */}
      <header className="flex shrink-0 items-center justify-between border-b border-rule px-4 py-3 sm:px-6 bg-surface">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-ink/10 text-primary-ink">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text">#support-educom</h2>
              <span className="rounded-full bg-primary-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-ink">
                Canal Officiel
              </span>
            </div>
            <p className="text-xs text-text-soft">
              Fils de discussion en direct avec l&apos;équipe support EduCom SaaS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOuvert(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-ink px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-primary-ink-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau ticket</span>
        </button>
      </header>

      {/* Contenu principal : liste des tickets + fil de discussion en direct */}
      <div className="flex min-h-0 flex-1 divide-x divide-rule overflow-hidden">
        {/* Colonne gauche : liste des tickets de l'école */}
        <div className="flex w-80 shrink-0 flex-col bg-sunk/20 overflow-hidden sm:w-96">
          {/* Filtres rapides */}
          <div className="flex items-center gap-1 border-b border-rule p-2.5 bg-surface/50">
            {[
              { id: "ACTIFS", label: "À traiter" },
              { id: "RESOLU", label: "Résolus" },
              { id: "TOUS", label: "Tous" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltre(f.id as typeof filtre)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  filtre === f.id ? "bg-surface text-primary-ink shadow-2xs" : "text-text-soft hover:text-text"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-semibold text-text-faint">
              {ticketsFiltres.length} ticket{ticketsFiltres.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Liste déroulante des tickets */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {chargement ? (
              <div className="flex items-center justify-center p-8 text-xs text-text-soft">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Chargement des tickets...</span>
              </div>
            ) : ticketsFiltres.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-soft">
                <p>Aucun ticket dans cette vue.</p>
                <button
                  type="button"
                  onClick={() => setModalOuvert(true)}
                  className="mt-3 inline-flex items-center gap-1 text-primary-ink font-bold hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Ouvrir une première demande</span>
                </button>
              </div>
            ) : (
              ticketsFiltres.map((t) => {
                const estActif = ticketActif?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTicketActifId(t.id)}
                    className={`block w-full rounded-2xl border p-3 text-left transition-all ${
                      estActif
                        ? "border-primary-ink bg-surface shadow-2xs ring-1 ring-primary-ink/20"
                        : "border-rule bg-surface/70 hover:bg-surface hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      {badgeType(t.kind)}
                      {badgeStatut(t.status)}
                    </div>
                    <p className={`line-clamp-2 text-xs leading-snug ${estActif ? "font-bold text-text" : "font-medium text-text"}`}>
                      {t.subject}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-text-faint">
                      <span>{t.messages.length} message{t.messages.length > 1 ? "s" : ""}</span>
                      <span>{new Date(t.lastMessageAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne droite : fil de discussion du ticket actif */}
        <div className="flex min-h-0 flex-1 flex-col bg-surface overflow-hidden">
          {ticketActif ? (
            <>
              {/* En-tête du ticket */}
              <div className="border-b border-rule px-5 py-3.5 bg-sunk/15 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {badgeType(ticketActif.kind)}
                    {badgeStatut(ticketActif.status)}
                    {ticketActif.page && (
                      <span className="font-mono text-[11px] text-text-soft bg-sunk px-2 py-0.5 rounded-md truncate max-w-xs">
                        {ticketActif.page}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-text leading-snug">{ticketActif.subject}</h3>
                </div>
              </div>

              {/* Messages du fil */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
                {ticketActif.messages.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className={`flex flex-col ${m.fromEduCom ? "items-start" : "items-end"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      {m.fromEduCom ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-primary-ink" />
                          <span className="text-[11.5px] font-bold text-primary-ink">Équipe EduCom</span>
                        </>
                      ) : (
                        <span className="text-[11.5px] font-semibold text-text-soft">Votre établissement</span>
                      )}
                      <span className="text-[10.5px] text-text-faint">
                        · {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-2xs whitespace-pre-wrap break-words ${
                        m.fromEduCom
                          ? "bg-primary-ink/5 border border-primary-ink/20 text-text rounded-tl-xs"
                          : "bg-surface border border-rule text-text rounded-tr-xs"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>

              {/* Composeur de réponse en direct */}
              <form onSubmit={envoyerReponse} className="border-t border-rule p-3 bg-surface">
                <div className="flex items-end gap-2 rounded-2xl border border-rule bg-surface p-2 shadow-2xs focus-within:border-primary-ink/50">
                  <textarea
                    rows={2}
                    value={reponse}
                    onChange={(e) => setReponse(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                        e.preventDefault();
                        envoyerReponse(e);
                      }
                    }}
                    placeholder="Écrire un message à l'équipe EduCom… (Entrée pour envoyer)"
                    className="block min-h-[38px] max-h-32 w-full resize-none border-0 bg-transparent p-1.5 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
                  />
                  <button
                    type="submit"
                    disabled={enCoursEnvoi || !reponse.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-ink text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/30 transition-colors shadow-2xs"
                  >
                    {enCoursEnvoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-text-soft">
              <LifeBuoy className="h-12 w-12 text-primary-ink/40 mb-3" />
              <h3 className="text-base font-bold text-text">Centre d&apos;assistance EduCom</h3>
              <p className="mt-1 text-xs text-text-soft max-w-sm">
                Sélectionnez un ticket à gauche ou créez une nouvelle demande pour échanger avec notre équipe technique.
              </p>
              <button
                type="button"
                onClick={() => setModalOuvert(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-ink px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-primary-ink-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau ticket</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Jira de signalement */}
      <ModalSupportJira
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        onTicketCree={(id) => {
          void rafraichir();
          setTicketActifId(id);
        }}
      />
    </div>
  );
}
