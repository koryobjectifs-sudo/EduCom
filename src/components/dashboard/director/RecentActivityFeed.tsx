"use client";

import Link from "next/link";
import { Activity, CreditCard, UserPlus, MessageSquare, FileText, FileCheck, Clock, ArrowRight } from "lucide-react";
import type { ActivityTimelineItem } from "@/lib/dashboard-director";

interface RecentActivityFeedProps {
  activity?: ActivityTimelineItem[] | null;
}

export default function RecentActivityFeed({ activity }: RecentActivityFeedProps) {
  const items = activity || [];
  const getIcon = (kind: string) => {
    switch (kind) {
      case "payment":
        return <CreditCard className="h-4 w-4 text-emerald-600" />;
      case "enrollment":
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case "document":
        return <FileText className="h-4 w-4 text-amber-600" />;
      case "reportCard":
        return <FileCheck className="h-4 w-4 text-indigo-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <section className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-sunk text-text">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-text tracking-tight">
              Activité Récente de l&apos;Établissement
            </h2>
            <p className="text-role-meta text-text-soft">
              Flux chronologique des actes et événements enregistrés
            </p>
          </div>
        </div>

        <span className="text-role-meta font-medium text-text-faint">Temps réel</span>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-role-meta text-text-faint">
          Aucune activité enregistrée récemment
        </div>
      ) : (
        <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-rule">
          {items.map((item) => (
            <div key={item.id} className="relative flex items-start gap-2.5 text-xs">
              {/* Point sur la timeline */}
              <div className="absolute -left-5 mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-surface border border-rule shadow-2xs">
                {getIcon(item.kind)}
              </div>

              <div className="flex-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div>
                  <span className="font-semibold text-text">{item.title}</span>
                  <p className="text-text-soft text-[10.5px]">{item.detail}</p>
                </div>

                <span className="text-[10px] font-medium text-text-faint whitespace-nowrap">
                  {item.timeFormatted}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
