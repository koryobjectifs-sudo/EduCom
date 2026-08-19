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
 *   npm run build          → `.next`        (compilation de production)
 *   npm run build:verify   → `.next-verify` (vérification, dev intact)
 *
 * ⚠️ **L'échappatoire est neutralisée sur Vercel.** Vercel cherche la sortie de
 * compilation dans `.next` : si `NEXT_DIST_DIR` se retrouvait un jour dans les
 * variables d'environnement du projet — recopiées depuis un `.env` local, c'est
 * le scénario probable — le build « réussirait » et le déploiement servirait un
 * dossier introuvable, avec un message d'erreur incompréhensible. Une commodité
 * locale ne doit pas pouvoir casser la production : sur Vercel, elle est
 * ignorée, quoi qu'on ait mis dans les variables du projet.
 */
const surVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  distDir: surVercel ? ".next" : process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
