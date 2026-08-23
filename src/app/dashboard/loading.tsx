import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-sm border border-rule">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <p className="text-role-body font-medium text-text-soft">Chargement en cours...</p>
    </div>
  );
}
