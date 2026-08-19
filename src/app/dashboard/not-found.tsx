import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Card } from "@/components/ui/Card";

/**
 * Page introuvable à l'intérieur du tableau de bord.
 *
 * Répond aux appels à `notFound()` faits dans un segment du dashboard, et aux
 * URL de dashboard qui ne correspondent à aucune route.
 *
 * Placée ici, elle conserve la coquille — l'utilisateur reste dans l'application
 * et garde sa navigation, au lieu d'être renvoyé sur une page nue.
 *
 * ⚠️ Les pages de détail (`students/[id]`, `classes/[id]`) gèrent encore
 * l'absence de donnée **par un bloc « introuvable » rendu en ligne**, sans
 * appeler `notFound()`. Ce fichier ne change donc pas leur comportement : il rend
 * la bascule possible, mais la faire serait modifier la logique de ces pages —
 * hors périmètre de ce lot.
 */
export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card>
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-surface border border-rule bg-ground text-text-faint">
            <FileQuestion aria-hidden="true" className="h-6 w-6" />
          </div>

          <h1 className="text-role-section font-semibold text-text">Page introuvable</h1>

          <p className="mt-2 max-w-sm text-role-body leading-relaxed text-text-soft">
            Cette page n'existe pas, ou l'élément demandé a été supprimé.
            Vérifiez le lien, ou repartez du tableau de bord.
          </p>

          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-control bg-primary px-4 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
