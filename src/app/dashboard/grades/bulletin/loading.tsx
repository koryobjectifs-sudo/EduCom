import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft } from "lucide-react";

export default function BulletinLoading() {
  return (
    <div className="flex-1 space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Mes classes
          </div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        {/* Colonne gauche (Filtres et liste d'élèves) */}
        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-1/2 rounded-md" />
            <Skeleton className="h-10 w-1/2 rounded-md" />
          </div>
          
          <div className="rounded-xl border border-rule bg-surface p-3 shadow-card space-y-3">
            <Skeleton className="h-9 w-full rounded-md" />
            <div className="space-y-2 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite (Grille du bulletin) */}
        <div className="flex-1">
          <div className="rounded-xl border border-rule bg-surface p-6 shadow-card min-h-[600px]">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-rule">
              <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>

            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-6 w-1/4" />
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
