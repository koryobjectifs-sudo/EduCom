import { Skeleton } from "@/components/ui/Skeleton";
import { GraduationCap } from "lucide-react";

interface AcademicProgressSkeletonProps {
  className?: string;
}

export default function AcademicProgressSkeleton({ className = "" }: AcademicProgressSkeletonProps) {
  return (
    <section aria-busy="true" className={`rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between space-y-6 ${className}`}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 shadow-xs shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="text-base font-bold text-slate-900">Suivi Pédagogique & Évaluations</div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8.5 w-28 rounded-full" />
          <Skeleton className="h-8.5 w-36 rounded-full" />
        </div>
      </div>

      {/* 4 cartes KPI académiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4.5 rounded-xl bg-slate-50/60 border border-slate-200/70 space-y-3">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Grille des classes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl border border-slate-200/70 bg-white flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

