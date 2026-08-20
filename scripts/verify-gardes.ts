/**
 * Vérificateur des GARDE-FOUS dev / production — 19 août 2026.
 *
 *   npm run script -- scripts/verify-gardes.ts
 *
 * ═══ POURQUOI CE FICHIER ═══
 *
 * Un garde-fou n'a de valeur que s'il est **sur le chemin**. La première
 * version ne couvrait que `npm run script` : `npx tsx scripts/verify-lot-15.ts`
 * passait à côté, et ce script crée et supprime des écoles entières.
 *
 * La protection vit désormais dans `scripts/_env.ts`, donc dans le chemin
 * d'import. Mais cela déplace le risque plutôt que de le supprimer : **il suffit
 * qu'un script futur importe `src/lib/prisma` directement, ou ouvre sa propre
 * connexion `pg`, pour être de nouveau sans protection.** Deux scripts le
 * faisaient déjà — `seed-subjects` et `seed-test-students` construisaient leur
 * propre `PrismaClient`, `verify-tenant-isolation` ouvrait une connexion `pg`
 * brute. C'est cet oubli-là que ce fichier rend impossible.
 *
 * ⚠️ Les règles d'environnement sont rejouées sur des environnements SIMULÉS,
 * via la fonction pure `evaluerEnvironnement()`. Aucune base n'est touchée : un
 * test de garde-fou qui aurait besoin d'écrire pour se prouver serait
 * précisément ce qu'on cherche à empêcher.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { evaluerEnvironnement } from "./_env";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const REF_DEV = "devrefabcdef123456";
const REF_PROD = "prodrefabcdef78901";
const PHRASE = "oui-je-sais-ce-que-je-fais";

/** Environnement simulé : seules les variables qui comptent. */
function env(o: Record<string, string | undefined>) {
  return { NEXT_PUBLIC_SUPABASE_URL: `https://${REF_DEV}.supabase.co`, EDUCOM_DEV_REFS: REF_DEV, ...o };
}

function main() {
  /* ═════════ 1. tout script qui touche la base passe par le garde-fou ═════════ */
  console.log("\n【1】 Le garde-fou est sur le CHEMIN, pas à côté");

  const fichiers = readdirSync("scripts")
    .filter((f) => f.endsWith(".ts") && f !== "_env.ts" && f !== "verify-gardes.ts")
    .map((f) => join("scripts", f))
    .concat(existsSync("seed-senegal.ts") ? ["seed-senegal.ts"] : []);

  const directs: string[] = [];
  const nonGardes: string[] = [];

  for (const f of fichiers) {
    const src = readFileSync(f, "utf8");
    const sansCommentaires = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    // ① Personne ne court-circuite `_env` en important le client de l'application.
    if (/from ["'](\.\.\/)?(\.\/)?src\/lib\/prisma["']/.test(sansCommentaires)) directs.push(`${f} (import direct)`);
    if (/new PrismaClient\s*\(/.test(sansCommentaires)) directs.push(`${f} (PrismaClient propre)`);

    // ② Tout script qui atteint la base ou Supabase doit passer par `_env`.
    const toucheBase =
      /\bprisma\.\w+\.\w+\(/.test(sansCommentaires) ||
      /new Client\s*\(\s*\{[^}]*connectionString/.test(sansCommentaires) ||
      /new Pool\s*\(/.test(sansCommentaires) ||
      /createClient\s*\(/.test(sansCommentaires);
    const garde = /from ["']\.\/(scripts\/)?_env["']|import ["']\.\/(scripts\/)?_env["']/.test(src)
      || /from ["']\.\/_cible["']/.test(src); // `_cible` importe `_env`
    if (toucheBase && !garde) nonGardes.push(f);
  }

  check(directs.length === 0,
    "aucun script n'importe `src/lib/prisma` ni ne construit son propre client",
    directs.join(", "));
  check(nonGardes.length === 0,
    "tout script qui atteint la base ou Supabase importe `_env`",
    nonGardes.length ? `${nonGardes.join(", ")} — ces scripts échapperaient au garde-fou` : undefined);
  console.log(`      ${fichiers.length} script(s) inspecté(s)`);

  /* ═════════ 2. les règles, rejouées sur des environnements simulés ═════════ */
  console.log("\n【2】 Trois environnements — la porte est fermée par défaut");

  const cas: { nom: string; e: Record<string, string | undefined>; attendu: boolean }[] = [
    { nom: "development + base connue", e: env({ EDUCOM_ENV: "development" }), attendu: true },
    { nom: "test + base connue", e: env({ EDUCOM_ENV: "test" }), attendu: true },
    { nom: "production", e: env({ EDUCOM_ENV: "production" }), attendu: false },
    { nom: "EDUCOM_ENV absente", e: env({}), attendu: false },
    { nom: "EDUCOM_ENV vide", e: env({ EDUCOM_ENV: "" }), attendu: false },
    { nom: "EDUCOM_ENV mal orthographiée (« dev »)", e: env({ EDUCOM_ENV: "dev" }), attendu: false },
    { nom: "base absente de EDUCOM_DEV_REFS", e: env({ EDUCOM_ENV: "development", EDUCOM_DEV_REFS: "uneautre" }), attendu: false },
    { nom: "EDUCOM_DEV_REFS vide", e: env({ EDUCOM_ENV: "development", EDUCOM_DEV_REFS: "" }), attendu: false },
    {
      nom: "base = EDUCOM_PRODUCTION_REF, même déclarée dev",
      e: env({ EDUCOM_ENV: "development", EDUCOM_DEV_REFS: REF_DEV, EDUCOM_PRODUCTION_REF: REF_DEV }),
      attendu: false,
    },
    { nom: "autre base que la production, dev déclaré", e: env({ EDUCOM_ENV: "development", EDUCOM_PRODUCTION_REF: REF_PROD }), attendu: true },
  ];

  for (const c of cas) {
    const v = evaluerEnvironnement(c.e);
    check(v.autorise === c.attendu,
      `${c.nom} → ${c.attendu ? "autorisé" : "REFUSÉ"}`,
      v.autorise === c.attendu ? undefined : `obtenu : ${v.autorise ? "autorisé" : `refusé (${v.motif})`}`);
  }

  /* ═════════ 3. le veto que rien ne lève ═════════ */
  console.log("\n【3】 Environnement déployé — veto absolu");

  const surVercel = evaluerEnvironnement(env({ EDUCOM_ENV: "development", VERCEL: "1" }));
  check(!surVercel.autorise, "VERCEL défini → REFUSÉ même en développement");

  const vercelForce = evaluerEnvironnement(env({ EDUCOM_ENV: "development", VERCEL: "1", EDUCOM_ALLOW_PRODUCTION: PHRASE }));
  check(!vercelForce.autorise,
    "VERCEL défini → REFUSÉ MÊME avec la phrase de levée (le veto ④ n'est pas levable)");

  /* ═════════ 4. la levée exceptionnelle est difficile à déclencher par accident ═════════ */
  console.log("\n【4】 La levée doit être délibérée");

  const prodEnv = { EDUCOM_ENV: "production" };
  for (const [valeur, nom] of [["1", "« 1 »"], ["true", "« true »"], ["oui", "« oui »"], ["", "vide"]] as const) {
    const v = evaluerEnvironnement(env({ ...prodEnv, EDUCOM_ALLOW_PRODUCTION: valeur }));
    check(!v.autorise, `EDUCOM_ALLOW_PRODUCTION=${nom} ne lève RIEN`);
  }
  const leve = evaluerEnvironnement(env({ ...prodEnv, EDUCOM_ALLOW_PRODUCTION: PHRASE }));
  check(leve.autorise, "seule la phrase exacte lève le garde-fou");

  /* ═════════ 5. rien de tout cela ne fuit dans le dépôt ═════════ */
  console.log("\n【5】 Le dépôt ne désarme pas la protection");

  const exemple = readFileSync(".env.example", "utf8");
  const declarees = exemple.split("\n")
    .map((l) => l.match(/^#?\s*([A-Z][A-Z0-9_]*)\s*=/)?.[1]).filter(Boolean);
  check(!declarees.includes("EDUCOM_ALLOW_PRODUCTION"),
    "`EDUCOM_ALLOW_PRODUCTION` n'est PAS dans .env.example",
    "l'y écrire désarmerait la protection en permanence, silencieusement");
  check(declarees.includes("EDUCOM_ENV") && declarees.includes("EDUCOM_DEV_REFS"),
    "`EDUCOM_ENV` et `EDUCOM_DEV_REFS` sont documentées");
  check(/development/.test(exemple) && /test/.test(exemple) && /production/.test(exemple),
    "les trois environnements sont nommés dans .env.example");

  const envSrc = readFileSync("scripts/_env.ts", "utf8");
  check(!/EDUCOM_ALLOW_PRODUCTION[^)]*===\s*["']1["']/.test(envSrc),
    "la levée n'accepte pas une valeur triviale comme « 1 »");
}

try { main(); } catch (e) {
  fail(`le vérificateur s'est interrompu : ${e instanceof Error ? e.message : String(e)}`);
}
console.log(`\n${"═".repeat(74)}`);
console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoué(s)`);
console.log("═".repeat(74));
process.exit(failures ? 1 : 0);
