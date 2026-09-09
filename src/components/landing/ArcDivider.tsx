/**
 * Transition courbe entre deux sections — refonte v7 (6 septembre 2026),
 * réduite lors de la passe d'ajustement du 7 septembre 2026.
 *
 * Kory, brief §17 (v7) : « stop using repetitive rectangular sections
 * separated by straight horizontal lines [...] the page should feel like ONE
 * EXPERIENCE ». Passe du 7 septembre : la page ne doit plus alterner de
 * grands blocs sombres, donc la plupart des transitions marquées ont disparu
 * avec eux (voir `page.tsx`) ; celles qui restent (fond clair → fond chaud)
 * sont réduites en hauteur et en amplitude pour rester un repère discret, pas
 * une « astuce SVG » visible.
 *
 * `bg` = la couleur de la section qui précède (le fond visible autour de la
 * courbe). `fill` = la couleur de la section qui suit (la forme peinte).
 * Composant purement décoratif (`aria-hidden`), inséré entre deux sections
 * dans `page.tsx` — ne modifie aucun des composants qu'il sépare.
 */
export default function ArcDivider({ bg, fill }: { bg: string; fill: string }) {
  return (
    <div aria-hidden="true" className="relative h-8 w-full overflow-hidden sm:h-10 lg:h-12" style={{ backgroundColor: bg }}>
      <svg viewBox="0 0 1440 128" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M0,96 C 360,48 1080,144 1440,96 L1440,128 L0,128 Z" fill={fill} />
      </svg>
    </div>
  );
}
