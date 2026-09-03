"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { updatePassword } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export default function UpdatePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur("");
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password")?.toString() || "";
    const confirm = formData.get("confirm_password")?.toString() || "";

    if (password !== confirm) {
      setErreur("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }
    
    const result = await updatePassword(formData);
    
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
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">Mot de passe mis à jour</h1>
            <p className="mt-1.5 text-[13px] text-text-soft text-center leading-relaxed">
              Votre mot de passe a bien été réinitialisé. Vous pouvez maintenant accéder à votre espace.
            </p>
            <div className="mt-8">
              <Button size="lg" block onClick={() => router.push("/dashboard")}>
                Accéder au tableau de bord
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">Nouveau mot de passe</h1>
            <p className="mt-1.5 text-[13px] text-text-soft text-center leading-relaxed">
              Veuillez saisir votre nouveau mot de passe pour finaliser la réinitialisation.
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
                label="Nouveau mot de passe"
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                autoFocus
                required
                placeholder="••••••••"
              />
              <Input
                label="Confirmer le mot de passe"
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
              />
              <Button type="submit" size="lg" block loading={loading}>
                Enregistrer
                {!loading && <Check aria-hidden="true" className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
