import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150" aria-busy="true">
      {/* ── 1. En-tête épuré d'accueil (Salutation & Contexte du jour) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 pt-1">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-48 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-full hidden sm:block" />
          </div>
          <Skeleton className="h-3.5 w-64 rounded" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8.5 w-32 rounded-xl" />
        </div>
      </div>

      {/* ── 2. Bande de 4 indicateurs opérationnels clés (KPI Strip) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* ── 3. Grille de pilotage équilibrée (Vue principale + Actions) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs min-h-[300px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <Skeleton className="h-5 w-32 rounded" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
