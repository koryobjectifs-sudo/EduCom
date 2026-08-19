import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Squelette du centre de rapports.
 *
 * Il calque la structure réelle du lot 12 — en-tête, sélecteur de période, puis
 * des sections de cartes-mesures — et non plus les trois cartes et deux
 * graphiques de l'écran précédent, qui n'existent plus. Un squelette qui ne
 * ressemble pas à ce qui arrive produit un saut de mise en page à l'affichage.
 */
export default function ReportsLoading() {
  return (
    <div className="space-y-6 pb-10">
      {/* En-tête */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Sélecteur de période */}
      <Skeleton className="h-[76px] w-full rounded-surface" />

      {/* Bandeau de comparaison */}
      <Skeleton className="h-4 w-64" />

      {/* Sections */}
      {[0, 1, 2].map((s) => (
        <div key={s} className="overflow-hidden rounded-surface border border-rule bg-surface shadow-card">
          <div className="border-b border-rule px-5 py-4">
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((m) => (
              <Skeleton key={m} className="h-[104px] w-full rounded-surface" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
