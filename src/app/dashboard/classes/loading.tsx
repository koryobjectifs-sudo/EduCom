import { SkeletonPageHeader, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200" aria-busy="true">
      <SkeletonPageHeader />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>

      {/* Cycle Sections & Class Cards */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, cycleIdx) => (
          <div key={cycleIdx} className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <Skeleton key={cardIdx} className="h-36 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
