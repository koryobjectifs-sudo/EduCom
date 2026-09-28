"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  Bug,
  HelpCircle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  Laptop,
  Check,
  ExternalLink,
} from "lucide-react";
import { creerTicketJira, type DonneesTicketJira } from "@/app/dashboard/aide/actions";

export type ModalSupportJiraProps = {
  ouvert: boolean;
  onFermer: () => void;
  onTicketCree?: (ticketId: string, ref: string) => void;
};

export default function ModalSupportJira({ ouvert, onFermer, onTicketCree }: ModalSupportJiraProps) {
  const pathname = usePathname();
  const [template, setTemplate] = useState<"BUG" | "QUESTION" | "AMELIORATION">("BUG");
  const [priorite, setPriorite] = useState<"URGENT" | "NORMAL" | "BAS">("NORMAL");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [etapes, setEtapes] = useState("");
  const [attendu, setAttendu] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succesRef, setSuccesRef] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  // Détection du navigateur et système
  const [sysInfo, setSysInfo] = useState<{ navigateur?: string; os?: string; resolution?: string }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      let nav = "Navigateur moderne";
      if (ua.includes("Firefox")) nav = "Firefox";
      else if (ua.includes("Chrome") && !ua.includes("Edg")) nav = "Chrome";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) nav = "Safari";
      else if (ua.includes("Edg")) nav = "Edge";

      let os = "Système inconnu";
      if (ua.includes("Mac")) os = "macOS";
      else if (ua.includes("Win")) os = "Windows";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
      else if (ua.includes("Linux")) os = "Linux";

      setSysInfo({
        navigateur: nav,
        os,
        resolution: `${window.innerWidth}x${window.innerHeight}`,
      });
    }
  }, []);

  // Réinitialisation à la fermeture
  useEffect(() => {
    if (!ouvert) {
      setTimeout(() => {
        setSuccesRef(null);
        setErreur(null);
        setTitre("");
        setDescription("");
        setEtapes("");
        setAttendu("");
        setPriorite("NORMAL");
      }, 300);
    }
  }, [ouvert]);

  if (!ouvert) return null;

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) {
      setErreur("Veuillez indiquer un titre ou un résumé court.");
      return;
    }
    if (!description.trim()) {
      setErreur("Veuillez décrire votre demande.");
      return;
    }

    setErreur(null);
    demarrer(async () => {
      const payload: DonneesTicketJira = {
        template,
        titre,
        priorite,
        description,
        etapesReproduction: template === "BUG" ? etapes : undefined,
        resultatAttendu: template === "BUG" ? attendu : undefined,
        page: pathname,
        systemeInfo: sysInfo,
      };

      const res = await creerTicketJira(payload);
      if (res.ok) {
        setSuccesRef(res.ref);
        onTicketCree?.(res.id, res.ref);
      } else {
        setErreur(res.error);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-modal-support"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-rule bg-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-rule px-5 py-4 bg-sunk/30">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-ink text-white font-bold text-sm shadow-2xs">
              ⚡
            </span>
            <div>
              <h2 id="titre-modal-support" className="text-base font-bold text-text">
                Support EduCom · Nouveau ticket
              </h2>
              <p className="text-xs text-text-soft">Assistance technique et accompagnement de votre école</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-soft hover:bg-sunk hover:text-text transition-colors"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {succesRef ? (
          /* Confirmation de création style Jira */
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-text">Demande enregistrée avec succès !</h3>
            <p className="mt-1 text-sm text-text-soft">
              Votre ticket a été créé sous la référence{" "}
              <span className="font-mono font-bold text-primary-ink bg-primary-ink/10 px-2 py-0.5 rounded-md">
                {succesRef}
              </span>
            </p>
            <p className="mt-3 text-xs text-text-faint max-w-md mx-auto">
              L&apos;équipe support EduCom analyse votre demande. Vous pouvez suivre l&apos;avancement et échanger en direct
              dans le canal <strong className="text-text">#support-educom</strong> de votre Communauté.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/dashboard/communications/communaute?espace=support-educom"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-ink px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-primary-ink-hover transition-colors"
              >
                <span>Voir dans #support-educom</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={onFermer}
                className="rounded-xl border border-rule bg-surface px-4 py-2.5 text-xs font-semibold text-text-soft hover:bg-sunk hover:text-text transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          /* Formulaire Jira */
          <form onSubmit={soumettre} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 space-y-4">
            {/* Choix du type de ticket */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-soft mb-1.5">
                Type de demande
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplate("BUG")}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all ${
                    template === "BUG"
                      ? "border-danger bg-danger/5 ring-2 ring-danger/20 text-danger font-bold"
                      : "border-rule bg-surface text-text-soft hover:bg-sunk"
                  }`}
                >
                  <Bug className="h-5 w-5" />
                  <span className="text-xs">Signaler un bug</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplate("QUESTION")}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all ${
                    template === "QUESTION"
                      ? "border-primary-ink bg-primary-ink/5 ring-2 ring-primary-ink/20 text-primary-ink font-bold"
                      : "border-rule bg-surface text-text-soft hover:bg-sunk"
                  }`}
                >
                  <HelpCircle className="h-5 w-5" />
                  <span className="text-xs">Poser une question</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplate("AMELIORATION")}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all ${
                    template === "AMELIORATION"
                      ? "border-purple-600 bg-purple-50 ring-2 ring-purple-200 text-purple-700 font-bold"
                      : "border-rule bg-surface text-text-soft hover:bg-sunk"
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="text-xs">Amélioration</span>
                </button>
              </div>
            </div>

            {/* Niveau de priorité */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-soft mb-1.5">
                Niveau d&apos;urgence
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "URGENT", label: "Urgent (Bloquant pour l'école)", color: "text-danger border-danger/40 bg-danger/5" },
                  { id: "NORMAL", label: "Normal (Gênant mais contournable)", color: "text-primary-ink border-primary-ink/40 bg-primary-ink/5" },
                  { id: "BAS", label: "Bas (Détail ou question)", color: "text-emerald-700 border-emerald-400 bg-emerald-50" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriorite(p.id as typeof priorite)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-all ${
                      priorite === p.id ? `${p.color} font-bold ring-2 ring-primary-ink/20` : "border-rule text-text-soft hover:bg-sunk"
                    }`}
                  >
                    {priorite === p.id && <Check className="h-3.5 w-3.5" />}
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Titre */}
            <div>
              <label htmlFor="jira-titre" className="block text-xs font-bold uppercase tracking-wider text-text-soft mb-1">
                {template === "BUG" ? "Résumé du problème" : template === "QUESTION" ? "Objet de la question" : "Idée d'amélioration"} *
              </label>
              <input
                id="jira-titre"
                type="text"
                required
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder={
                  template === "BUG"
                    ? "Ex: Impossible d'exporter le bulletin de la classe CM2"
                    : template === "QUESTION"
                      ? "Ex: Comment configurer les coefficients de matières ?"
                      : "Ex: Ajouter un raccourci pour saisir les présences"
                }
                className="block w-full rounded-xl border border-rule bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-primary-ink focus:outline-none focus:ring-1 focus:ring-primary-ink"
              />
            </div>

            {/* Description principale */}
            <div>
              <label htmlFor="jira-desc" className="block text-xs font-bold uppercase tracking-wider text-text-soft mb-1">
                {template === "BUG" ? "Que se passe-t-il exactement ?" : "Détails"} *
              </label>
              <textarea
                id="jira-desc"
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  template === "BUG"
                    ? "Décrivez le message d'erreur ou le comportement anormal..."
                    : template === "QUESTION"
                      ? "Expliquez ce que vous cherchez à accomplir..."
                      : "Expliquez le problème actuel et comment cette idée aiderait l'école..."
                }
                className="block w-full rounded-xl border border-rule bg-surface p-3 text-sm text-text placeholder:text-text-faint focus:border-primary-ink focus:outline-none focus:ring-1 focus:ring-primary-ink"
              />
            </div>

            {/* Champs spécifiques aux bugs */}
            {template === "BUG" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="jira-etapes" className="block text-xs font-bold uppercase tracking-wider text-text-soft mb-1">
                    Étapes pour reproduire (facultatif)
                  </label>
                  <textarea
                    id="jira-etapes"
                    rows={2}
                    value={etapes}
                    onChange={(e) => setEtapes(e.target.value)}
                    placeholder="1. Aller sur Notes&#10;2. Cliquer sur Bulletins&#10;3. ..."
                    className="block w-full rounded-xl border border-rule bg-surface p-2.5 text-xs text-text placeholder:text-text-faint focus:border-primary-ink focus:outline-none focus:ring-1 focus:ring-primary-ink"
                  />
                </div>
                <div>
                  <label htmlFor="jira-attendu" className="block text-xs font-bold uppercase tracking-wider text-text-soft mb-1">
                    Comportement attendu (facultatif)
                  </label>
                  <textarea
                    id="jira-attendu"
                    rows={2}
                    value={attendu}
                    onChange={(e) => setAttendu(e.target.value)}
                    placeholder="Le bulletin PDF devrait se télécharger sans erreur."
                    className="block w-full rounded-xl border border-rule bg-surface p-2.5 text-xs text-text placeholder:text-text-faint focus:border-primary-ink focus:outline-none focus:ring-1 focus:ring-primary-ink"
                  />
                </div>
              </div>
            )}

            {/* Contexte capturé automatiquement (Transparence & gain de temps) */}
            <div className="flex items-center gap-2 rounded-xl bg-sunk/60 px-3 py-2 text-[11.5px] text-text-soft">
              <Laptop className="h-4 w-4 shrink-0 text-text-faint" />
              <div className="min-w-0 flex-1 truncate">
                <span>Contexte joint : </span>
                <span className="font-mono text-text">{pathname}</span>
                {sysInfo.navigateur && <span> · {sysInfo.navigateur} ({sysInfo.os})</span>}
              </div>
            </div>

            {erreur && (
              <div className="flex items-center gap-2 rounded-xl bg-danger/10 p-3 text-xs font-medium text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{erreur}</span>
              </div>
            )}

            {/* Actions de bas de formulaire */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-rule">
              <button
                type="button"
                onClick={onFermer}
                disabled={enCours}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-text-soft hover:bg-sunk hover:text-text transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={enCours || !titre.trim() || !description.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-ink px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-primary-ink-hover disabled:bg-primary-ink/35 transition-colors"
              >
                {enCours ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Création du ticket...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Envoyer la demande</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
