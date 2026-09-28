"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LifeBuoy, BookOpen, MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import FormulaireAide from "./FormulaireAide";
import { getOnboardingConfig } from "@/lib/onboarding-metiers";
import WalkthroughInteractif from "@/components/onboarding/WalkthroughInteractif";

export default function BoutonAide({ userRole = "TEACHER" }: { userRole?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState<"support" | "guide">("support");
  const [tourOuvert, setTourOuvert] = useState(false);
  const chemin = usePathname();
  const router = useRouter();
  const config = getOnboardingConfig(userRole);

  if (chemin.startsWith("/dashboard/aide")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-primary-ink px-3.5 py-2 text-role-label font-semibold text-white shadow-overlay hover:bg-primary-ink-hover print:hidden"
      >
        <LifeBuoy aria-hidden="true" className="h-4 w-4" />
        Aide
      </button>

      <Modal
        open={ouvert}
        onClose={() => setOuvert(false)}
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOnglet("support")}
              className={`text-sm font-bold pb-1 border-b-2 transition-all ${
                onglet === "support"
                  ? "border-primary text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Écrire au support
            </button>
            <button
              type="button"
              onClick={() => setOnglet("guide")}
              className={`text-sm font-bold pb-1 border-b-2 transition-all flex items-center gap-1.5 ${
                onglet === "guide"
                  ? "border-primary text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Guide {config.nomMetier}
            </button>
          </div>
        }
        description={
          onglet === "support" ? (
            <>
              Réponse dans EduCom (cloche et notification).{" "}
              <Link
                href="/dashboard/aide"
                className="text-primary underline"
                onClick={() => setOuvert(false)}
              >
                Mes demandes
              </Link>
            </>
          ) : (
            `Découvrez comment tirer le meilleur parti de votre espace ${config.nomMetier}.`
          )
        }
      >
        {onglet === "support" ? (
          <FormulaireAide
            pageForcee={chemin}
            onEnvoye={(id) => {
              setOuvert(false);
              router.push(`/dashboard/aide?t=${id}`);
            }}
          />
        ) : (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Faites le tour en 2 minutes
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOuvert(false);
                    setTourOuvert(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
                >
                  <span>Lancer</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                Parcourez interactivement les étapes clés de votre métier.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Étapes clés de votre quotidien
              </p>
              <ul className="space-y-2">
                {config.etapes.map((e) => (
                  <li
                    key={e.id}
                    onClick={() => {
                      setOuvert(false);
                      router.push(e.lien);
                    }}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{e.titre}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{e.description}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-1" />
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-100 pt-3 text-center">
              <Link
                href="/dashboard/aide/guide"
                onClick={() => setOuvert(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Ouvrir le guide complet illustré avec captures d&apos;écran</span>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* Tour guidé express si ouvert depuis l'onglet */}
      <WalkthroughInteractif
        role={userRole}
        ouvert={tourOuvert}
        onFermer={() => setTourOuvert(false)}
      />
    </>
  );
}
