"use client";

import { useState } from "react";
import { Info, Trash2, Database, Loader2 } from "lucide-react";
import { removeDemoData } from "@/app/onboarding/demo-actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function DemoDataBanner() {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    await removeDemoData();
    setIsDeleting(false);
    router.refresh();
  }

  return (
    <div className="rounded-control border border-primary/20 bg-primary/5 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-start sm:items-center gap-3">
        <div className="mt-0.5 sm:mt-0 p-2 bg-primary/10 rounded-full text-primary shrink-0">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-role-body font-semibold text-primary-900">
            Mode Démonstration Actif
          </h3>
          <p className="text-role-meta text-primary-800 mt-1">
            Vous visualisez actuellement EduCom avec des données fictives. Ces données n'affecteront pas vos vraies statistiques et peuvent être supprimées à tout moment.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
        <Button 
          variant="secondary" 
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full sm:w-auto border-primary/20 text-primary-700 hover:bg-primary/10"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Vider les données de démo
        </Button>
        <Button 
          onClick={() => router.push("/dashboard/students/import")}
          className="w-full sm:w-auto"
        >
          Importer mes vraies données
        </Button>
      </div>
    </div>
  );
}
