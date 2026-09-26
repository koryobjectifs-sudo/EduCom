import MettreAJourBase from "./MettreAJourBase";

/**
 * Affiché si la base n'a pas encore les tables de la Communauté. En
 * développement, la direction met la base à jour d'un clic (sans ligne de
 * commande) ; ailleurs, un message clair plutôt qu'une page d'erreur.
 */
export default function CommunauteIndisponible({
  detail,
  peutMettreAJour = false,
  titre = "La Communauté n'est pas encore prête sur cette base.",
}: {
  detail: string;
  peutMettreAJour?: boolean;
  titre?: string;
}) {
  const dev = process.env.NODE_ENV !== "production";
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-rule bg-surface p-6 text-center">
      <p className="text-[15px] font-bold text-text">{titre}</p>
      <p className="mt-2 text-sm text-text-soft">
        {dev && peutMettreAJour
          ? "Il manque des tables des nouvelles fonctions. Un clic suffit pour les ajouter."
          : "Il manque des tables des nouvelles fonctions. Demandez à la direction de mettre la base à jour."}
      </p>
      {dev && peutMettreAJour && <MettreAJourBase />}
      <p className="mt-4 break-words text-xs text-text-faint">{detail}</p>
    </div>
  );
}
