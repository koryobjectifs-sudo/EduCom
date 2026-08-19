"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

/**
 * Frontière d'erreur racine.
 *
 * Filet de dernier recours pour les segments hors dashboard : vitrine, connexion,
 * inscription, invitation, sondage public. Le dashboard a la sienne, plus
 * spécifique, qui conserve la coquille.
 *
 * Autonome comme `not-found.tsx` racine : ni session, ni école, ni primitive
 * dépendant d'un contexte — cette page doit s'afficher même quand ce qui est
 * cassé est justement le chargement des données de l'utilisateur.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[racine] erreur non rattrapée :", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-surface border border-danger/30 bg-danger/10 text-danger">
        <TriangleAlert aria-hidden="true" className="h-6 w-6" />
      </div>

      <h1 className="text-role-page font-semibold tracking-tight text-text">
        Une erreur s'est produite
      </h1>

      <p className="mt-2 max-w-md text-role-body leading-relaxed text-text-soft">
        La page n'a pas pu s'afficher. Réessayez dans un instant.
      </p>

      {process.env.NODE_ENV !== "production" && (
        <pre className="mt-4 max-w-full overflow-x-auto rounded-control bg-sunk px-3 py-2 text-left text-role-meta text-text-soft">
          {error.message}
        </pre>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-control bg-primary px-4 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          Aller à l'accueil
        </Link>
      </div>
    </main>
  );
}
