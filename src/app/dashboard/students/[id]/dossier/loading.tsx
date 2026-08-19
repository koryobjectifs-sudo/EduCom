import { Skeleton } from "@/components/ui/Skeleton";

/** Squelette calqué sur la structure réelle : identité, scolarité, complétude, documents. */
export default function DossierLoading() {
  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-surface border border-rule bg-surface shadow-card">
          <div className="border-b border-rule px-5 py-4"><Skeleton className="h-5 w-44" /></div>
          <div className="space-y-2 px-5 py-4">
            {[0, 1, 2].map((j) => <Skeleton key={j} className="h-10 w-full rounded-control" />)}
          </div>
        </div>
      ))}
    </div>
  );
}
