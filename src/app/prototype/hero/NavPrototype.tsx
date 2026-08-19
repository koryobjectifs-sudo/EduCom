/**
 * Barre de navigation du prototype — RÉPLIQUE LOCALE, volontairement.
 *
 * ⚠️ Ce n'est pas `components/landing/Navbar`. On ne l'importe pas : le
 * prototype doit pouvoir être jeté sans laisser de trace, et surtout on ne veut
 * pas qu'un réglage cosmétique fait ici se répercute sur la landing réelle.
 *
 * Elle n'existe que pour donner au hero son contexte de lecture : un hero jugé
 * sans la barre au-dessus se juge dans de mauvaises conditions. Elle est donc
 * statique — aucun menu mobile, aucun état de défilement, aucun JavaScript.
 */
export default function NavPrototype() {
  return (
    <header className="sticky top-0 z-50 border-b border-transparent bg-m-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-4 px-5 sm:h-16 sm:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marque :
            `next/image` exigerait `dangerouslyAllowSVG` dans next.config.ts,
            c'est-à-dire modifier un fichier du produit pour un prototype. */}
        <img
          src="/brand/educom-logo-horizontal.svg"
          alt="EduCom"
          className="h-6 w-auto sm:h-7"
        />

        <nav className="hidden items-center gap-8 md:flex">
          {["Le produit", "Déroulé", "Écoles", "Tarifs"].map((lien) => (
            <span
              key={lien}
              className="text-[14px] font-medium text-m-ink-soft"
            >
              {lien}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden text-[14px] font-medium text-m-ink-soft sm:inline">
            Se connecter
          </span>
          <span className="inline-flex h-9 items-center rounded-control bg-m-ink px-4 text-[13px] font-semibold text-white">
            Créer mon espace
          </span>
        </div>
      </div>
    </header>
  );
}
