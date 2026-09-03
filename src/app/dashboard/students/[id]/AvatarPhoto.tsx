"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { setStudentPhoto } from "./actions";

/**
 * Avatar de l'élève, cliquable pour poser une photo.
 *
 * ═══ DEUX CHOIX, AUCUNE INTERFACE NOUVELLE ═══
 *
 * ⚠️ **« Prendre une photo » n'ouvre PAS une interface caméra maison.** Un
 * `<input type="file" accept="image/*" capture="environment">` déclenche
 * l'appareil photo natif du téléphone. Écrire une capture `getUserMedia` avec
 * flux vidéo, canvas et bouton de déclenchement aurait été une interface
 * complexe pour un résultat inférieur : pas d'autofocus, pas de HDR, pas de
 * rotation gérée.
 *
 * ⚠️ **L'option n'apparaît que sur pointeur grossier.** `capture` est ignoré
 * sur un navigateur de bureau : le libellé « Prendre une photo » y ouvrirait un
 * sélecteur de fichiers, ce qui serait un mensonge. Le tri est fait en CSS
 * (`pointer-coarse`), donc sans détection d'agent utilisateur.
 *
 * ⚠️ **Aucune photo n'est affichée sans droit.** L'URL signée est calculée par
 * le serveur, qui a déjà borné l'élève par `studentWhereFor()` ; ce composant ne
 * reçoit qu'une URL courte, jamais un chemin de bucket.
 */
export function AvatarPhoto({
  studentId,
  initiales,
  photoUrl,
  modifiable,
}: {
  studentId: string;
  initiales: string;
  photoUrl: string | null;
  /** Faux quand l'acteur peut voir l'élève sans avoir le droit de le modifier. */
  modifiable: boolean;
}) {
  const [state, formAction, enCours] = useActionState(setStudentPhoto, null);
  const [ouvert, setOuvert] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const importer = useRef<HTMLInputElement>(null);
  const photographier = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur et à Échap — un menu qui ne se ferme pas au
  // doigt reste ouvert par-dessus le contenu sur mobile.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  // Le menu se ferme au CHOIX du fichier, pas dans un effet qui observerait le
  // résultat : refermer depuis un effet déclenche un rendu en cascade, et React
  // le signale désormais comme une erreur.
  const choisir = (input: HTMLInputElement | null) => {
    setOuvert(false);
    input?.click();
  };

  /* La photo est l'ANCRE de la fiche, comme sur les profils BambooHR : c'est
     elle qui identifie l'élève avant même le nom. À 64 px elle passait pour une
     vignette décorative. Elle monte donc à 96 / 128 / 160 px selon la largeur —
     le cercle est conservé, c'est le langage du produit (organigramme, barre
     haute), seule la présence change. */
  const TAILLE = "h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40";
  /* Carré arrondi et non cercle : une photo d'identité est cadrée en portrait,
     et le cercle en rogne les épaules et le haut du crâne. Le carré montre
     l'élève tel que la photo a été prise. Bordure blanche épaisse : la photo
     est à cheval sur le bandeau coloré et sur le fond clair — sans elle, son
     bord change de contraste à mi-hauteur. */
  const FORME = "rounded-[18px] ring-4 ring-surface";

  /* URL signée à durée courte, sur un hôte inconnu à la compilation :
     `next/image` exigerait de déclarer le domaine Supabase dans
     `next.config.ts`, que cette passe ne doit pas modifier. */
  const visuel = photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={`Photo de l'élève ${initiales}`}
      className={`${TAILLE} ${FORME} border border-rule object-cover shadow-card`}
    />
  ) : (
    <span
      aria-hidden="true"
      /* Un monogramme d'avatar n'est pas du texte de contenu : il ne relève pas
         de l'échelle typographique des rôles, qui plafonne à 28 px. Il suit la
         taille du cercle pour rester centré optiquement. */
      className={`${TAILLE} ${FORME} grid place-items-center border border-rule bg-sunk text-[28px] font-semibold text-text shadow-card sm:text-[36px] lg:text-[44px]`}
    >
      {initiales}
    </span>
  );

  if (!modifiable) return <div className="shrink-0">{visuel}</div>;

  return (
    <div ref={zone} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-label={photoUrl ? "Changer la photo de l'élève" : "Ajouter une photo de l'élève"}
        disabled={enCours}
        className="group relative block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {visuel}
        {/* Pastille d'appareil photo : c'est elle qui dit que l'avatar est une
            commande. Sans elle, rien n'indique qu'on peut cliquer. */}
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-pill border border-rule bg-surface text-text-soft shadow-card transition-colors group-hover:bg-sunk group-hover:text-text sm:h-10 sm:w-10"
        >
          <Camera className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </span>
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-2 w-56 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-surface border border-rule bg-surface py-1 shadow-overlay"
        >
          {/* ⚠️ Caché hors pointeur grossier : `capture` n'a aucun effet sur un
              navigateur de bureau, l'option y serait trompeuse. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => choisir(photographier.current)}
            className="hidden w-full items-center gap-2.5 px-3 py-2.5 text-left text-role-body text-text transition-colors hover:bg-sunk pointer-coarse:flex pointer-coarse:min-h-11"
          >
            <Camera aria-hidden="true" className="h-4 w-4 shrink-0 text-text-soft" />
            Prendre une photo
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choisir(importer.current)}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-role-body text-text transition-colors hover:bg-sunk pointer-coarse:min-h-11"
          >
            <Upload aria-hidden="true" className="h-4 w-4 shrink-0 text-text-soft" />
            Importer une photo
          </button>
        </div>
      )}

      {/* Le formulaire est soumis dès qu'un fichier est choisi : demander en plus
          un bouton « Enregistrer » ajouterait une étape sans décision à prendre. */}
      <form ref={form} action={formAction} className="hidden">
        <input type="hidden" name="studentId" value={studentId} />
        <input
          ref={importer}
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={() => form.current?.requestSubmit()}
        />
        <input
          ref={photographier}
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          onChange={() => form.current?.requestSubmit()}
        />
      </form>

      {enCours && (
        <p role="status" className="absolute left-0 top-full mt-2 whitespace-nowrap text-role-meta text-text-soft">
          Envoi…
        </p>
      )}
      {state?.error && (
        <p role="alert" className="absolute left-0 top-full z-30 mt-2 w-56 max-w-[calc(100vw-2.5rem)] rounded-control border border-rule bg-surface p-2 text-role-meta text-danger shadow-card">
          {state.error}
        </p>
      )}
    </div>
  );
}
