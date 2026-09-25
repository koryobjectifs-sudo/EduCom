"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CheckCircle2, X, Sparkles, Lock, ArrowRight, ShieldCheck, Users } from "lucide-react";
import { triggerCelebration } from "@/lib/celebration";

export function AttendanceCelebration() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<{
    className: string;
    presents: number;
    absents: number;
    lates: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const celebrate = searchParams.get("celebrate");
    if (celebrate === "1") {
      const className = searchParams.get("className") || "la classe";
      const presents = parseInt(searchParams.get("presents") || "0", 10);
      const absents = parseInt(searchParams.get("absents") || "0", 10);
      const lates = parseInt(searchParams.get("lates") || "0", 10);
      const total = parseInt(searchParams.get("total") || "0", 10);

      setData({ className, presents, absents, lates, total });
      setVisible(true);

      // Déclenchement de la célébration vibrante (confetti canons)
      try {
        triggerCelebration();
      } catch (err) {
        console.error("Celebration trigger error:", err);
      }

      // Nettoyer les paramètres de l'URL sans recharger la page
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("celebrate");
      nextParams.delete("className");
      nextParams.delete("presents");
      nextParams.delete("absents");
      nextParams.delete("lates");
      nextParams.delete("total");
      const cleanUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
      window.history.replaceState({}, "", cleanUrl);

      // Auto-fermeture après 9 secondes
      const timer = setTimeout(() => {
        setVisible(false);
      }, 9000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname]);

  if (!visible || !data) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 inset-x-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-8 duration-500 ease-out"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-950/95 via-gray-950/95 to-slate-900/95 p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-xl">
        {/* Lueur d'ambiance vibrante */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />

        <div className="relative z-10 space-y-3.5">
          {/* En-tête avec badge et bouton fermer */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40 animate-pulse">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  <Sparkles className="h-2.5 w-2.5" /> Appel validé avec succès
                </span>
                <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                  {data.className}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setVisible(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Message de confirmation métier */}
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            La classe est enregistrée pour aujourd&apos;hui et a été <strong className="text-white font-semibold">retirée de votre liste à faire</strong>.
          </p>

          {/* Mini-statistiques de présence */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-center">
              <div className="text-[10px] font-semibold text-emerald-300 uppercase">Présents</div>
              <div className="text-lg font-black text-emerald-200 tabular-nums">{data.presents}</div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-center">
              <div className="text-[10px] font-semibold text-rose-300 uppercase">Absents</div>
              <div className="text-lg font-black text-rose-200 tabular-nums">{data.absents}</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-center">
              <div className="text-[10px] font-semibold text-amber-300 uppercase">Retards</div>
              <div className="text-lg font-black text-amber-200 tabular-nums">{data.lates}</div>
            </div>
          </div>

          {/* Sceau d'inaltérabilité et raccourci historique */}
          <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-gray-400 font-medium">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>Scellé dans l&apos;historique</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setVisible(false);
                router.push("/dashboard/attendance?tab=history");
              }}
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              <span>Voir l&apos;historique</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
