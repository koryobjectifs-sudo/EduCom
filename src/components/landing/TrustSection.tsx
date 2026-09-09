/**
 * Bandeau de confiance — refonte visuelle du 5 septembre 2026 (v6).
 *
 * Contenu inchangé (quatre affirmations vraies et vérifiables — voir
 * l'historique git pour ce qui a été délibérément exclu, comme le chiffrement
 * au repos, non vérifié). Ce qui change : plus d'icônes ni de colonnes — une
 * seule ligne sobre, séparée par des points, cohérente avec la direction du
 * plan validé (§02 : « réduit à une ligne de preuve sobre »).
 */
const PREUVES = [
  "Chaque école est cloisonnée",
  "Les pièces des élèves restent privées",
  "Conçu pour un téléphone",
  "Des documents à imprimer",
];

export default function TrustSection() {
  return (
    <section className="border-y border-m-line bg-m-card">
      <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6 lg:px-8">
        <p className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-center text-[13px] font-medium text-m-ink-soft">
          {PREUVES.map((p, i) => (
            <span key={p} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true" className="text-m-ink-faint">·</span>}
              {p}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
