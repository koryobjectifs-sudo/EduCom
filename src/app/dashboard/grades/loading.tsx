import { Skeleton } from "@/components/ui/Skeleton";

export default function GradesLoading() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150" aria-busy="true">
      {/* ── En-tête exact de la page Évaluations ── */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-64 rounded-md" />
        <Skeleton className="h-4 w-96 max-w-full rounded" />
      </div>

      {/* ── Grille 3 colonnes réelle des classes (au lieu d'une liste verticale) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-5 w-48 rounded-md" />
          </div>
          <Skeleton className="h-4 w-20 rounded" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-4.5 w-24 rounded-full" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Skeleton className="h-3.5 w-16 rounded" />
                  <Skeleton className="h-3.5 w-28 rounded" />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Skeleton className="h-8.5 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
