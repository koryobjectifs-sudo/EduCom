import { SkeletonPageHeader, SkeletonCardList } from "@/components/ui/Skeleton";

/**
 * État de chargement de la liste. Le squelette reprend la forme des cartes réelles
 * pour que la page ne saute pas à l'arrivée des données.
 *
 * Sans ce fichier, la route héritait du `loading.tsx` du segment `dashboard`,
 * dessiné pour la grille de widgets de l'accueil — un squelette de mauvaise
 * forme, qui promettait une mise en page que l'écran n'a pas.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonCardList count={8} />
    </div>
  );
}
