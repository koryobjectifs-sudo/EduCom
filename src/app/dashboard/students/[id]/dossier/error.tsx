"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Frontière d'erreur du dossier élève.
 *
 * ⚠️ Le message technique n'est pas affiché : il peut porter un chemin Storage
 * ou un identifiant d'établissement. Il part en console serveur ; l'écran dit
 * quoi faire.
 */
export default function DossierError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[dossier]", error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-surface border border-dashed border-rule bg-ground px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-surface border border-rule bg-surface text-danger shadow-card">
        <TriangleAlert aria-hidden="true" className="h-6 w-6" />
      </div>
      <h1 className="text-role-card font-semibold text-text">Le dossier n&apos;a pas pu être chargé</h1>
      <p className="mt-1.5 max-w-md text-role-body leading-relaxed text-text-soft">
        Aucune pièce partielle n&apos;est affichée — un dossier incomplet donnerait une fausse idée
        de ce qui manque réellement.
      </p>
      {error.digest && (
        <p className="mt-3 text-role-meta text-text-faint">
          Référence support : <span className="font-mono">{error.digest}</span>
        </p>
      )}
      <div className="mt-6"><Button onClick={reset}>Réessayer</Button></div>
    </div>
  );
}
