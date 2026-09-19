import { SkeletonPageHeader, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200" aria-busy="true">
      <SkeletonPageHeader />

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>

      {/* Navigation Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-rule/60 bg-surface p-4 space-y-3 shadow-card">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
