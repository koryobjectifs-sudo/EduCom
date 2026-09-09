import { Skeleton } from "@/components/ui/Skeleton";
import { GraduationCap } from "lucide-react";

export default function AcademicProgressSkeleton() {
  return (
    <section aria-busy="true" className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule space-y-4">
      <div className="flex items-center justify-between pb-3.5 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-purple-50 text-purple-700">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-text">Suivi Pédagogique & Évaluations</div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7.5 w-28" />
          <Skeleton className="h-7.5 w-36" />
        </div>
      </div>

      {/* 4 cartes KPI académiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-control bg-sunk/40 border border-rule space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="p-3.5 rounded-control bg-sunk/40 border border-rule space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-14" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="p-3.5 rounded-control bg-sunk/40 border border-rule space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="p-3.5 rounded-control bg-sunk/40 border border-rule space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Grille des classes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-2.5 rounded-control border border-rule/70 bg-surface flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
