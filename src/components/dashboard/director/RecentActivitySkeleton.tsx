import { Skeleton } from "@/components/ui/Skeleton";
import { Activity } from "lucide-react";

export default function RecentActivitySkeleton() {
  return (
    <section aria-busy="true" className="rounded-surface bg-surface p-4 sm:p-5 shadow-sm border border-rule space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-control bg-sunk text-text">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-bold text-text">Activité Récente de l&apos;Établissement</div>
            <Skeleton className="h-2.5 w-48" />
          </div>
        </div>
        <Skeleton className="h-3 w-16" />
      </div>

      <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-rule">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative flex items-start gap-2.5">
            <div className="absolute -left-5 mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-surface border border-rule">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
            </div>
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>
    </section>
  );
}
