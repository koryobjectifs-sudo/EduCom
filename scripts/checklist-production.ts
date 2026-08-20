/**
 * Checklist du futur projet Supabase de PRODUCTION.
 *
 *   npm run script -- scripts/checklist-production.ts
 *
 * ═══ CE QUE FAIT CE SCRIPT ═══
 *
 * Il **lit** la configuration de sécurité réellement en place sur le projet de
 * développement, et en déduit la procédure exacte à rejouer sur le projet de
 * production. **Il n'écrit rien, nulle part.**
 *
 * ⚠️ La checklist n'est pas rédigée à la main : elle est **dérivée de la base**.
 * Une liste écrite à la main se périme le jour où quelqu'un change un réglage
 * sans la mettre à jour — et personne ne s'en aperçoit avant la production.
 *
 * ⚠️ **Aucune matrice RLS parallèle n'est inventée.** La configuration validée
 * est celle de `scripts/harden-rls.ts` ; ce script s'y réfère, il ne la
 * réécrit pas.
 */
import { readFileSync } from "node:fs";
import { prisma } from "./_env";
import { ALLOWED_MIME, MAX_BYTES } from "../src/lib/studentFileLimits";

const T = (s: string) => `\n\x1b[1m${s}\x1b[0m`;
const point = (s: string) => console.log(`  ☐ ${s}`);
const info = (s: string) => console.log(`     \x1b[90m${s}\x1b[0m`);
const alerte = (s: string) => console.log(`     \x1b[33m⚠️  ${s}\x1b[0m`);

async function main() {
  console.log("\n" + "═".repeat(74));
  console.log("  CHECKLIST — PROJET SUPABASE DE PRODUCTION");
  console.log("  Dérivée de la configuration RÉELLE du projet de développement.");
  console.log("═".repeat(74));

  /* ─── 1. création ─── */
  console.log(T("【1】 Création du projet"));
  const v = await prisma.$queryRawUnsafe<{ version: string }[]>("SELECT version()");
  const pg = v[0].version.split(" ")[1];
  point(`créer un projet Supabase NEUF (ne pas réutiliser le projet actuel)`);
  info(`le développement tourne sur PostgreSQL ${pg} — viser la même version majeure`);
  point("choisir la région");
  alerte("DÉCISION PROPRIÉTAIRE — les utilisateurs sont au Sénégal ; le développement");
  alerte("est en eu-west-1 (Irlande). La région Supabase et la région d'exécution");
  alerte("Vercel doivent CONCORDER, sinon chaque requête traverse deux fois.");
  point("choisir un plan qui ne met JAMAIS le projet en pause pour inactivité");
  alerte("DÉCISION PROPRIÉTAIRE — le plan du projet actuel n'a pas pu être lu.");
  point("noter un mot de passe de base fort, généré aléatoirement, jamais réutilisé");
  alerte("celui du développement est faible ET a été exposé : ne pas le reprendre.");

  /* ─── 2. schéma ─── */
  console.log(T("【2】 Schéma — par migration, jamais par db push"));
  point("renseigner DATABASE_URL / DIRECT_URL du nouveau projet, hors du dépôt");
  point("npx prisma migrate deploy");
  info("applique prisma/migrations/00000000000000_baseline — 34 tables, 20 énumérés");
  info("vérifié : 0 DROP, 0 TRUNCATE, 0 DELETE dans cette migration");
  point("npx prisma migrate status  → doit annoncer la base à jour");
  alerte("ne JAMAIS lancer `prisma migrate reset` : la commande supprime toute la base.");
  console.log("     voir prisma/migrations/README.md");

  /* ─── 3. RLS ─── */
  console.log(T("【3】 RLS — rejouer le durcissement déjà validé"));
  const rls = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
     WHERE ns.nspname='public' AND c.relkind='r' AND c.relrowsecurity`);
  const pol = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM pg_policies WHERE schemaname='public'`);
  info(`état à reproduire : ${rls[0].n} table(s) avec RLS actif, ${pol[0].n} policy`);
  point("APPLY=1 EDUCOM_ALLOW_PRODUCTION=… npm run script -- scripts/harden-rls.ts");
  info("essai à blanc d'abord (sans APPLY) : le script montre chaque instruction");
  alerte("ZÉRO policy est VOLONTAIRE : c'est un refus total pour anon/authenticated.");
  alerte("Ajouter des policies « par école » n'ajouterait rien — cela OUVRIRAIT un");
  alerte("accès aujourd'hui fermé. Ne pas créer de matrice RLS parallèle.");
  const role = await prisma.$queryRawUnsafe<{ bypassrls: boolean }[]>(
    `SELECT rolbypassrls AS bypassrls FROM pg_roles WHERE rolname=current_user`);
  if (role[0]?.bypassrls) {
    alerte("RAPPEL : le rôle applicatif contourne RLS (rolbypassrls). RLS n'est donc");
    alerte("PAS la barrière du produit — le cloisonnement schoolId dans le code l'est.");
  }

  /* ─── 4. Storage ─── */
  console.log(T("【4】 Storage — bucket student-documents"));
  const b = await prisma.$queryRawUnsafe<{ name: string; public: boolean; file_size_limit: number | null; allowed_mime_types: string[] | null }[]>(
    `SELECT name, public, file_size_limit, allowed_mime_types FROM storage.buckets`);
  for (const x of b) {
    point(`créer le bucket « ${x.name} »`);
    info(`public : ${x.public}`);
    info(`taille maximale : ${x.file_size_limit ?? "aucune"} octets`);
    info(`types autorisés : ${(x.allowed_mime_types ?? []).join(", ") || "aucun"}`);
    if (x.public) alerte("CE BUCKET EST PUBLIC — il ne doit pas l'être.");
    else console.log("     \x1b[32m✓ privé — à recréer privé\x1b[0m");

    // Le code et le bucket doivent dire la même chose : c'est le double verrou.
    const attendus = Object.keys(ALLOWED_MIME).sort();
    const reels = [...(x.allowed_mime_types ?? [])].sort();
    const memeMime = JSON.stringify(attendus) === JSON.stringify(reels);
    // ⚠️ `file_size_limit` est un bigint côté PostgreSQL : Prisma le rend en
    // `BigInt`, et `10485760n === 10485760` est FAUX. Sans cette conversion, le
    // contrôle annonçait une divergence code ↔ bucket qui n'existe pas — un
    // faux rouge sur un invariant de sécurité, donc le pire genre de faux rouge.
    const memeTaille = Number(x.file_size_limit) === MAX_BYTES;
    console.log(`     ${memeMime ? "\x1b[32m✓" : "\x1b[31m✗"} les types du bucket correspondent à src/lib/studentFileLimits.ts\x1b[0m`);
    console.log(`     ${memeTaille ? "\x1b[32m✓" : "\x1b[31m✗"} la taille du bucket correspond à MAX_BYTES (${MAX_BYTES})\x1b[0m`);
    if (!memeMime || !memeTaille) {
      alerte("DIVERGENCE code ↔ bucket : le double verrou du lot 14 n'est plus vrai.");
    }
  }
  point("ne migrer AUCUN fichier depuis le développement");
  alerte("le bucket actuel contient des pièces d'élèves réelles : leur copie vers un");
  alerte("nouveau projet est une décision, pas une étape technique.");

  /* ─── 5. Auth ─── */
  console.log(T("【5】 Auth"));
  point("Site URL = l'URL de production (bloqué : domaine non choisi)");
  point("Redirect URLs : <site>/auth/callback  et  <site>/**");
  info("le code n'accepte que des chemins internes — voir src/app/auth/callback/route.ts");
  point("confirmation d'e-mail : ACTIVÉE");
  point("SMTP personnalisé : Resend (voir rappel.md §88)");
  alerte("l'envoi intégré de Supabase a déjà déclenché une alerte de rebond et bloque");
  alerte("les inscriptions par quota. Sans SMTP réel, personne ne peut créer de compte.");
  point("ne recréer AUCUN compte de développement dans la production");

  /* ─── 6. variables ─── */
  console.log(T("【6】 Variables — Vercel"));
  const exemple = readFileSync(".env.example", "utf8");
  const noms = exemple.split("\n").map((l) => l.match(/^([A-Z][A-Z0-9_]*)\s*=/)?.[1]).filter(Boolean) as string[];
  const cote: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: "navigateur", NEXT_PUBLIC_SUPABASE_ANON_KEY: "navigateur",
    NEXT_PUBLIC_SITE_URL: "navigateur",
  };
  for (const n of noms) {
    const c = cote[n] ?? "serveur";
    console.log(`  ☐ ${n.padEnd(30)} \x1b[90m(${c})\x1b[0m`);
  }
  alerte("ne PAS recopier le .env local : chaque valeur doit être celle du nouveau projet.");
  alerte("EDUCOM_ENV=production sur Vercel → tout script y est refusé.");
  alerte("CRON_SECRET : valeur neuve. Vercel l'envoie automatiquement à la tâche cron.");
  alerte("NE PAS définir EDUCOM_ALLOW_PRODUCTION ni NEXT_DIST_DIR.");

  /* ─── 7. ce qu'on ne peut pas affirmer ─── */
  console.log(T("【7】 Ce qui restera NON PROUVÉ tant que ce ne sera pas fait"));
  console.log("     ⃠ le projet de production n'existe pas");
  console.log("     ⃠ aucune sauvegarde n'a été vérifiée, aucune restauration essayée");
  console.log("     ⃠ aucun e-mail réel n'a été envoyé ni reçu");
  console.log("     ⃠ le plan Supabase (rétention, PITR) n'a pas pu être lu");
  console.log("\n" + "═".repeat(74) + "\n");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
