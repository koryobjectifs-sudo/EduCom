"use client";

import { useState, useTransition } from "react";
import {
  DUREES_ABONNEMENT,
  calculerTarifAbonnement,
  STANDARD_PRICE_XOF,
  PREMIUM_PRICE_XOF,
  STANDARD_PRICE_EUR,
  PREMIUM_PRICE_EUR,
  formatMontantCFA,
} from "@/lib/pricing";
import { payerAbonnement } from "./actions";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  HelpCircle,
  MessageCircle,
} from "lucide-react";

export type FormuleType = "STANDARD" | "PREMIUM" | "SUR_DEMANDE";

export default function PayerAvecWave({
  formuleInitiale = "PREMIUM",
  actif,
}: {
  formuleInitiale?: string;
  actif: boolean;
}) {
  const [formule, setFormule] = useState<FormuleType>(
    formuleInitiale === "STANDARD" ? "STANDARD" : "PREMIUM"
  );
  const [mois, setMois] = useState<number>(12); // 12 mois sélectionné par défaut pour valoriser l'économie
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const prixMensuel =
    formule === "STANDARD" ? STANDARD_PRICE_XOF : PREMIUM_PRICE_XOF;
  const tarif = calculerTarifAbonnement(prixMensuel, mois);

  const payer = () => {
    if (formule === "SUR_DEMANDE") return;
    setErreur(null);
    demarrer(async () => {
      const r = await payerAbonnement(mois, formule);
      if ("url" in r) {
        window.location.assign(r.url);
      } else {
        setErreur(r.error);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* ── 1. Les 3 cartes tarifaires identiques à la Landing Page ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* CARTE 1 : STANDARD */}
        <div
          onClick={() => setFormule("STANDARD")}
          className={`relative flex cursor-pointer flex-col rounded-2xl border transition-all duration-300 ${
            formule === "STANDARD"
              ? "border-[#1DC8FF] bg-white shadow-lg ring-2 ring-[#1DC8FF]"
              : "border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-md"
          }`}
        >
          <div className="flex flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900">Standard</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-600">
                ESSAI 7 JOURS
              </span>
            </div>

            <p className="mt-1.5 min-h-[36px] text-xs leading-relaxed text-slate-600">
              Tout pour piloter la scolarité et les finances sans complication.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <p className="text-[11px] font-medium text-purple-700">
                7 jours d&apos;essai gratuit
              </p>

              <div className="flex items-baseline gap-1.5">
                <p className="font-display text-2xl font-bold leading-none tracking-tight text-slate-900">
                  {formatMontantCFA(STANDARD_PRICE_XOF)}
                </p>
                <p className="text-xs font-medium text-slate-500">/mois</p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-600">
                  ~{STANDARD_PRICE_EUR} €
                </span>
                <span>• Sans engagement</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormule("STANDARD");
                }}
                className={`mt-2 group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  formule === "STANDARD"
                    ? "bg-[#1DC8FF] text-[#0B1F3A]"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                <span>
                  {formule === "STANDARD"
                    ? "Formule Standard choisie ✓"
                    : "Choisir la formule Standard"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 p-5">
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Bulletins officiels conformes Sénégal (calcul auto moyennes & rangs)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Gestion de l&apos;appel & registre d&apos;assiduité en direct</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Facturation écolages & reçus certifiés (QR code & filigrane)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Annuaire élèves, inscriptions & imports Excel en 1 clic</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Cockpits : Direction, Enseignant, Secrétaire, Comptable</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Portail Famille (consultation des notes & bulletins)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Assistance & support WhatsApp inclus</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CARTE 2 : PREMIUM (ROYAL PURPLE) */}
        <div
          onClick={() => setFormule("PREMIUM")}
          className={`relative flex cursor-pointer flex-col rounded-2xl transition-all duration-300 bg-gradient-to-b from-[#3B0764] via-[#581C87] to-[#2E0854] border shadow-[0_16px_36px_-12px_rgba(88,28,135,0.4)] ring-1 ${
            formule === "PREMIUM"
              ? "border-emerald-400 ring-2 ring-emerald-400 shadow-2xl scale-[1.02]"
              : "border-purple-400/35 ring-white/15 hover:shadow-xl"
          }`}
        >
          {/* Badge RECOMMANDÉ flottant */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-purple-300/40 bg-[#7E22CE] px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            RECOMMANDÉ
          </div>

          <div className="flex flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-white">Premium</h3>
            </div>

            <p className="mt-1.5 min-h-[36px] text-xs leading-relaxed text-purple-100/90">
              L&apos;expérience complète : remplacez WhatsApp et connectez vos familles.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <p className="text-[11px] font-medium text-purple-200">
                Tout le Standard inclus
              </p>

              <div className="flex items-baseline gap-1.5">
                <p className="font-display text-2xl font-bold leading-none tracking-tight text-white">
                  {formatMontantCFA(PREMIUM_PRICE_XOF)}
                </p>
                <p className="text-xs font-medium text-purple-200/80">/mois</p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-emerald-300">
                  ~{PREMIUM_PRICE_EUR} €
                </span>
                <span className="text-purple-200/70">
                  • Rentabilisé dès le 1er mois
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormule("PREMIUM");
                }}
                className={`mt-2 group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  formule === "PREMIUM"
                    ? "bg-[#1DC8FF] text-[#0B1F3A]"
                    : "bg-white text-[#581C87] hover:bg-purple-50"
                }`}
              >
                <span>
                  {formule === "PREMIUM"
                    ? "Formule Premium choisie ✓"
                    : "Choisir la formule Premium"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-b-2xl border-t border-white/10 bg-white/[0.04] p-5">
            <ul className="space-y-2 text-xs text-purple-50">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Tout ce qui est inclus dans le forfait Standard</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Communauté d&apos;école & Messagerie école ↔ parents (anti-WhatsApp)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Accusés de lecture obligatoires (« Lu par 95% des parents »)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Sondages & formulaires avec relances automatiques</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Notifications Web Push directes sur smartphones & PC</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Cockpits « Soft Elegance » avec analytique en temps réel</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Attribution des capacités d&apos;équipe (StaffGrants)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Support prioritaire 7j/7 dédié à la direction</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CARTE 3 : SUR DEMANDE */}
        <div
          onClick={() => setFormule("SUR_DEMANDE")}
          className={`relative flex cursor-pointer flex-col rounded-2xl border transition-all duration-300 ${
            formule === "SUR_DEMANDE"
              ? "border-purple-600 bg-white shadow-lg ring-2 ring-purple-600"
              : "border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-md"
          }`}
        >
          <div className="flex flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900">Sur Demande</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-600">
                SUR MESURE
              </span>
            </div>

            <p className="mt-1.5 min-h-[36px] text-xs leading-relaxed text-slate-600">
              Un besoin spécifique ou un groupe scolaire ? Sur-mesure complet.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <p className="text-[11px] font-medium text-purple-700">
                Étude & cadrage sous 24h
              </p>

              <div className="flex items-baseline gap-1.5">
                <p className="font-display text-2xl font-bold leading-none tracking-tight text-slate-900">
                  Sur devis
                </p>
                <p className="text-xs font-medium text-slate-500">/sur mesure</p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-600">
                  Frais dev + loyer
                </span>
                <span>• Développements dédiés</span>
              </div>

              <a
                href="https://wa.me/221773432020?text=Bonjour%20EduCom,%20je%20souhaite%20des%20informations%20sur%20la%20formule%20Sur%20Demande"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-2 group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800"
              >
                <span>Contacter EduCom</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>

          <div className="flex-1 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 p-5">
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Développement de fonctionnalités sur-mesure</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Adaptation exacte à vos formats de bulletins et registres</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Intégrations passerelles de paiement ou bancaires</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Pilotage multi-établissements & consolidation campus</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Accompagnement & formation sur site de vos équipes</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Développeur & interlocuteur technique dédié</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── 2. Module de Durée & Checkout Wave (quand Standard ou Premium est actif) ── */}
      {formule !== "SUR_DEMANDE" ? (
        <div className="rounded-xl border border-rule/70 bg-surface p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-rule/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-text">
                Durée d&apos;abonnement pour la formule{" "}
                <span className="text-primary">{formule === "STANDARD" ? "Standard" : "Premium"}</span>
              </h3>
              <p className="text-[11.5px] text-text-soft">
                Choisissez votre période. Les réductions s&apos;appliquent immédiatement.
              </p>
            </div>
            <span className="inline-flex self-start sm:self-auto items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Jusqu&apos;à 20% d&apos;économie
            </span>
          </div>

          {/* Grille des 4 durées : format compact & raffiné */}
          <div
            className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
            role="radiogroup"
            aria-label="Durée d'abonnement"
          >
            {DUREES_ABONNEMENT.map((d) => {
              const detail = calculerTarifAbonnement(prixMensuel, d.mois);
              const estChoisi = mois === d.mois;

              return (
                <button
                  key={d.mois}
                  type="button"
                  role="radio"
                  aria-checked={estChoisi}
                  onClick={() => setMois(d.mois)}
                  className={`relative flex flex-col justify-between rounded-lg border p-2.5 sm:p-3 text-left transition-all ${
                    estChoisi
                      ? "border-[#1DC8FF] bg-[#1DC8FF]/8 shadow-xs ring-1.5 ring-[#1DC8FF]"
                      : "border-rule/80 bg-surface hover:border-text-soft/40 hover:bg-sunk/40"
                  }`}
                >
                  {d.badge && (
                    <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[9px] font-bold tracking-wider text-white shadow-xs">
                      {d.badge}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10.5px] font-bold uppercase tracking-wider ${
                          estChoisi ? "text-primary" : "text-text-soft"
                        }`}
                      >
                        {d.libelle}
                      </span>
                      {estChoisi && (
                        <Check className="h-3.5 w-3.5 text-[#0094C6]" />
                      )}
                    </div>

                    <div className="mt-1 text-sm sm:text-base font-extrabold text-text">
                      {detail.total.toLocaleString("fr-FR")}{" "}
                      <span className="text-[10.5px] font-normal text-text-soft">F CFA</span>
                    </div>
                  </div>

                  <div className="mt-2 border-t border-rule/50 pt-1.5 text-[10.5px] text-text-soft">
                    {d.mois > 1 ? (
                      <span>
                        soit{" "}
                        <strong className="font-semibold text-text">
                          {detail.prixParMoisEquivalent.toLocaleString("fr-FR")} F
                        </strong>{" "}
                        / m
                      </span>
                    ) : (
                      <span>Règlement mensuel</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bandeau d'économie compact */}
          {tarif.remise > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-900 dark:text-emerald-200">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Économie de <strong>{tarif.remise.toLocaleString("fr-FR")} F CFA</strong> sur votre formule {formule === "STANDARD" ? "Standard" : "Premium"} ({tarif.mois} mois) !
              </span>
            </div>
          )}

          {/* Récapitulatif & Bouton Wave avec bouton rond détaché */}
          <div className="mt-4 border-t border-rule/70 pt-3.5">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] text-text-soft">Total net à régler :</p>
                <p className="text-lg sm:text-xl font-black tracking-tight text-text">
                  {tarif.total.toLocaleString("fr-FR")} F CFA{" "}
                  <span className="text-[11px] font-normal text-text-soft">
                    (Formule {formule === "STANDARD" ? "Standard" : "Premium"} · {tarif.mois} mois)
                  </span>
                </p>
              </div>

              {/* Bouton rond détaché + Bouton Payer avec montant */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={payer}
                  disabled={!actif || enCours}
                  aria-label="Payer avec Wave"
                  title="Payer avec Wave"
                  className="group flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-[#1DC8FF] p-1.5 shadow-xs transition-all hover:bg-[#00B2FE] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <img
                    src="/images/wave-logo.png"
                    alt="Wave"
                    className="h-full w-full object-contain"
                  />
                </button>

                <button
                  type="button"
                  onClick={payer}
                  disabled={!actif || enCours}
                  className="group inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl bg-[#1DC8FF] px-5 sm:px-6 text-xs sm:text-sm font-extrabold text-[#0B1F3A] shadow-xs transition-all hover:bg-[#00B2FE] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    {enCours
                      ? "Ouverture Wave…"
                      : `Payer ${tarif.total.toLocaleString("fr-FR")} F CFA avec Wave`}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {!actif && (
              <p className="mt-1.5 text-[11px] text-text-soft">
                Le paiement Wave sera disponible dès son activation par l&apos;équipe EduCom.
              </p>
            )}

            {erreur && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                {erreur}
              </p>
            )}
          </div>

          {/* Garanties compactes */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-rule/50 pt-2.5 text-[10.5px] text-text-soft">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              Paiement officiel Wave Business sécurisé
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-primary" />
              Activation automatique immédiate
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-text-soft" />
              Payer en avance prolonge sans perte de jours
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-6 dark:border-purple-900/40 dark:bg-purple-950/20">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h4 className="font-bold text-purple-950 dark:text-purple-200">
                Vous souhaitez déployer EduCom sur un campus ou un groupe scolaire ?
              </h4>
              <p className="mt-1 text-xs text-purple-800 dark:text-purple-300">
                Échangez directement avec EduCom pour étudier vos spécificités techniques et obtenir un devis personnalisé.
              </p>
            </div>
            <a
              href="https://wa.me/221773432020?text=Bonjour%20EduCom,%20je%20souhaite%20des%20renseignements%20sur%20la%20formule%20Sur%20Demande"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-purple-700 px-6 text-xs font-bold text-white shadow-sm transition-all hover:bg-purple-800"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter EduCom
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
