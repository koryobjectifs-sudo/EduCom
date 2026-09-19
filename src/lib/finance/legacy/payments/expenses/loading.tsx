import { Skeleton, SkeletonPageHeader, SkeletonTable } from "@/components/ui/Skeleton";

/** Chargement des dépenses : bandeau de période, puis liste. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <Skeleton className="h-20 w-full rounded-surface" />
      <SkeletonTable rows={6} columns={7} />
    </div>
  );
}
