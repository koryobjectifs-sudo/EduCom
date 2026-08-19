/**
 * `.env.example` dit-il la vérité ? — 19 août 2026.
 *
 *   npm run script -- scripts/verify-env-example.ts
 *
 * ═══ POURQUOI CE VÉRIFICATEUR ═══
 *
 * Un `.env.example` incomplet ne se voit pas : l'application démarre, et la
 * fonctionnalité manquante échoue en silence des semaines plus tard. C'était le
 * cas de `CRON_SECRET` — absent du fichier, donc absent des installations, donc
 * `/api/cron/overdue` refusait tout appel sans que personne ne sache pourquoi.
 *
 * Un `.env.example` en trop est pire : il documente une intégration qui n'existe
 * pas. `WHATSAPP_API_KEY` et `PAYDUNYA_MASTER_KEY` ont survécu à leur code.
 *
 * Ce script relit donc les DEUX listes et exige qu'elles coïncident.
 *
 * ⚠️ Il vérifie aussi qu'aucune VRAIE valeur ne s'est glissée dans l'exemple :
 * le fichier est versé dans Git.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

function sources(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (p.includes("generated") || p.includes("node_modules")) continue;
    if (statSync(p).isDirectory()) sources(p, acc);
    else if (/\.(ts|tsx|mts)$/.test(p)) acc.push(p);
  }
  return acc;
}

/**
 * Fournies par la plateforme, jamais par l'exploitant : les documenter
 * inviterait à les définir à la main, ce qui casserait la compilation.
 */
const PLATEFORME = new Set([
  "NODE_ENV", "PORT",
  // ⚠️ Injectées par Vercel à la construction et à l'exécution. `VERCEL` vaut
  // "1" sur la plateforme et sert à neutraliser l'échappatoire `NEXT_DIST_DIR`
  // (voir `next.config.ts`). Les documenter dans `.env.example` inviterait à
  // les définir à la main, ce qui ferait croire à l'application qu'elle tourne
  // sur Vercel alors qu'elle tourne ailleurs.
  "VERCEL", "VERCEL_URL", "VERCEL_ENV", "VERCEL_REGION",
]);

/** Variables lues par le code, sous leurs DEUX formes d'accès. */
function variablesLues(): Map<string, string[]> {
  const trouvees = new Map<string, string[]>();
  const ajoute = (n: string, f: string) => trouvees.set(n, [...(trouvees.get(n) ?? []), f]);

  for (const f of [...sources("src"), "next.config.ts", "prisma.config.ts"]) {
    const src = readFileSync(f, "utf8");
    // `process.env.NOM`
    for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) ajoute(m[1], f);
    // `process.env["NOM"]`
    for (const m of src.matchAll(/process\.env\[\s*["'`]([A-Z][A-Z0-9_]*)["'`]\s*\]/g)) ajoute(m[1], f);
    // ⚠️ Accès indirect : `channels.ts` passe le nom à un helper `env(name)`.
    // Sans ce cas, les trois variables Twilio seraient invisibles ici — et le
    // vérificateur conclurait à tort qu'elles sont « en trop » dans l'exemple.
    for (const m of src.matchAll(/\benv\(\s*["'`]([A-Z][A-Z0-9_]*)["'`]\s*\)/g)) ajoute(m[1], f);
  }

  /**
   * ⚠️ LECTURES INDIRECTES — recensées à la main, et VÉRIFIÉES ci-dessous.
   *
   * `channels.ts` énumère les variables Twilio dans un tableau passé à un helper
   * `env(name)` : aucune n'apparaît sous la forme `process.env.NOM`. Les
   * détecter en acceptant tout littéral en capitales a été essayé et rejeté —
   * la même expression ramassait `SEND_IMPLEMENTATIONS` et
   * `CONFIGURE_NON_PROUVE`, qui sont des identifiants du code, pas des
   * variables d'environnement. Une liste explicite est moins élégante mais elle
   * ne ment pas : chaque entrée doit être RETROUVÉE dans son fichier, sinon le
   * contrôle échoue et la liste devient elle-même suspecte.
   */
  const INDIRECTES: { nom: string; fichier: string }[] = [
    { nom: "TWILIO_ACCOUNT_SID", fichier: "src/lib/channels.ts" },
    { nom: "TWILIO_AUTH_TOKEN", fichier: "src/lib/channels.ts" },
    { nom: "TWILIO_PHONE_NUMBER", fichier: "src/lib/channels.ts" },
  ];
  for (const { nom, fichier } of INDIRECTES) {
    if (readFileSync(fichier, "utf8").includes(`"${nom}"`)) ajoute(nom, fichier);
    else fail(`la lecture indirecte déclarée « ${nom} » est introuvable dans ${fichier}`,
      "la liste INDIRECTES est périmée : elle documente une lecture qui n'existe plus");
  }
  for (const p of PLATEFORME) trouvees.delete(p);
  return trouvees;
}

function variablesDocumentees(): Set<string> {
  const txt = readFileSync(".env.example", "utf8");
  const noms = new Set<string>();
  for (const ligne of txt.split("\n")) {
    // Les lignes commentées `# NOM="..."` comptent comme documentées : elles
    // décrivent une variable facultative, ce qui est une documentation valide.
    const m = ligne.match(/^#?\s*([A-Z][A-Z0-9_]*)\s*=/);
    if (m) noms.add(m[1]);
  }
  return noms;
}

function main() {
  const lues = variablesLues();
  const documentees = variablesDocumentees();

  console.log(`\n【1】 Ce que le code lit (${lues.size}) vs ce que l'exemple documente (${documentees.size})`);

  const manquantes = [...lues.keys()].filter((n) => !documentees.has(n));
  check(manquantes.length === 0,
    "toute variable lue par le code est documentée dans .env.example",
    manquantes.map((n) => `${n} ← ${[...new Set(lues.get(n))].join(", ")}`).join(" | "));

  const enTrop = [...documentees].filter((n) => !lues.has(n));
  check(enTrop.length === 0,
    "aucune variable documentée n'est orpheline (plus aucun code ne la lit)",
    enTrop.join(", ") + (enTrop.length ? " — une variable orpheline documente une intégration qui n'existe pas" : ""));

  console.log(`\n【2】 Aucune valeur réelle dans un fichier versé dans Git`);

  const txt = readFileSync(".env.example", "utf8");
  // Une clé Supabase est un JWT ; une URL de base contient un mot de passe.
  check(!/eyJ[A-Za-z0-9_-]{20,}/.test(txt), "aucun jeton JWT en clair");
  check(!/supabase\.co(?!")/.test(txt) || /xxxx\.supabase\.co/.test(txt),
    "aucune référence de projet Supabase réelle (le gabarit dit `xxxx`)");
  check(!/postgres:\/\/postgres\.[a-z]{16,}/.test(txt),
    "aucun identifiant de projet réel dans les URL de base de données");
  check(!/sk_live|sk_test|AIza[0-9A-Za-z_-]{30,}/.test(txt), "aucune clé d'API en clair");

  console.log(`\n【3】 Ce qui NE doit PAS y figurer`);

  // ⚠️ On teste les DÉCLARATIONS, pas les mentions. La première version cherchait
  // le nom n'importe où dans le fichier et se déclenchait sur le paragraphe qui
  // explique justement pourquoi ces variables ont été retirées — le vérificateur
  // interdisait au fichier de documenter sa propre histoire.
  const interdites = (motif: RegExp) => [...documentees].filter((n) => motif.test(n));
  check(interdites(/^WAVE_/).length === 0,
    "aucune variable Wave déclarée avant réception de la documentation",
    interdites(/^WAVE_/).join(", "));
  check(interdites(/^STRIPE_/).length === 0,
    "aucune variable Stripe déclarée (intégration non engagée)",
    interdites(/^STRIPE_/).join(", "));
  check(interdites(/^WHATSAPP_/).length === 0,
    "aucune variable WhatsApp Business déclarée (plus aucun code ne les lit)",
    interdites(/^WHATSAPP_/).join(", "));

  console.log(`\n【4】 Les variables critiques portent leur avertissement`);

  check(/CONTOURNE RLS/.test(txt), "la clé de service est signalée comme contournant RLS");
  check(/ÉCHEC FERMÉ/i.test(txt), "CRON_SECRET est signalé comme bloquant la route s'il est absent");
  check(/sslmode/.test(txt), "l'obligation de `sslmode` est rappelée sur les URL de base");
}

try { main(); } catch (e) {
  fail(`le vérificateur s'est interrompu : ${e instanceof Error ? e.message : String(e)}`);
}
console.log(`\n${"═".repeat(74)}`);
console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoué(s)`);
console.log("═".repeat(74));
process.exit(failures ? 1 : 0);
