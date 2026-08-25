import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      {/* ── NIVEAU 1 — le brief ── */}
      <section className="relative overflow-hidden rounded-surface border border-rule shadow-card bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3 w-full max-w-md">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-8 w-32 rounded-pill" />
        </div>
        <Skeleton className="h-4 w-full max-w-3xl mt-6" />
        <Skeleton className="h-4 w-3/4 max-w-3xl mt-2" />
      </section>

      {/* ── NIVEAU 3 — santé de l'école ── */}
      <section className="rounded-surface border border-rule shadow-card bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-6">
          {/* Cercle santé */}
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </section>

      {/* ── NIVEAU 4 — la journée en cours ── */}
      <section className="rounded-surface border border-rule shadow-card bg-surface p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-16" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-16" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-16" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-16" /></div>
        </div>
      </section>

      {/* ── NIVEAU 5 — trois résumés courts ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-surface border border-rule shadow-card bg-surface p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        </div>
        <div className="rounded-surface border border-rule shadow-card bg-surface p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        </div>
        <div className="rounded-surface border border-rule shadow-card bg-surface p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        </div>
      </div>
    </div>
  );
}
