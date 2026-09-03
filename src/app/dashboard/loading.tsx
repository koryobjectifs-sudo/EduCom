import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      {/* ── NIVEAU 1 — CURRENT CONTEXT ── */}
      <section className="flex flex-col gap-1.5 mb-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-48" />
          <span className="text-rule/60 hidden sm:inline">|</span>
          <Skeleton className="h-4 w-32 hidden sm:block" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-64" />
        </div>
      </section>

      {/* ── NIVEAU 2 — OPERATIONAL PULSE ── */}
      <section className="mb-8 rounded-[24px] border border-rule/50 bg-surface/50 p-6 sm:p-8">
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="col-span-1 sm:col-span-2 lg:col-span-4 h-32 w-full rounded-[16px]" />
          <Skeleton className="h-32 w-full rounded-[16px]" />
          <Skeleton className="h-32 w-full rounded-[16px]" />
          <Skeleton className="h-32 w-full rounded-[16px]" />
        </div>
      </section>

      {/* ── NIVEAU 3 — ATTENTION CENTER ── */}
      <section className="rounded-surface border border-rule shadow-card bg-surface p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </section>

      {/* ── NIVEAU 4 — NEXT BEST ACTION ── */}
      <section className="mb-8">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-[200px] w-full rounded-[24px]" />
      </section>

      {/* ── NIVEAU 5 — DOMAIN ACCESS ── */}
      <section className="mb-10">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Skeleton className="h-[180px] w-full rounded-[16px]" />
          <Skeleton className="h-[180px] w-full rounded-[16px]" />
          <Skeleton className="h-[180px] w-full rounded-[16px]" />
          <Skeleton className="h-[180px] w-full rounded-[16px]" />
          <Skeleton className="h-[180px] w-full rounded-[16px]" />
        </div>
      </section>

      {/* ── NIVEAU 6 — SCHOOL HEALTH ── */}
      <section className="rounded-surface border border-rule shadow-card bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-6">
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

      {/* ── NIVEAU 6 — SUPPORTING INFORMATION (Summaries) ── */}
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
