/**
 * Garde-fou : aucun script ne s'exécute contre la base de PRODUCTION.
 *
 *   Exécuté automatiquement avant chaque `npm run script -- …`
 *   (voir le script `script` dans `package.json`).
 *
 * ═══ LE RISQUE QU'IL COUVRE, MESURÉ LE 19 AOÛT 2026 ═══
 *
 * **14 vérificateurs créent et suppriment des données** — écoles, comptes,
 * élèves, notes, documents — en lisant simplement `DATABASE_URL` dans `.env`.
 * Aucun ne demande où il écrit. Tant qu'un seul projet Supabase existe, cela ne
 * se voit pas. Le jour où un projet de production existe, **il suffit d'un
 * `.env` recopié** pour que `npm run script -- scripts/verify-lot-15.ts` crée
 * des fixtures dans la base d'établissements réels — et en supprime, puisque
 * ces scripts nettoient derrière eux.
 *
 * ⚠️ **Ce fichier n'est PAS la séparation dev/production.** La séparation, ce
 * sont deux projets Supabase distincts. Ceci est la ceinture de sécurité : elle
 * ne remplace pas la route, elle rattrape l'erreur humaine.
 *
 * ═══ COMMENT L'ARMER ═══
 *
 * Renseigner dans `.env` la référence du projet de PRODUCTION :
 *
 *   EDUCOM_PRODUCTION_REF="<ref-du-projet-supabase-de-production>"
 *
 * Dès lors, tout script visant ce projet est refusé. Sur l'environnement de
 * production lui-même, `EDUCOM_ENV=production` suffit et se passe de la
 * référence.
 *
 * ⚠️ Tant qu'aucune des deux n'est renseignée, le garde-fou **ne peut pas
 * savoir** ce qui est production : il laisse passer, mais **annonce toujours la
 * cible**. Une exécution silencieuse serait le vrai danger.
 */

const ROUGE = "[31m";
const JAUNE = "[33m";
const GRIS = "[90m";
const FIN = "[0m";

/** Référence du projet Supabase, extraite de l'URL ou de la chaîne de connexion. */
function reference() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const parUrl = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (parUrl) return parUrl[1];
  const db = process.env.DATABASE_URL ?? "";
  const parDb = db.match(/postgres(?:ql)?:\/\/postgres\.([a-z0-9]+):/);
  return parDb ? parDb[1] : null;
}

/** Jamais la référence entière : elle identifie le projet dans une capture d'écran. */
const masque = (r) => (r ? `${r.slice(0, 6)}…${r.slice(-2)}` : "inconnue");

const ref = reference();
const prod = (process.env.EDUCOM_PRODUCTION_REF ?? "").trim();
const env = (process.env.EDUCOM_ENV ?? "").trim().toLowerCase();
const forcer = process.env.EDUCOM_ALLOW_PRODUCTION === "1";

const estProduction = env === "production" || (prod !== "" && ref !== null && ref === prod);

if (estProduction && !forcer) {
  console.error(`\n${ROUGE}⛔ REFUS — cible de PRODUCTION${FIN}\n`);
  console.error(`   Projet visé : ${masque(ref)}`);
  console.error(`   Motif       : ${env === "production" ? "EDUCOM_ENV=production" : "correspond à EDUCOM_PRODUCTION_REF"}\n`);
  console.error("   Les scripts de ce dossier créent et suppriment des données.");
  console.error("   Aucun ne doit s'exécuter contre des établissements réels.\n");
  console.error(`   Pour une opération de production réellement voulue et lue ligne à ligne :`);
  console.error(`   ${GRIS}EDUCOM_ALLOW_PRODUCTION=1 npm run script -- <script>${FIN}\n`);
  process.exit(1);
}

if (estProduction && forcer) {
  console.error(`\n${ROUGE}⚠️  PRODUCTION — garde-fou explicitement levé${FIN}`);
  console.error(`   Projet ${masque(ref)}. Tout ce qui sera écrit le sera sur des données réelles.\n`);
} else if (!prod && env !== "development") {
  // Ni référence de production, ni environnement déclaré : on ne peut rien
  // affirmer. On le dit, plutôt que de laisser croire à une protection.
  console.error(`${JAUNE}▸${FIN} cible ${masque(ref)} ${GRIS}— aucune référence de production déclarée (EDUCOM_PRODUCTION_REF) : ce garde-fou ne peut rien vérifier${FIN}`);
} else {
  console.error(`${GRIS}▸ cible ${masque(ref)} — développement${FIN}`);
}
