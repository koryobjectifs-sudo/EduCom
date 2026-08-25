import { SkeletonPageHeader, SkeletonTable } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DirectoryLoading() {
  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">
      <SkeletonPageHeader />
      
      <div className="space-y-6">
        {/* Top Bar: Search and Actions */}
        <div className="rounded-surface border border-rule bg-surface p-4 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <Skeleton className="h-10 w-full md:max-w-md" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-rule mb-4">
          <Skeleton className="h-10 w-24 mr-4 rounded-none" />
          <Skeleton className="h-10 w-24 mr-4 rounded-none" />
          <Skeleton className="h-10 w-24 rounded-none" />
        </div>

        {/* Table / List Area */}
        <SkeletonTable rows={10} columns={5} />
      </div>
    </div>
  );
}
