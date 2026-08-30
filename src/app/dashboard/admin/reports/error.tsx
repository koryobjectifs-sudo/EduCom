"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Frontière d'erreur du centre de rapports.
 *
 * Les rapports agrègent une quinzaine de requêtes : une seule qui échoue faisait
 * tomber tout le sous-arbre du tableau de bord sur l'écran d'erreur générique de
 * Next, sans dire de quoi il s'agissait ni comment revenir.
 *
 * ⚠️ Le message technique n'est **pas** affiché : il peut porter un fragment de
 * requête, donc des identifiants d'établissement. Il part dans la console du
 * serveur, où l'équipe le lit ; l'écran, lui, dit quoi faire.
 */
export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[reports]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-surface border border-dashed border-rule bg-ground px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-surface border border-rule bg-surface text-danger shadow-card">
        <TriangleAlert aria-hidden="true" className="h-6 w-6" />
      </div>

      <h1 className="text-role-card font-semibold text-text">Le rapport n&apos;a pas pu être calculé</h1>

      <p className="mt-1.5 max-w-md text-role-body leading-relaxed text-text-soft">
        Une des mesures de cette période n&apos;a pas abouti. Aucun chiffre partiel n&apos;est affiché —
        un rapport incomplet serait plus trompeur qu&apos;un rapport absent.
      </p>

      {error.digest && (
        <p className="mt-3 text-role-meta text-text-faint">
          Référence à communiquer au support : <span className="font-mono">{error.digest}</span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <Button variant="secondary" onClick={() => { window.location.search = ""; }}>
          Revenir au mois en cours
        </Button>
      </div>
    </div>
  );
}
