import type { NextConfig } from "next";

/**
 * ═══ POURQUOI `distDir` EST PARAMÉTRABLE ═══
 *
 * `next dev` et `next build` écrivent dans le MÊME dossier `.next`. Lancer une
 * compilation de vérification pendant qu'une session de développement tourne
 * écrase les artefacts du serveur de dev, qui se met alors à servir du code
 * périmé : l'utilisateur ne voit plus ses modifications et croit que rien n'a
 * été fait. C'est la règle 3 d'`AGENTS.md`, et elle a déjà coûté une session.
 *
 * La sortie est donc redirigeable par une variable d'environnement :
 *
 *   npm run build          → `.next`        (compilation de production)
 *   npm run build:verify   → `.next-verify` (vérification, dev intact)
 *
 * ⚠️ `.next-*` est ignoré par Git (voir `.gitignore`). Un build de vérification
 * ne laisse donc aucune trace dans le dépôt, et n'a pas non plus à être servi :
 * il ne prouve que la compilation.
 */
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
