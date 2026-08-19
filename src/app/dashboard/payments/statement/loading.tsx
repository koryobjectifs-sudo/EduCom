import { Skeleton, SkeletonPageHeader } from "@/components/ui/Skeleton";

/**
 * Chargement de l'atelier financier.
 *
 * Le squelette reprend la forme réelle de l'écran — bandeau de période, quatre
 * chiffres, deux répartitions — et non le tableau hérité de `payments/loading.tsx`,
 * qui promettrait une liste que cette page n'a pas.
 *
 * (Aucun `error.tsx` ici : `dashboard/error.tsx` couvre déjà tous les segments
 * descendants. En ajouter un serait dupliquer sans rien couvrir de plus.)
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <Skeleton className="h-20 w-full rounded-surface" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-surface" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-surface" />
        <Skeleton className="h-56 w-full rounded-surface" />
      </div>

      <Skeleton className="h-48 w-full rounded-surface" />
    </div>
  );
}
