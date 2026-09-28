"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, Clock, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";

interface IncitationQuizTesteurProps {
  userRole?: string;
  onOpenQuiz: () => void;
}

const MESSAGES_ROLES: Record<string, { titre: string; sousTitre: string }> = {
  OWNER: {
    titre: "Votre avis de Direction nous est précieux",
    sousTitre: "Après votre visite du cockpit, évaluez la clarté et le pilotage d'EduCom en 2 minutes chrono.",
  },
  DIRECTEUR: {
    titre: "Votre avis de Direction nous est précieux",
    sousTitre: "Après votre visite du cockpit, évaluez la clarté et le pilotage d'EduCom en 2 minutes chrono.",
  },
  TEACHER: {
    titre: "Votre retour Enseignant compte pour nous",
    sousTitre: "La saisie des notes et l'appel en direct sont-ils assez fluides ? Donnez votre avis en quelques clics.",
  },
  ENSEIGNANT: {
    titre: "Votre retour Enseignant compte pour nous",
    sousTitre: "La saisie des notes et l'appel en direct sont-ils assez fluides ? Donnez votre avis en quelques clics.",
  },
  ACCOUNTANT: {
    titre: "Votre avis Comptabilité & Écolages",
    sousTitre: "L'enregistrement des paiements et l'émission des reçus sont-ils sécurisants ? Dites-le nous en 2 min.",
  },
  COMPTABLE: {
    titre: "Votre avis Comptabilité & Écolages",
    sousTitre: "L'enregistrement des paiements et l'émission des reçus sont-ils sécurisants ? Dites-le nous en 2 min.",
  },
  SECRETARY: {
    titre: "Votre avis Secrétariat & Scolarité",
    sousTitre: "L'admission des élèves et l'édition des documents officiels sont-elles simples et sans blocage ?",
  },
  SECRETAIRE: {
    titre: "Votre avis Secrétariat & Scolarité",
    sousTitre: "L'admission des élèves et l'édition des documents officiels sont-elles simples et sans blocage ?",
  },
  PARENT: {
    titre: "Votre avis sur l'Espace Famille",
    sousTitre: "La consultation des notes et le suivi de vos enfants vous semblent-ils rassurants et lisibles ?",
  },
};

export default function IncitationQuizTesteur({
  userRole = "OWNER",
  onOpenQuiz,
}: IncitationQuizTesteurProps) {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Si déjà complété, on n'affiche plus jamais
    const completed = localStorage.getItem("educom_quiz_completed");
    if (completed === "true") return;

    // 2. Vérification du snooze
    const snoozedUntil = localStorage.getItem("educom_quiz_snoozed_until");
    if (snoozedUntil && Date.now() < Number(snoozedUntil)) return;

    // 3. Déclenchement forcé via URL pour test immédiat (?quiz_reminder=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("quiz_reminder") === "true") {
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }

    // 4. Initialisation du tracking de session
    const firstSeen = localStorage.getItem("educom_quiz_first_seen_ts");
    if (!firstSeen) {
      localStorage.setItem("educom_quiz_first_seen_ts", String(Date.now()));
    }

    // 5. Suivi du temps d'activité
    // Déclenchement automatique au bout de 20 minutes (1200000ms),
    // ou si l'utilisateur revient après 24h
    const now = Date.now();
    const firstSeenTs = Number(firstSeen || now);
    const tempsPasseMinutes = (now - firstSeenTs) / (1000 * 60);

    // Si l'utilisateur est présent depuis plus de 20 minutes ou s'il s'est connecté hier
    if (tempsPasseMinutes >= 20) {
      // Petite temporisation douce à l'arrivée sur la page
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      // Sinon, on programme un timer doux pour afficher après les 20 minutes restantes
      const tempsRestantMs = Math.max(5000, (20 - tempsPasseMinutes) * 60 * 1000);
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, tempsRestantMs);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const handleSnooze = (dureeHeures: number = 24) => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      const expiration = Date.now() + dureeHeures * 60 * 60 * 1000;
      localStorage.setItem("educom_quiz_snoozed_until", String(expiration));
    }
  };

  const handleDismissDefinitif = () => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("educom_quiz_completed", "true");
    }
  };

  const handleOpenQuiz = () => {
    setIsVisible(false);
    onOpenQuiz();
  };

  if (!isVisible) return null;

  const roleInfo =
    MESSAGES_ROLES[userRole.toUpperCase()] || MESSAGES_ROLES["OWNER"];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invitation à l'évaluation EduCom"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative max-w-md w-full bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-purple-200 text-slate-900 animate-in zoom-in-95 duration-200 select-none">
        {/* Bouton fermeture croix net en haut à droite */}
        <button
          type="button"
          onClick={() => handleSnooze(24)}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Fermer pour aujourd'hui"
          aria-label="Fermer l'invitation"
        >
          <X className="h-4 w-4" />
        </button>

        {/* En-tête */}
        <div className="flex items-center gap-2.5 pr-8">
          <div className="h-9 w-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-600/30">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-100 text-purple-800">
              Quiz Testeur · 2 min chrono
            </span>
          </div>
        </div>

        {/* Titre & Message */}
        <div className="mt-3.5 space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
            {roleInfo.titre}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {roleInfo.sousTitre}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleSnooze(24)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Rappeler demain</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismissDefinitif}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer px-2 py-1"
              title="Ne plus jamais afficher"
            >
              Déjà fait
            </button>

            <button
              type="button"
              onClick={handleOpenQuiz}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <span>Donner mon avis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
