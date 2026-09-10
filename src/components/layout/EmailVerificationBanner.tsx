"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw, X, CheckCircle2 } from "lucide-react";
import { resendVerificationEmailAction } from "@/app/auth/actions";

interface EmailVerificationBannerProps {
  emailVerified?: boolean;
}

export default function EmailVerificationBanner({ emailVerified = false }: EmailVerificationBannerProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(true); // Default to true to prevent SSR flash
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("educom_dismiss_email_banner");
      if (!dismissed) {
        setIsDismissed(false);
      }
    }
  }, []);

  if (emailVerified || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("educom_dismiss_email_banner", "true");
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setFeedback(null);
    try {
      const res = await resendVerificationEmailAction();
      if (res.success) {
        setFeedback({
          type: "success",
          text: res.message || "Lien de confirmation renvoyé avec succès !",
        });
        if (res.alreadyVerified) {
          setTimeout(() => {
            setIsDismissed(true);
            router.refresh();
          }, 1500);
        }
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Impossible d'envoyer l'e-mail pour le moment.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Une erreur réseau est survenue.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <aside
      aria-label="Vérification d'adresse e-mail"
      className="relative z-30 w-full shrink-0 border-b border-amber-200 bg-amber-50/95 px-4 py-2.5 text-xs text-amber-900 shadow-2xs backdrop-blur-xs transition-all duration-200"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Mail className="h-3 w-3" />
          </span>
          <p className="min-w-0 truncate text-[12px] font-medium text-amber-950 sm:text-clip">
            <span>Adresse e-mail non confirmée. </span>
            <span className="hidden text-amber-800 sm:inline">
              La confirmation est requise pour l&apos;envoi de messages et documents officiels.
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {feedback ? (
            <span
              className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                feedback.type === "success" ? "text-emerald-700" : "text-danger"
              }`}
            >
              {feedback.type === "success" && <CheckCircle2 className="h-3.5 w-3.5" />}
              {feedback.text}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 shadow-2xs hover:bg-amber-100/50 hover:text-amber-950 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isResending ? "animate-spin text-primary" : ""}`} />
              {isResending ? "Envoi..." : "Renvoyer le lien"}
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer le bandeau pour cette session"
            className="flex h-6 w-6 items-center justify-center rounded-md text-amber-700 hover:bg-amber-200/50 hover:text-amber-950"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
