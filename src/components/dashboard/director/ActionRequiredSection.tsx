"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, ArrowRight, CheckCircle2, ShieldAlert, Sliders, UserPlus, FileCheck, Users, FileText, HelpCircle } from "lucide-react";
import type { ActionRequiredItem } from "@/lib/dashboard-director";

interface ActionRequiredSectionProps {
  items: ActionRequiredItem[];
}

export default function ActionRequiredSection({ items }: ActionRequiredSectionProps) {
  const urgentItems = items.filter((i) => i.severity === "urgent");
  const watchItems = items.filter((i) => i.severity === "watch");
  const infoItems = items.filter((i) => i.severity === "info");

  const totalCount = items.length;

  const getIcon = (iconName: string, severity: string) => {
    const props = { className: "h-5 w-5 shrink-0" };
    switch (iconName) {
      case "alert-circle":
        return <AlertCircle {...props} className="h-5 w-5 text-red-600" />;
      case "sliders":
        return <Sliders {...props} className="h-5 w-5 text-red-600" />;
      case "user-plus":
        return <UserPlus {...props} className="h-5 w-5 text-amber-600" />;
      case "file-check":
        return <FileCheck {...props} className="h-5 w-5 text-amber-600" />;
      case "users":
        return <Users {...props} className="h-5 w-5 text-amber-600" />;
      case "file-text":
        return <FileText {...props} className="h-5 w-5 text-amber-600" />;
      case "help-circle":
      default:
        return <HelpCircle {...props} className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <section className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-red-50 text-red-600">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-text tracking-tight flex items-center gap-2">
              À traiter aujourd&apos;hui
              {urgentItems.length > 0 && (
                <span className="inline-flex items-center rounded-pill bg-red-100 px-2 py-0.5 text-[10.5px] font-bold text-red-700">
                  {urgentItems.length} critique{urgentItems.length > 1 ? "s" : ""}
                </span>
              )}
            </h2>
            <p className="text-role-meta text-text-soft">
              Interventions et arbitrages prioritaires nécessitant une décision de la direction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-role-meta font-medium text-text-soft">
          <span>{totalCount} action{totalCount > 1 ? "s" : ""} identifiée{totalCount > 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Liste des actions */}
      {items.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-pill bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="mt-2 text-xs font-semibold text-text">Aucune action bloquante</h3>
          <p className="mt-0.5 text-role-meta text-text-soft max-w-sm mx-auto">
            Tous les dossiers, paiements, bulletins et configurations pédagogiques sont à jour.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isUrgent = item.severity === "urgent";
            const isWatch = item.severity === "watch";

            return (
              <div
                key={item.id}
                className={`group relative flex flex-col justify-between rounded-control p-3 border transition-all ${
                  isUrgent
                    ? "bg-red-50/40 border-red-200/90 hover:border-red-400 hover:shadow-2xs"
                    : isWatch
                    ? "bg-amber-50/30 border-amber-200/80 hover:border-amber-400 hover:shadow-2xs"
                    : "bg-surface border-rule hover:border-primary/40 hover:shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isUrgent ? "bg-red-600 animate-pulse" : isWatch ? "bg-amber-500" : "bg-blue-500"
                        }`}
                      />
                      <span
                        className={`text-[10.5px] font-bold uppercase tracking-wider ${
                          isUrgent ? "text-red-700" : isWatch ? "text-amber-700" : "text-primary"
                        }`}
                      >
                        {isUrgent ? "Action urgente" : isWatch ? "À surveiller" : "À traiter"}
                      </span>
                    </div>

                    {item.badgeText && (
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[10.5px] font-bold text-text-soft shadow-2xs border border-rule">
                        {item.badgeText}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">{getIcon(item.icon, item.severity)}</div>
                    <div>
                      <h4 className="text-xs font-semibold text-text group-hover:text-primary transition-colors leading-snug">
                        {item.title}
                      </h4>
                      <p className="mt-0.5 text-role-meta text-text-soft leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-rule flex items-center justify-between">
                  <span className="text-role-meta font-medium text-text-soft">
                    {item.count} élément{item.count > 1 ? "s" : ""}
                  </span>

                  <Link
                    href={item.href}
                    className={`inline-flex items-center gap-1 text-role-meta font-semibold rounded-control px-2 py-1 transition-colors ${
                      isUrgent
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : isWatch
                        ? "bg-amber-600 text-white hover:bg-amber-700"
                        : "bg-primary text-white hover:bg-primary-hover"
                    }`}
                  >
                    <span>{item.cta}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
