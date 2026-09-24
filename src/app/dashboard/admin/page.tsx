import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";

/**
 * Redirection directe vers les paramètres de l'établissement.
 * 
 * Élimine la friction de la grille 6 cartes intermédiaire (« Vue d'ensemble »).
 * La 2e sidebar assure désormais l'accès direct en 1 clic à toutes les options.
 */
export default async function AdminHubPage() {
  const { user } = await requireSchoolContext();
  if (!hasAccess(user.role, "/dashboard/settings")) {
    redirect(firstAllowedPath(user.role));
  }
  redirect("/dashboard/settings");
}

