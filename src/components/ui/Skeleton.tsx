/**
 * Squelette de chargement du socle EduCom.
 *
 * Un squelette vaut mieux qu'un indicateur centré : il occupe la place que le
 * contenu prendra, donc la page ne saute pas à l'arrivée des données. C'est le
 * seul motif de chargement admis par le socle.
 *
 * ⚠️ `aria-hidden` : un squelette est du décor. Sans cela, un lecteur d'écran
 * énumère une dizaine de blocs vides sans rien annoncer d'utile. C'est le
 * conteneur de la zone en attente qui porte `aria-busy`, pas le squelette.
 */
export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-control bg-sunk ${className}`}
      {...props}
    />
  );
}

/**
 * Squelette de tableau : en-tête plus `rows` lignes.
 *
 * Généralise ce que chaque `loading.tsx` réécrivait à la main.
 */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={`overflow-hidden rounded-surface border border-rule bg-surface shadow-card ${className}`}>
      <div className="flex gap-4 border-b border-rule px-4 py-3 hidden md:flex">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-rule">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`r-${r}`} className="flex flex-col md:flex-row md:items-center gap-4 px-4 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={`c-${c}`} className={`h-4 flex-1 ${c === 0 ? "max-w-[40%]" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Squelette de liste de cartes (pour les vues mobiles ou les grilles).
 */
export function SkeletonCardList({
  count = 6,
  className = "flex flex-col gap-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-surface border border-rule bg-surface p-3 shadow-sm">
          <Skeleton className="h-10 w-10 shrink-0 rounded-control" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-[60%]" />
            <Skeleton className="h-3 w-[40%]" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Squelette d'en-tête de page : fil d'Ariane, titre, action. */
export function SkeletonPageHeader() {
  return (
    <div aria-busy="true" className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-36" />
    </div>
  );
}

export default Skeleton;
