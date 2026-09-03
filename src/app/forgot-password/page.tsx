"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requestPasswordReset } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur("");
    setSuccess(false);
    
    const result = await requestPasswordReset(new FormData(e.currentTarget));
    
    setLoading(false);
    if (result?.error) {
      setErreur(result.error);
    } else if (result?.success) {
      setSuccess(true);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-sunk items-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-[380px] my-auto rounded-[20px] border border-rule/40 bg-surface p-6 sm:p-7 shadow-sm relative z-10">
        <div className="mb-6 flex flex-col items-center justify-center relative">
          <img src="/brand/educom-logo-officiel.jpg" alt="EduCom" className="h-6 w-auto object-contain" />
        </div>

        {success ? (
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">E-mail envoyé</h1>
            <p className="mt-1.5 text-[13px] text-text-soft text-center leading-relaxed">
              Si un compte est associé à cette adresse, vous recevrez un lien pour réinitialiser votre mot de passe d'ici quelques minutes.
            </p>
            <div className="mt-8">
              <Link href="/login" className="flex items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 py-2.5 text-role-action font-semibold text-text shadow-sm hover:bg-surface-hover">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">Mot de passe oublié</h1>
            <p className="mt-1.5 text-[13px] text-text-soft text-center leading-relaxed">
              Saisissez l'adresse e-mail de votre compte. Nous vous enverrons un lien pour créer un nouveau mot de passe.
            </p>

            {erreur && (
              <p
                role="alert"
                className="mt-6 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-role-body leading-relaxed text-danger"
              >
                {erreur}
              </p>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <Input
                label="Adresse e-mail"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="direction@votre-ecole.sn"
              />
              <Button type="submit" size="lg" block loading={loading}>
                Envoyer le lien
                {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-6">
              <Link href="/login" className="flex items-center justify-center gap-2 text-role-body font-medium text-text-soft hover:text-text transition-colors">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
