"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Phone, ShieldCheck, RefreshCw, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestParentOtp, verifyParentOtp } from "./actions";

function ParentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suite = searchParams.get("suite") || "";

  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [phone, setPhone] = useState("");
  const [formattedPhone, setFormattedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Décompte du cooldown de renvoi
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus automatique sur le champ OTP au passage à l'étape 2
  useEffect(() => {
    if (step === "OTP") {
      otpInputRef.current?.focus();
    }
  }, [step]);

  // Étape 1 : Demande de l'OTP
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Veuillez saisir votre numéro de téléphone.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await requestParentOtp(phone);
      if (res.error) {
        setError(res.error);
        if (res.retryAfterSeconds) {
          setResendCooldown(res.retryAfterSeconds);
        }
      } else {
        setPhone(res.phone || phone);
        setFormattedPhone(res.formatted || phone);
        setStep("OTP");
        setResendCooldown(60);
      }
    } catch {
      setError("Impossible d'envoyer le code. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  // Renvoi du code OTP
  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await requestParentOtp(phone);
      if (res.error) {
        setError(res.error);
        if (res.retryAfterSeconds) {
          setResendCooldown(res.retryAfterSeconds);
        }
      } else {
        setResendCooldown(60);
      }
    } catch {
      setError("Erreur lors du renvoi du code.");
    } finally {
      setLoading(false);
    }
  }

  // Étape 2 : Vérification de l'OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length < 6) {
      setError("Veuillez saisir les 6 chiffres du code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyParentOtp(phone, cleanOtp, suite);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else if (res.success && res.destination) {
        // Redirection vers l'Espace Famille ou le deep-link prévu
        router.push(res.destination);
        router.refresh();
      }
    } catch {
      setError("Erreur de validation du code. Veuillez réessayer.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-sunk p-4 sm:p-6">
      <div className="w-full max-w-[390px] rounded-[24px] border border-rule/50 bg-surface p-6 sm:p-7 shadow-sm">
        {/* En-tête */}
        <div className="mb-6 flex flex-col items-center text-center relative">
          {step === "OTP" ? (
            <button
              type="button"
              onClick={() => {
                setStep("PHONE");
                setError(null);
                setOtp("");
              }}
              className="absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-soft hover:bg-sunk hover:text-text"
              aria-label="Modifier le numéro"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/login"
              className="absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-soft hover:bg-sunk hover:text-text"
              aria-label="Retour à la connexion générale"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}

          <img
            src="/brand/educom-logo-officiel.jpg"
            alt="EduCom"
            className="h-7 w-auto object-contain mb-3"
          />

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Espace Famille
          </div>

          <h1 className="text-[20px] font-bold tracking-tight text-text">
            {step === "PHONE" ? "Bienvenue sur EduCom" : "Vérifiez votre numéro"}
          </h1>
          <p className="mt-1 text-[13px] text-text-soft leading-relaxed">
            {step === "PHONE"
              ? "Accédez aux documents et au suivi de vos enfants sans mot de passe."
              : `Code de vérification envoyé au ${formattedPhone || phone}`}
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-[12px] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-danger"
          >
            {error}
          </div>
        )}

        {/* Étape 1 : Saisie Téléphone */}
        {step === "PHONE" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label
                htmlFor="parent-phone"
                className="block text-[13px] font-medium text-text mb-1.5"
              >
                Numéro de téléphone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-text-soft">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="parent-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  autoFocus
                  required
                  placeholder="+221 77 000 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-[12px] border border-rule bg-surface py-3 pl-10 pr-3.5 text-[15px] font-medium text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-text-soft">
                Format sénégalais (ex. 77 123 45 67) ou international (+221...)
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              block
              loading={loading}
              className="mt-2 py-3 rounded-[12px]"
            >
              Continuer
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        )}

        {/* Étape 2 : Saisie OTP */}
        {step === "OTP" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label
                htmlFor="parent-otp"
                className="block text-[13px] font-medium text-text mb-1.5 text-center"
              >
                Code à 6 chiffres
              </label>
              <div className="relative">
                <input
                  ref={otpInputRef}
                  id="parent-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtp(val);
                  }}
                  className="w-full text-center tracking-[0.4em] font-mono text-[22px] font-bold rounded-[12px] border border-rule bg-surface py-3 px-4 text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              block
              loading={loading}
              className="py-3 rounded-[12px]"
            >
              Valider le code
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>

            <div className="flex items-center justify-between pt-2 text-[12px]">
              <button
                type="button"
                onClick={() => {
                  setStep("PHONE");
                  setError(null);
                  setOtp("");
                }}
                className="text-text-soft hover:text-text transition-colors"
              >
                Changer de numéro
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className={`inline-flex items-center gap-1 font-medium ${
                  resendCooldown > 0
                    ? "text-text-soft/60 cursor-not-allowed"
                    : "text-primary hover:underline"
                }`}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : "Renvoyer le code"}
              </button>
            </div>
          </form>
        )}

        {/* Passerelle vers connexion classique */}
        <div className="mt-6 pt-4 border-t border-rule/40 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[12px] text-text-soft hover:text-text transition-colors"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Accès avec adresse e-mail et mot de passe
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ParentLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-sunk" />}>
      <ParentLoginForm />
    </Suspense>
  );
}
