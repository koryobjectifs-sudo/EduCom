"use client";

import { useState } from "react";
import type { AuditMetiersEcole, MetierDiagnostic } from "@/lib/calculs";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, MessageSquare, Mail, ChevronDown, ChevronUp } from "lucide-react";

const STATUT_STYLES = {
  OK: {
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    label: "✓ Conforme",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
  ATTENTION: {
    badge: "bg-amber-500/10 text-amber-800 border-amber-500/20",
    label: "⚠️ À finaliser",
    border: "border-amber-500/30",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  BLOQUANT: {
    badge: "bg-rose-500/10 text-rose-700 border-rose-500/20 font-bold",
    label: "🛑 Bloquant",
    border: "border-rose-500/40 ring-1 ring-rose-500/20",
    icon: XCircle,
    iconColor: "text-rose-600",
  },
};

function CarteMetier({
  metier,
  tel,
  email,
}: {
  metier: MetierDiagnostic;
  tel?: string | null;
  email?: string | null;
}) {
  const [ouvert, setOuvert] = useState(metier.statut !== "OK");
  const s = STATUT_STYLES[metier.statut];
  const Icone = s.icon;

  return (
    <div className={`rounded-xl border bg-surface p-4 shadow-xs transition-all ${s.border}`}>
      {/* En-tête Métier */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label={metier.nom}>
            {metier.icone}
          </span>
          <div>
            <h3 className="font-bold text-[14px] text-text">{metier.nom}</h3>
            <p className="text-[11.5px] text-text-soft">{metier.resume}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.badge}`}>
            <Icone className="h-3 w-3" />
            {s.label}
          </span>
          <button
            type="button"
            onClick={() => setOuvert(!ouvert)}
            className="rounded p-1 text-text-faint hover:bg-sunk hover:text-text"
            title="Détails"
          >
            {ouvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Points forts & Bloquants */}
      {ouvert && (
        <div className="mt-3.5 space-y-3 border-t border-rule/60 pt-3">
          {metier.pointsBloquants.length > 0 && (
            <div className="rounded-lg bg-rose-50/70 p-2.5 text-[12px] text-rose-950 border border-rose-200/60 dark:bg-rose-950/20 dark:border-rose-900/30">
              <div className="font-bold text-[10.5px] uppercase tracking-wider text-rose-700">
                Facteur{metier.pointsBloquants.length > 1 ? "s" : ""} bloquant{metier.pointsBloquants.length > 1 ? "s" : ""} :
              </div>
              <ul className="mt-1 space-y-1">
                {metier.pointsBloquants.map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-snug">
                    <span className="shrink-0">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {metier.pointsForts.length > 0 && (
            <div className="text-[12px] text-text-soft">
              <div className="font-bold text-[10.5px] uppercase tracking-wider text-emerald-800">
                Points configurés :
              </div>
              <ul className="mt-1 space-y-1 text-emerald-950">
                {metier.pointsForts.map((pt, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-emerald-600">✓</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action conseillée pour débloquer */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[12px]">
            <div className="flex items-center gap-1 font-bold text-primary text-[11.5px]">
              <ArrowRight className="h-3.5 w-3.5" />
              Action pour débloquer :
            </div>
            <p className="mt-0.5 text-text-soft">{metier.actionDeblocage}</p>

            {/* Boutons d'aide pré-remplis pour ce métier */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-1 border-t border-primary/10">
              {tel && (
                <a
                  href={`https://wa.me/${tel.replace(/\D/g, "")}?text=${encodeURIComponent(
                    metier.messageAssistance.whatsapp
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-600/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                  title="WhatsApp pré-rempli pour ce métier"
                >
                  <MessageSquare className="h-3 w-3" />
                  WhatsApp
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(
                    metier.messageAssistance.emailSujet
                  )}&body=${encodeURIComponent(metier.messageAssistance.emailCorps)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                  title="E-mail pré-rempli pour ce métier"
                >
                  <Mail className="h-3 w-3" />
                  E-mail officiel →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlocsMetiers({
  audit,
  tel,
  email,
}: {
  audit: AuditMetiersEcole;
  tel?: string | null;
  email?: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-text-soft">
            Audit de Configuration par Métier
          </h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              audit.statutGlobal === "OK"
                ? "bg-emerald-500/10 text-emerald-700"
                : audit.statutGlobal === "BLOQUANT"
                ? "bg-rose-500/10 text-rose-700"
                : "bg-amber-500/10 text-amber-700"
            }`}
          >
            Score global : {audit.scoreGlobal} %
          </span>
        </div>
        {audit.bloquantPrincipal && (
          <span className="text-[11.5px] font-semibold text-rose-700">
            {audit.bloquantPrincipal}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CarteMetier metier={audit.direction} tel={tel} email={email} />
        <CarteMetier metier={audit.pedagogie} tel={tel} email={email} />
        <CarteMetier metier={audit.secretariat} tel={tel} email={email} />
        <CarteMetier metier={audit.comptabilite} tel={tel} email={email} />
      </div>
    </div>
  );
}
