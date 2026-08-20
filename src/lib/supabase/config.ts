/**
 * Adresse du projet Supabase — normalisée et vérifiée en UN SEUL endroit.
 *
 * ═══ POURQUOI CE FICHIER EXISTE — PANNE DU 20 AOÛT 2026 ═══
 *
 * ⚠️ En production, **toute authentification échouait** sur un message anglais
 * incompréhensible : « Invalid path specified in request URL ». Ni la création
 * d'école ni la connexion n'étaient possibles, alors que les pages s'affichaient
 * parfaitement — ce qui rendait la panne d'autant plus déroutante.
 *
 * La cause : `NEXT_PUBLIC_SUPABASE_URL` portait le suffixe `/rest/v1`. C'est la
 * valeur que le tableau de bord Supabase affiche sous l'intitulé « RESTful
 * endpoint » ; la recopier est une erreur d'un seul copier-coller. Or
 * `supabase-js` ajoute LUI-MÊME le chemin du service (`/auth/v1/token`,
 * `/rest/v1/…`) : la variable doit contenir l'ORIGINE, et rien d'autre. Avec le
 * suffixe, les requêtes d'authentification partaient vers
 * `…/rest/v1/auth/v1/token` — c'est-à-dire vers PostgREST, qui répondait 404 et
 * cette phrase-là. Le message ne venait donc pas d'EduCom, ni de Supabase Auth,
 * mais de la mauvaise brique de Supabase.
 *
 * ⚠️ **Vérifié, pas supposé** : chaque service Supabase renvoie un message
 * DISTINCT quand on lui adresse un appel d'authentification. `/storage/v1` →
 * « Route POST:/auth/v1/token… not found » ; `/functions/v1` → « Requested
 * function was not found » ; `/realtime/v1` → « API key is missing » ;
 * `/graphql/v1` → JSON vide. Seul un chemin sous `/rest/v1` produit exactement
 * « Invalid path specified in request URL ». Le diagnostic est donc univoque.
 *
 * ═══ CE QUE FAIT LA NORMALISATION, ET CE QU'ELLE NE FAIT PAS ═══
 *
 * Elle retire uniquement un chemin de service Supabase **placé à la racine**
 * (`/rest/v1`, `/auth/v1`, `/storage/v1`…), plus les espaces et les barres
 * obliques de fin — trois scories de copier-coller qui ne sont JAMAIS valides
 * dans cette variable.
 *
 * ⚠️ Elle ne touche à aucun autre chemin. Une installation auto-hébergée servie
 * derrière `https://exemple.tld/supabase` reste intacte : deviner à sa place
 * casserait une configuration légitime. Le produit absorbe l'erreur connue, il
 * n'invente pas de correction pour les cas qu'il ne connaît pas.
 *
 * ⚠️ La correction n'est pas silencieuse : elle est journalisée côté serveur.
 * Absorber une faute de configuration sans le dire, c'est la rendre permanente.
 */

/** Les briques de Supabase. `supabase-js` construit ces chemins lui-même. */
const SERVICES = ["auth", "rest", "storage", "functions", "realtime", "graphql"];

/** `/rest/v1`, `/auth/v1/quelque-chose`… — à la racine seulement. */
const CHEMIN_DE_SERVICE = new RegExp(`^/(?:${SERVICES.join("|")})/v\\d+(?:/|$)`, "i");

export type UrlNormalisee = {
  /** L'adresse à donner à `supabase-js`. */
  url: string;
  /** Le chemin retiré, s'il y en avait un — sinon `null`. */
  retire: string | null;
};

/**
 * Fonction PURE : testable sans environnement, sans réseau, sans base.
 * (Même parti pris que `scripts/_env.ts`, pour la même raison.)
 */
export function normaliserUrlSupabase(brut: string): UrlNormalisee {
  // Espaces et retours à la ligne : un `.env` recopié en emporte souvent un.
  const propre = brut.trim().replace(/\/+$/, "");

  let u: URL;
  try {
    u = new URL(propre);
  } catch {
    // Pas une URL : on ne répare rien ici. `supabase-js` refusera avec son
    // propre message, qui est clair (« Must be a valid HTTP or HTTPS URL »).
    return { url: propre, retire: null };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { url: propre, retire: null };

  if (CHEMIN_DE_SERVICE.test(u.pathname)) return { url: u.origin, retire: u.pathname };

  return { url: propre, retire: null };
}

/** Une seule alerte par processus : la journaliser à chaque requête la noierait. */
let dejaSignale = false;

/** L'adresse du projet Supabase, prête à l'emploi. */
export function urlSupabase(): string {
  const brut = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!brut || !brut.trim()) {
    // ⚠️ Sans ce garde-fou, `undefined` partait dans `createServerClient`, qui
    // échouait plus loin sur un message anglais sans rapport avec la cause.
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL est absente : aucun service Supabase ne peut être joint. " +
        "Renseignez l'adresse du projet (https://<ref>.supabase.co), sans chemin.",
    );
  }

  const { url, retire } = normaliserUrlSupabase(brut);
  if (retire && !dejaSignale) {
    dejaSignale = true;
    console.error(
      `⚠️ NEXT_PUBLIC_SUPABASE_URL contient le chemin « ${retire} » ; il a été retiré pour cette exécution. ` +
        "Cette variable doit contenir l'adresse du projet SEULE (https://<ref>.supabase.co) : " +
        "supabase-js ajoute lui-même /auth/v1, /rest/v1, /storage/v1. " +
        "Corrigez la variable — ici, la correction n'est qu'un filet de sécurité.",
    );
  }
  return url;
}

/** La clé publique du projet. Elle part dans le navigateur : ce n'est pas un secret. */
export function cleAnonSupabase(): string {
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!cle) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY est absente : aucun service Supabase ne peut être joint.",
    );
  }
  return cle;
}
