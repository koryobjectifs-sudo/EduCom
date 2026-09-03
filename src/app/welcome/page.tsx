"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-sunk p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-[380px] my-auto rounded-[20px] border border-rule/40 bg-surface p-6 sm:p-7 shadow-sm relative z-10 text-center">
        <div className="mb-6 flex flex-col items-center justify-center relative">
          <img src="/brand/educom-logo-officiel.jpg" alt="EduCom" className="h-6 w-auto object-contain" />
        </div>

        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-success/10 p-3 text-success">
            <CheckCircle2 aria-hidden="true" className="h-10 w-10" />
          </div>
        </div>

        <h1 className="text-[20px] font-bold tracking-tight text-text">
          Bienvenue sur EduCom
        </h1>
        
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft">
          Votre compte est désormais actif et validé. Vous êtes connecté(e) en toute sécurité.
        </p>

        <div className="mt-8 pt-6 border-t border-rule/50">
          <p className="text-role-meta font-semibold text-text mb-4 uppercase tracking-wider text-xs">
            Prochaines étapes
          </p>
          <p className="text-sm text-text-faint mb-6">
            Nous allons maintenant configurer l'espace de votre établissement ensemble.
          </p>
          
          <Button size="lg" block onClick={() => router.push("/dashboard")}>
            Configurer mon école
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
