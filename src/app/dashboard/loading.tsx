import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

/**
 * Chargement du tableau de bord.
 *
 * Le squelette suit la nouvelle hiérarchie — bandeau « À traiter », rangée
 * d'indicateurs, puis factures et activité. L'ancienne version dessinait la
 * grille de widgets d'avant (deux colonnes 4/8, cartes de 280 à 400 px en
 * `rounded-[32px]`) : elle promettait une mise en page que l'écran n'a plus, et
 * la page sautait à l'arrivée des données.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-10" aria-busy="true">
      {/* En-tête compact */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* À traiter */}
      <div className="overflow-hidden rounded-surface border border-rule bg-surface shadow-card">
        <div className="border-b border-rule px-5 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
        <div className="divide-y divide-rule">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-9 w-9 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-surface border border-rule bg-surface p-5 shadow-card">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Factures + activité */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SkeletonTable rows={5} columns={4} />
        </div>
        <div className="lg:col-span-2 overflow-hidden rounded-surface border border-rule bg-surface shadow-card">
          <div className="border-b border-rule px-5 py-4">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y divide-rule">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <Skeleton className="h-7 w-7 shrink-0 rounded-pill" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
