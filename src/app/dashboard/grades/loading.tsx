import { Skeleton } from "@/components/ui/Skeleton";

export default function GradesChoiceLoading() {
  return (
    <div className="space-y-8 pb-12 max-w-4xl mt-8 animate-in fade-in duration-300">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96 mt-3" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Skeleton className="h-24 w-full sm:w-64 rounded-xl" />
        <Skeleton className="h-24 w-full sm:w-64 rounded-xl" />
      </div>

      <div className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <Skeleton className="h-7 w-72" />
        </div>

        <div className="rounded-xl border border-rule bg-surface overflow-hidden shadow-card">
          <div className="divide-y divide-rule">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="hidden sm:block space-y-2 text-right">
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
