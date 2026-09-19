import { Skeleton, SkeletonPageHeader, SkeletonTable } from "@/components/ui/Skeleton";

/** Chargement du bureau d'examen : états transmis, puis tableau des dépenses. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <Skeleton className="h-44 w-full rounded-surface" />
      <SkeletonTable rows={5} columns={6} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-surface" />
        <Skeleton className="h-48 w-full rounded-surface" />
      </div>
    </div>
  );
}
