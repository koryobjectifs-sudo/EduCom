import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-150" aria-busy="true">
      {/* ── En-tête exact de la page Paiements ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-7 w-60 rounded-md" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8.5 w-24 rounded-lg hidden sm:block" />
          <Skeleton className="h-8.5 w-32 rounded-lg" />
        </div>
      </div>

      {/* ── 4 Cartes de cadrage financier réel (en haut, pas inversées) ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2 shadow-2xs">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2 shadow-2xs">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2 shadow-2xs">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2 shadow-2xs">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      </div>

      {/* ── Barre de recherche & Filtres du tableau ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8.5 w-48 rounded-lg" />
        </div>
        <div className="flex items-center gap-2 sm:max-w-xs w-full">
          <Skeleton className="h-8.5 w-full rounded-lg" />
        </div>
      </div>

      {/* ── Tableau réel des factures & règlements ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-3.5 w-24 rounded hidden sm:block" />
          <Skeleton className="h-3.5 w-20 rounded hidden md:block" />
          <Skeleton className="h-3.5 w-16 rounded" />
        </div>
        <div className="divide-y divide-slate-100 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 px-3 gap-3">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full hidden sm:block" />
              <Skeleton className="h-4 w-20 rounded hidden md:block" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
