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

/**
 * ═══ EN-TÊTES DE SÉCURITÉ — ajoutés en C.4 ═══
 *
 * Le projet n'en envoyait **aucun**. Chacun ci-dessous a été retenu parce qu'il
 * ne peut rien casser dans ce produit — vérifié, pas supposé :
 *
 * ⚠️ `X-Frame-Options: DENY` empêche que le tableau de bord soit encadré par un
 * site tiers (détournement de clic sur des boutons qui suppriment des élèves).
 * Il ne gêne PAS l'aperçu de documents : cet `<iframe>` charge une URL signée
 * `*.supabase.co`, donc une autre origine — l'en-tête qui compte pour lui est
 * celui de Supabase, pas le nôtre.
 *
 * ⚠️ `Permissions-Policy` ne désactive **pas** la caméra. Les écrans de dépôt de
 * pièces utilisent `<input type="file" accept="image/*">`, qui sur mobile ouvre
 * « Prendre une photo » via le système. Couper la caméra par réflexe serait une
 * régression fonctionnelle silencieuse sur le geste le plus courant du produit.
 * Seules les capacités réellement inutilisées sont fermées.
 *
 * ⚠️ **Aucune `Content-Security-Policy` ici, et c'est délibéré.** Une CSP utile
 * pour Next.js exige des `nonce` propagés à chaque script, plus les origines
 * Supabase pour les URL signées. Une CSP écrite à l'aveugle casserait
 * l'application ou, pire, serait si permissive qu'elle ne protégerait rien tout
 * en donnant l'impression du contraire. C'est un chantier à part entière.
 *
 * ⚠️ `Strict-Transport-Security` sans `preload` : l'inscription à la liste de
 * préchargement engage le domaine de façon difficilement réversible, et le
 * domaine n'est pas encore choisi. Les navigateurs ignorent cet en-tête sur
 * `http://localhost`, il est donc sans effet en développement.
 */
const ENTETES_SECURITE = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), payment=(), usb=()" },
];

/**
 * ═══ ORIGINES DE DÉVELOPPEMENT AUTORISÉES ═══
 *
 * ⚠️ En développement, Next.js bloque par défaut l'accès à ses ressources
 * internes (`/_next/static/*`, `/_next/hmr`) depuis un hôte autre que
 * `localhost`. La page HTML est bien servie — donc tout semble fonctionner —
 * mais les chunks JavaScript sont refusés, React n'hydrate jamais, et les
 * Server Actions ne partent pas. Une connexion échoue alors **sans le moindre
 * message d'erreur à l'écran** : le formulaire ne fait simplement rien.
 *
 * C'est ce qui empêchait l'authentification derrière le tunnel HTTPS.
 *
 * ⚠️ Réglage de DÉVELOPPEMENT uniquement — Next l'ignore en production, il
 * n'ouvre donc rien sur le déploiement réel.
 *
 * L'hôte se déclare dans `DEV_ALLOWED_ORIGINS` (séparés par des virgules)
 * plutôt qu'en dur : les URL de tunnel sont éphémères et changent à chaque
 * redémarrage. `localhost` reste autorisé d'office par Next.
 */
const originesDevAutorisees = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  distDir: surVercel ? ".next" : process.env.NEXT_DIST_DIR || ".next",
  ...(originesDevAutorisees.length > 0 ? { allowedDevOrigins: originesDevAutorisees } : {}),
  /**
   * ⚠️ Second garde-fou, distinct du précédent. Un Server Action compare
   * l'en-tête `Origin` à `Host` (ou `X-Forwarded-Host`) et **abandonne** la
   * requête s'ils diffèrent. Derrière un tunnel, le navigateur envoie l'origine
   * publique tandis que le serveur voit son propre hôte : la connexion
   * échouerait encore, et pour une raison entièrement différente de celle des
   * ressources de dev bloquées.
   *
   * C'est une LISTE BLANCHE explicite, pas une désactivation : la protection
   * CSRF reste entière pour toute origine non déclarée, et la liste est vide
   * tant que `DEV_ALLOWED_ORIGINS` n'est pas renseignée.
   */
  ...(originesDevAutorisees.length > 0
    ? { experimental: { serverActions: { allowedOrigins: originesDevAutorisees } } }
    : {}),

  async headers() {
    return [{ source: "/:path*", headers: ENTETES_SECURITE }];
  },
};

export default nextConfig;
