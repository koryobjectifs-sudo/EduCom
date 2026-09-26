"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  CreditCard,
  Users,
  GraduationCap,
  Clock,
  FileText,
  Sliders,
  AlertCircle,
} from "lucide-react";
import type { ActionRequiredItem } from "@/lib/dashboard-director";

interface SoftActionQueueProps {
  items: ActionRequiredItem[];
}

export default function SoftActionQueue({ items }: SoftActionQueueProps) {
  const getIcon = (category: string) => {
    switch (category) {
      case "finance":
        return <CreditCard className="h-4 w-4 text-emerald-600" />;
      case "admission":
      case "staff":
        return <Users className="h-4 w-4 text-sky-600" />;
      case "pedagogy":
        return <GraduationCap className="h-4 w-4 text-indigo-600" />;
      case "attendance":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "document":
        return <FileText className="h-4 w-4 text-purple-600" />;
      default:
        return <Sliders className="h-4 w-4 text-slate-600" />;
    }
  };

  const getIconBg = (category: string) => {
    switch (category) {
      case "finance":
        return "bg-emerald-50";
      case "admission":
      case "staff":
        return "bg-sky-50";
      case "pedagogy":
        return "bg-indigo-50";
      case "attendance":
        return "bg-amber-50";
      case "document":
        return "bg-purple-50";
      default:
        return "bg-slate-100";
    }
  };

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-4">
      {/* ── EN-TÊTE DOUX & NON ANXIOGÈNE ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>Priorités Recommandées</span>
            {items.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                {items.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interventions suggérées pour fluidifier la journée
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-400">
          Cockpit Direction
        </span>
      </div>

      {/* ── ÉTAT ZEN (0 ACTION) ── */}
      {items.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 max-w-sm">
            <h3 className="text-sm font-bold text-slate-900">
              Établissement parfaitement aligné
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Aucun blocage administratif, financier ou pédagogique en attente d&apos;arbitrage.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/60 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all duration-200"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs ${getIconBg(
                    item.category
                  )}`}
                >
                  {getIcon(item.category)}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {item.title}
                    </h4>
                    {item.badgeText && (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200/80 shadow-2xs">
                        {item.badgeText}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate max-w-md">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Bouton d'action doux et évident (P2 : minimum friction) */}
              <Link
                href={item.href}
                className="inline-flex items-center justify-center gap-1.5 self-end sm:self-auto rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs border border-slate-200/80 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200 shrink-0"
              >
                <span>{item.cta || "Consulter"}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
