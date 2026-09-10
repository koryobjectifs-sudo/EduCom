"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, HelpCircle } from "lucide-react";
import { resendVerificationEmailAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(queryEmail);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Décompte de 60 secondes pour le bouton de renvoi
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleResend() {
    if (!canResend || loading) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await resendVerificationEmailAction(email || undefined);
      if (res.success) {
        setMessage({
          type: "success",
          text: res.message || "Un nouveau lien de confirmation a été envoyé à votre adresse.",
        });
        setCountdown(60);
        setCanResend(false);
      } else {
        setMessage({
          type: "error",
          text: res.error || "Impossible d'envoyer l'e-mail. Veuillez réessayer.",
        });
        if (res.retryAfterSeconds) {
          setCountdown(res.retryAfterSeconds);
          setCanResend(false);
        }
      }
    } catch {
      setMessage({
        type: "error",
        text: "Erreur réseau. Veuillez vérifier votre connexion et réessayer.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-ground px-4 py-8 sm:px-6">
      <div className="w-full max-w-[420px] rounded-2xl bg-surface p-6 sm:p-8 shadow-card border border-rule/60 text-center">
        {/* Logo EduCom */}
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/educom-logo-officiel.jpg"
            alt="EduCom"
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Icône de boîte aux lettres */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-5">
          <Mail className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-text">
          Vérifiez votre boîte mail
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-text-soft">
          Pour des raisons de sécurité et de protection des données scolaires, nous devons confirmer votre adresse avant d&apos;activer votre espace.
        </p>

        {email ? (
          <div className="mt-4 rounded-xl bg-ground border border-rule p-3 text-center">
            <span className="text-[12px] text-text-faint block mb-0.5">Lien envoyé à l&apos;adresse :</span>
            <span className="text-[14px] font-semibold text-text break-all">{email}</span>
          </div>
        ) : null}

        {/* Message de notification */}
        {message && (
          <div
            role="alert"
            className={`mt-4 flex items-start gap-2.5 rounded-xl p-3 text-left text-[13px] leading-relaxed ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-danger/10 text-danger border border-danger/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-danger" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            size="lg"
            block
            variant="primary"
            onClick={handleResend}
            disabled={!canResend || loading}
            loading={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {canResend ? "Renvoyer le lien" : `Renvoyer le lien (${countdown}s)`}
          </Button>

          <div className="pt-2">
            <Link
              href="/register"
              className="text-[13px] font-medium text-text-soft hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Ce n&apos;est pas la bonne adresse ? Modifier
            </Link>
          </div>
        </div>

        {/* Conseils de livraison & Spams */}
        <div className="mt-8 rounded-xl border border-rule/60 bg-ground/50 p-4 text-left">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text mb-2">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>Vous ne trouvez pas l&apos;e-mail ?</span>
          </div>
          <ul className="text-[12px] text-text-soft space-y-1.5 list-disc list-inside">
            <li>Vérifiez votre dossier <strong>Spams</strong> ou <strong>Courriers indésirables</strong>.</li>
            <li>L&apos;acheminement peut prendre 1 à 2 minutes selon votre messagerie.</li>
            <li>Assurez-vous de cliquer sur le lien depuis le même appareil si possible.</li>
          </ul>
        </div>

        {/* Note sécurité */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Protection des données scolaires conforme CDP Sénégal</span>
        </div>
      </div>
    </div>
  );
}
