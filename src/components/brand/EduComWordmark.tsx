/**
 * « EduCom » écrit comme dans le logo officiel — 24 septembre 2026.
 *
 * Kory : « toujours écrire EduCom avec ses couleurs comme le logo, et sa
 * police ». Relevé dans `public/brand/educom-logo-officiel.jpg` :
 *   « Edu » bleu nuit #001D3F · « Com » rouge #A30001 · romain à empattements.
 *
 * ⚠️ La police exacte du logo n'est pas connue (le logo est une image).
 * Libre Caslon Text (graisse 700) est la plus proche disponible sur Google
 * Fonts ; chargée par `src/app/(marketing)/layout.tsx` sous la variable
 * `--font-wordmark`, repli Georgia.
 *
 * `normal-case tracking-normal` : le mot garde sa graphie même à l'intérieur
 * d'un sur-titre en capitales espacées. Lu « EduCom » par les lecteurs
 * d'écran (deux spans, aucun espace). `onDark` : variante pour fond sombre
 * (le bleu nuit y disparaîtrait ; « Com » éclairci à #FF6B6F, 5,6:1 sur #0A2342).
 */
export default function EduComWordmark({
  className = "",
  onDark = false,
}: {
  className?: string;
  /** Sur fond sombre : « Edu » en blanc, « Com » en rouge éclairci (lisible). */
  onDark?: boolean;
}) {
  return (
    <span
      className={`whitespace-nowrap font-bold normal-case tracking-normal ${className}`}
      style={{ fontFamily: "var(--font-wordmark), Georgia, 'Times New Roman', serif" }}
    >
      <span style={{ color: onDark ? "#FFFFFF" : "#001D3F" }}>Edu</span>
      <span style={{ color: onDark ? "#FF6B6F" : "#A30001" }}>Com</span>
    </span>
  );
}
