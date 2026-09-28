import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-150" aria-busy="true">
      {/* ── En-tête Unifié exact de la page Registre ── */}
      <div className="rounded-[22px] bg-white p-4.5 sm:p-5 border border-slate-200/70 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-4.5 w-16 rounded-full hidden sm:block" />
              </div>
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Skeleton className="h-8.5 w-32 rounded-full" />
            <Skeleton className="h-8.5 w-28 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Barre d'outils & Filtres (Vue Liste / Dossiers + Recherche) ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl hidden md:block" />
        </div>
        <div className="flex items-center gap-2 flex-1 sm:max-w-md sm:ml-auto">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>

      {/* ── Tableau du Registre exact (En-tête + 8 lignes avec avatar et badges) ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3.5 w-20 rounded hidden sm:block" />
          <Skeleton className="h-3.5 w-24 rounded hidden md:block" />
          <Skeleton className="h-3.5 w-16 rounded text-right" />
        </div>
        <div className="divide-y divide-slate-100 p-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 px-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="h-8.5 w-8.5 rounded-full shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
              <Skeleton className="h-5 w-16 rounded-md hidden md:block" />
              <Skeleton className="h-7 w-20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
