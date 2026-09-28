import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-150" aria-busy="true">
      {/* ── En-tête exact de la page Équipe ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-40 rounded-xl shrink-0" />
      </div>

      {/* ── Organigramme réel (au lieu d'un faux tableau standard 5 colonnes) ── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs min-h-[480px] space-y-8">
        {/* Nœud sommet : Direction */}
        <div className="flex justify-center">
          <div className="w-72 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 flex flex-col items-center text-center">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4.5 w-36 rounded" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
        </div>

        {/* Ligne de connexion hiérarchique */}
        <div className="hidden sm:flex justify-center">
          <div className="h-6 w-0.5 bg-slate-200" />
        </div>

        {/* Nœuds équipes : Enseignants, Secrétariat, Comptabilité */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
