/**
 * Aptitude à la PRODUCTION — C.4.
 *
 *   npm run script -- scripts/verify-production-ready.ts
 *
 * ═══ CE QUE CE FICHIER EST, ET CE QU'IL N'EST PAS ═══
 *
 * C'est la liste du §15 du cahier des charges C.4, **rendue exécutable**. Une
 * checklist qu'on relit à la main se coche par optimisme ; celle-ci échoue.
 *
 * ⚠️ **Il ne prouve pas que la production fonctionne** — il n'y a pas encore de
 * production. Il prouve que le DÉPÔT ne porte plus les défauts qui rendraient
 * une mise en ligne dangereuse. Les points qui exigent un environnement réel
 * (sauvegardes, envoi d'e-mail, domaine) sont déclarés NON PROUVÉS, jamais
 * comptés comme réussis.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

let checks = 0, failures = 0, unproven = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const nonProuve = (l: string, pourquoi: string) => { unproven++; console.log(`  ⃠ NON PROUVÉ — ${l}\n      ${pourquoi}`); };

function fichiers(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (p.includes("generated") || p.includes("node_modules")) continue;
    if (statSync(p).isDirectory()) fichiers(p, acc);
    else acc.push(p);
  }
  return acc;
}

function main() {
  /* ═════════ 1. migrations — aucune opération destructive ═════════ */
  console.log("\n【1】 Migrations — rien de destructeur ne peut partir en production");

  const dossier = "prisma/migrations";
  const sqls = fichiers(dossier).filter((f) => f.endsWith(".sql"));
  check(sqls.length > 0, `des migrations versionnées existent (${sqls.length} fichier(s) SQL)`,
    sqls.length === 0 ? "sans migration, la production ne peut être construite que par `db push`" : undefined);

  /**
   * ⚠️ La détection ignore les commentaires SQL. Une migration qui EXPLIQUE
   * pourquoi elle ne supprime rien contient le mot « DROP » : sans ce filtrage,
   * le contrôle se déclencherait sur sa propre documentation — le piège déjà
   * rencontré trois fois dans ce dépôt.
   */
  const DESTRUCTIF = /^\s*(DROP\s+(TABLE|COLUMN|SCHEMA|TYPE|DATABASE)|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE\s+\S+\s+DROP)/im;
  for (const f of sqls) {
    const sansCommentaires = readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");
    const lignes = sansCommentaires.split("\n").filter((l) => DESTRUCTIF.test(l));
    check(lignes.length === 0, `${f.replace(dossier + "/", "")} : aucune opération destructive`,
      lignes.length ? `${lignes.length} ligne(s) — RELECTURE HUMAINE REQUISE avant toute application` : undefined);
  }

  check(existsSync(join(dossier, "README.md")), "la procédure de migration est documentée");

  /* ═════════ 2. secrets ═════════ */
  console.log("\n【2】 Secrets");

  const exemple = readFileSync(".env.example", "utf8");
  check(!/eyJ[A-Za-z0-9_-]{20,}/.test(exemple), ".env.example ne contient aucun jeton");
  check(!/postgres(?:ql)?:\/\/postgres\.[a-z]{15,}:/.test(exemple),
    ".env.example ne contient aucune chaîne de connexion réelle");

  const gitignore = readFileSync(".gitignore", "utf8");
  check(/^\.env\*/m.test(gitignore) && /^!\.env\.example/m.test(gitignore),
    ".gitignore couvre `.env*` et n'excepte que l'exemple");

  // ⚠️ La clé de service ne doit apparaître dans AUCUN composant client.
  const clients = fichiers("src").filter((f) => /\.(tsx|ts)$/.test(f) && /^\s*["']use client["']/m.test(readFileSync(f, "utf8")));
  const fuites = clients.filter((f) => /SERVICE_ROLE|DATABASE_URL|DIRECT_URL|CRON_SECRET/.test(readFileSync(f, "utf8")));
  check(fuites.length === 0, `aucun secret serveur dans les ${clients.length} composants client`, fuites.join(", "));

  // Seules les variables NEXT_PUBLIC_ ont le droit d'atteindre le navigateur.
  const publiques = [...exemple.matchAll(/^(NEXT_PUBLIC_[A-Z0-9_]*)\s*=/gm)].map((m) => m[1]);
  check(publiques.every((v) => !/SECRET|SERVICE_ROLE|PASSWORD|TOKEN/.test(v)),
    `les ${publiques.length} variables publiques ne portent aucun nom de secret`,
    publiques.filter((v) => /SECRET|SERVICE_ROLE|PASSWORD|TOKEN/.test(v)).join(", "));

  /* ═════════ 3. en-têtes de sécurité ═════════ */
  console.log("\n【3】 En-têtes de sécurité");

  const conf = readFileSync("next.config.ts", "utf8");
  for (const h of ["Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
    check(conf.includes(h), `${h} est déclaré`);
  }
  /**
   * ⚠️ Absence VOLONTAIRE, donc vérifiée comme telle.
   *
   * ⚠️ Ce contrôle cherche une DÉCLARATION d'en-tête, pas le nom de l'en-tête.
   * Sa première version cherchait la chaîne n'importe où et se déclenchait sur
   * le commentaire de `next.config.ts` qui explique justement pourquoi il n'y a
   * pas de CSP. **C'est la quatrième fois que ce dépôt tombe dans ce piège** —
   * après `print:`, « pas de suivi des présences » et le nom du prestataire
   * abandonné. Tout contrôle qui cherche un mot doit se demander s'il le
   * contient, et s'il l'interdit à un fichier qui a le droit de l'expliquer.
   */
  check(!/key:\s*["']Content-Security-Policy["']/.test(conf),
    "aucune Content-Security-Policy improvisée (chantier séparé, documenté)");
  check(!/camera=\(\)/.test(conf),
    "la caméra n'est PAS coupée — le dépôt de pièces l'utilise via le sélecteur de fichiers");

  /* ═════════ 4. surface exposée ═════════ */
  console.log("\n【4】 Surface exposée");

  const routes = existsSync("src/app/api") ? fichiers("src/app/api").filter((f) => f.endsWith("route.ts")) : [];
  check(routes.length === 1 && routes[0].includes("cron/overdue"),
    `une seule route d'API, et c'est la tâche planifiée (${routes.length})`,
    routes.join(", "));
  check(!existsSync("src/app/api/webhooks"),
    "aucun webhook tant qu'aucun fournisseur n'est configuré");

  const src = fichiers("src").filter((f) => /\.(ts|tsx)$/.test(f));
  const abandonne = ["pay", "dunya"].join("");
  check(src.every((f) => !new RegExp(abandonne, "i").test(readFileSync(f, "utf8"))),
    "aucune mention du prestataire de paiement abandonné");

  /* ═════════ 5. build reproductible ═════════ */
  console.log("\n【5】 Build reproductible");

  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  check(pkg.scripts?.postinstall === "prisma generate", "`postinstall` régénère le client Prisma");
  check(/prisma generate/.test(pkg.scripts?.build ?? ""),
    "`build` régénère aussi le client (le cache de Vercel saute `postinstall`)");
  check(Boolean(pkg.engines?.node), `le moteur Node est déclaré : ${pkg.engines?.node ?? "—"}`);
  check(/VERCEL/.test(conf), "`NEXT_DIST_DIR` est neutralisé sur Vercel");

  const gi = readFileSync(".gitignore", "utf8");
  check(/\/src\/generated\/prisma/.test(gi), "le client Prisma n'est pas versionné (il est régénéré)");

  /* ═════════ 6. tâche planifiée ═════════ */
  console.log("\n【6】 Tâche planifiée");

  const cron = readFileSync("src/app/api/cron/overdue/route.ts", "utf8");
  check(/export async function GET/.test(cron), "`GET` existe — Vercel Cron appelle en GET");
  check(/export async function POST/.test(cron), "`POST` existe aussi");
  check(/timingSafeEqual/.test(cron), "le secret est comparé à durée constante");
  check(/if \(!secret\)/.test(cron), "échec fermé si le secret est absent de l'environnement");
  check(existsSync("vercel.json") && /cron/i.test(readFileSync("vercel.json", "utf8")),
    "la tâche est déclarée dans vercel.json");

  /* ═════════ 7. ce qu'aucun dépôt ne peut prouver ═════════ */
  console.log("\n【7】 Hors de portée d'un vérificateur de dépôt");

  nonProuve("le projet Supabase de production", "il n'existe pas encore — création par le propriétaire");
  nonProuve("les sauvegardes et leur restauration", "aucune sauvegarde constatée, aucune restauration essayée");
  nonProuve("l'envoi réel d'e-mails", "aucun SMTP de production configuré");
  nonProuve("le domaine et HTTPS", "le domaine n'est pas choisi");
  nonProuve("« bon secret → 200 » sur la tâche planifiée", "le prouver basculerait une vraie facture");
}

try { main(); } catch (e) {
  fail(`le vérificateur s'est interrompu : ${e instanceof Error ? e.message : String(e)}`);
}
console.log(`\n${"═".repeat(74)}`);
console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoué(s) — ${unproven} NON PROUVÉ(S)`);
console.log("═".repeat(74));
process.exit(failures ? 1 : 0);
