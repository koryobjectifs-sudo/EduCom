"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sunk px-5 py-10 sm:px-8">
      <div className="w-full max-w-sm rounded-surface border border-rule bg-surface p-8 shadow-card text-center">
        <Link href="/" className="mb-10 flex justify-center w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/educom-logo-officiel.jpg"
            alt="EduCom"
            width={156}
            height={28}
            className="h-7 w-auto"
          />
        </Link>

        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-success/10 p-3 text-success">
            <CheckCircle2 aria-hidden="true" className="h-10 w-10" />
          </div>
        </div>

        <h1 className="text-role-page font-bold tracking-tight text-text">
          Bienvenue sur EduCom
        </h1>
        
        <p className="mt-4 text-role-body leading-relaxed text-text-soft">
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
