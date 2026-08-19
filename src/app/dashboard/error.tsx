"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Frontière d'erreur du tableau de bord.
 *
 * ⚠️ **Un seul fichier suffit pour les 30 routes.** Dans l'App Router, un
 * `error.tsx` capture les erreurs de son segment **et de tous ses descendants**.
 * En placer un par page serait 30 fois le même code sans bénéfice — et laisserait
 * les segments oubliés sans filet. Le dépôt n'en avait aucun : une requête
 * Prisma qui échouait cassait l'écran sans rien expliquer.
 *
 * Placé ici plutôt qu'à la racine, il conserve la coquille : la sidebar et la
 * barre supérieure restent affichées, donc l'utilisateur peut naviguer ailleurs
 * au lieu de se retrouver devant une page nue.
 *
 * Le message dit **ce qui s'est passé** et **quoi faire** — pas d'excuse, pas de
 * jargon. Le détail technique n'est montré qu'en développement : en production
 * il ne renseigne pas l'utilisateur et peut exposer la structure interne.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // La console du serveur reste la trace de référence ; ce log couvre le cas
    // d'une erreur survenue côté client, invisible autrement.
    console.error("[dashboard] erreur non rattrapée :", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card>
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-surface border border-danger/30 bg-danger/10 text-danger">
            <TriangleAlert aria-hidden="true" className="h-6 w-6" />
          </div>

          <h1 className="text-role-section font-semibold text-text">
            Cette page n'a pas pu s'afficher
          </h1>

          <p className="mt-2 max-w-sm text-role-body leading-relaxed text-text-soft">
            Une erreur s'est produite pendant le chargement des données. Vos
            informations n'ont pas été modifiées. Réessayez — si le problème
            persiste, revenez au tableau de bord.
          </p>

          {process.env.NODE_ENV !== "production" && (
            <pre className="mt-4 max-w-full overflow-x-auto rounded-control bg-sunk px-3 py-2 text-left text-role-meta text-text-soft">
              {error.message}
              {error.digest ? `\n\ndigest : ${error.digest}` : ""}
            </pre>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={reset} icon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}>
              Réessayer
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
