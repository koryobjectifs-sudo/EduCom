import { Skeleton, SkeletonPageHeader } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      
      {/* Simulation des gros blocs du tableau de bord (Santé, Aujourd'hui, etc.) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm space-y-6">
          <Skeleton className="h-6 w-1/3" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
        
        <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm space-y-6">
          <Skeleton className="h-6 w-1/3" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
