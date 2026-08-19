import Link from "next/link";
import { FileQuestion } from "lucide-react";

/**
 * Page introuvable à la racine.
 *
 * Couvre les URL hors du tableau de bord : liens de vitrine périmés, sondages
 * partagés dont l'identifiant n'existe plus (`/s/[id]` appelle déjà
 * `notFound()`), invitations expirées.
 *
 * Volontairement autonome : elle ne suppose ni session ni école, donc elle
 * n'utilise pas la coquille du dashboard. Un visiteur non connecté doit pouvoir
 * l'afficher.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-surface border border-rule bg-surface text-text-faint shadow-card">
        <FileQuestion aria-hidden="true" className="h-6 w-6" />
      </div>

      <h1 className="text-role-page font-semibold tracking-tight text-text">Page introuvable</h1>

      <p className="mt-2 max-w-md text-role-body leading-relaxed text-text-soft">
        Le lien que vous avez suivi ne mène à rien. Il a peut-être expiré, ou
        l'adresse comporte une erreur.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-control bg-primary px-4 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          Aller à l'accueil
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          Mon tableau de bord
        </Link>
      </div>
    </main>
  );
}
