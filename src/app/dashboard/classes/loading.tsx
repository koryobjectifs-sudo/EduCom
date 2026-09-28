import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-150" aria-busy="true">
      {/* ── En-tête exact de la page Classes ── */}
      <div className="rounded-[22px] bg-white p-4.5 sm:p-5 border border-slate-200/70 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-44 rounded-md" />
                <Skeleton className="h-4.5 w-24 rounded-full hidden sm:block" />
              </div>
              <Skeleton className="h-3.5 w-80 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Skeleton className="h-8.5 w-36 rounded-full" />
            <Skeleton className="h-8.5 w-32 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Barre d'onglets de cycles & Recherche ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        </div>
        <div className="sm:max-w-xs sm:ml-auto w-full">
          <Skeleton className="h-8.5 w-full rounded-xl" />
        </div>
      </div>

      {/* ── Grille réelle des classes par cycle (Grille 3 colonnes) ── */}
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-4.5 w-16 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-3.5 w-40 rounded" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <Skeleton className="h-6 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
