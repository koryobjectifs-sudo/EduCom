/**
 * Durcissement RLS / Storage — essai à blanc par défaut, `APPLY=1` pour écrire.
 *
 *   npm run script -- scripts/harden-rls.ts            # montre, n'écrit rien
 *   APPLY=1 npm run script -- scripts/harden-rls.ts    # applique
 *
 * ═══ CE QUE CE SCRIPT NE FAIT PAS, ET POURQUOI ═══
 *
 * ⚠️ **Il n'ajoute AUCUNE policy.** L'application ne passe jamais par PostgREST
 * ni par le Storage client : tout transite par Prisma (rôle `postgres`) et par
 * la clé de service, côté serveur. Les 34 tables de `public` ont donc RLS actif
 * et **zéro policy** — c'est-à-dire un refus total pour `anon` comme pour
 * `authenticated`. Ajouter des policies « par école » ne renforcerait rien :
 * cela **ouvrirait** un accès aujourd'hui fermé. Le durcissement juste consiste
 * à retirer des droits, pas à en accorder.
 *
 * ⚠️ **Il ne touche pas `storage.objects`.** RLS y est actif avec zéro policy —
 * même refus total, vérifié par de vraies requêtes HTTP. Retirer en plus les
 * droits de table du rôle `authenticated` risquerait de gêner le service
 * Storage lui-même, qui applique les rôles JWT pour évaluer RLS. Bénéfice nul,
 * risque réel : on s'abstient, et on le dit.
 *
 * ⚠️ **Aucun `FORCE ROW LEVEL SECURITY`.** Un rôle portant `BYPASSRLS` — c'est
 * le cas de `postgres`, celui de Prisma — passe outre de toute façon. Ce serait
 * une protection décorative.
 *
 * ═══ CE QU'IL FAIT ═══
 *
 * `anon` et `authenticated` détiennent SELECT/INSERT/UPDATE/DELETE/TRUNCATE sur
 * les 34 tables. Aujourd'hui RLS les neutralise — mais RLS est alors **la seule
 * barrière**. Un `ALTER TABLE … DISABLE ROW LEVEL SECURITY` malheureux, ou une
 * policy trop permissive, ouvrirait instantanément toute la base à une clé
 * publique lisible dans le navigateur. On retire donc les droits eux-mêmes, et
 * on corrige les droits par défaut pour que les futures tables créées par
 * `prisma db push` n'en reçoivent pas non plus.
 *
 * Deux verrous valent mieux qu'un, surtout quand le premier peut être désactivé
 * d'un clic dans une interface.
 */
import { Client } from "pg";
import { mkdirSync, writeFileSync } from "node:fs";

const APPLY = process.env.APPLY === "1";

/** ⚠️ Aucune instruction destructive n'est admise dans ce script. */
const FORBIDDEN = /\b(drop|truncate|delete\s+from|alter\s+table\s+\S+\s+disable\s+row)\b/i;

const STATEMENTS: { sql: string; why: string }[] = [
  {
    sql: `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated`,
    why: "les rôles PostgREST n'ont aucune raison de lire ou d'écrire ces tables : l'application n'utilise pas PostgREST.",
  },
  {
    sql: `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated`,
    why: "une séquence lisible renseigne sur les volumes ; inutile ici.",
  },
  {
    sql: `REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated`,
    why: "aucune fonction de `public` n'est destinée à être appelée depuis le navigateur.",
  },
  {
    sql: `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated`,
    why: "sans cela, la PROCHAINE table créée par `prisma db push` recevrait à nouveau tous les droits.",
  },
  {
    sql: `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated`,
    why: "idem pour les séquences.",
  },
  {
    sql: `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated`,
    why: "idem pour les fonctions.",
  },
];

/** Rollback exact, à conserver : ce qui est retiré ici se rend par ces ordres. */
export const ROLLBACK = [
  `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated`,
  `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated`,
  `GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated`,
  `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated`,
  `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated`,
  `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated`,
];

async function state(c: Client) {
  const grants = (await c.query(`
    select grantee, count(distinct table_name)::int as tables, count(*)::int as privileges
    from information_schema.role_table_grants
    where table_schema='public' and grantee in ('anon','authenticated')
    group by grantee order by grantee`)).rows;
  const rls = (await c.query(`
    select count(*) filter (where c.relrowsecurity)::int as avec_rls,
           count(*)::int as total
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'`)).rows[0];
  const policies = (await c.query(`select count(*)::int as n from pg_policies where schemaname='public'`)).rows[0];
  const defacl = (await c.query(`
    select defaclacl::text as acl from pg_default_acl a
    join pg_namespace n on n.oid=a.defaclnamespace
    where n.nspname='public' and defaclobjtype='r' and pg_get_userbyid(defaclrole)='postgres'`)).rows[0];
  const rows = (await c.query(`
    select (select count(*)::int from "Student") as students,
           (select count(*)::int from "User") as users,
           (select count(*)::int from "StudentDocument") as pieces,
           (select count(*)::int from "AuditLog") as audit`)).rows[0];
  return { grants, rls, policies: policies.n, defacl: defacl?.acl ?? "(aucun)", rows };
}

function show(label: string, s: Awaited<ReturnType<typeof state>>) {
  console.log(`\n  ── ${label} ──`);
  console.log(`  RLS actif           : ${s.rls.avec_rls}/${s.rls.total} tables`);
  console.log(`  policies dans public: ${s.policies}`);
  console.log(`  droits anon/auth    : ${s.grants.length === 0 ? "AUCUN" : s.grants.map((g) => `${g.grantee}=${g.tables} tables / ${g.privileges} droits`).join("  ·  ")}`);
  console.log(`  droits par défaut   : ${s.defacl}`);
  console.log(`  lignes (contrôle)   : élèves=${s.rows.students} comptes=${s.rows.users} pièces=${s.rows.pieces} audit=${s.rows.audit}`);
}

async function main() {
  for (const st of STATEMENTS) {
    if (FORBIDDEN.test(st.sql)) throw new Error(`Instruction destructive refusée : ${st.sql}`);
  }

  const c = new Client({ connectionString: process.env.DIRECT_URL });
  await c.connect();

  console.log("═".repeat(74));
  console.log(`  DURCISSEMENT RLS / STORAGE — ${APPLY ? "APPLICATION RÉELLE" : "ESSAI À BLANC (APPLY=1 pour écrire)"}`);
  console.log("═".repeat(74));

  const before = await state(c);
  show("AVANT", before);

  console.log("\n  ── INSTRUCTIONS ──");
  for (const st of STATEMENTS) console.log(`  ${st.sql};\n      → ${st.why}`);

  if (!APPLY) {
    console.log("\n  Rien n'a été écrit. Relancer avec APPLY=1.");
    await c.end();
    return;
  }

  // ⚠️ Règle 4 d'`AGENTS.md` : sauvegarde avant écriture. Ici la « donnée »
  // sauvegardée est l'état exact des droits — c'est ce que la commande retire,
  // et donc ce qu'il faudrait pouvoir restituer à l'identique.
  const snapshot = (await c.query(`
    select grantee, table_name, privilege_type
    from information_schema.role_table_grants
    where table_schema='public' and grantee in ('anon','authenticated')
    order by grantee, table_name, privilege_type`)).rows;
  mkdirSync("backups", { recursive: true });
  const backup = `backups/grants-public-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(backup, JSON.stringify({ takenAt: new Date().toISOString(), before, grants: snapshot, rollback: ROLLBACK }, null, 2));
  console.log(`\n  ✓ sauvegarde des droits écrite : ${backup} (${snapshot.length} lignes)`);

  await c.query("begin");
  try {
    for (const st of STATEMENTS) await c.query(st.sql);
    await c.query("commit");
  } catch (e) {
    await c.query("rollback");
    console.error("\n  ✗ échec, transaction annulée :", e instanceof Error ? e.message : String(e));
    await c.end();
    process.exit(1);
  }

  const after = await state(c);
  show("APRÈS", after);

  const unchanged =
    before.rows.students === after.rows.students &&
    before.rows.users === after.rows.users &&
    before.rows.pieces === after.rows.pieces;
  console.log(`\n  ${unchanged ? "✓" : "✗"} aucune donnée touchée (comptages identiques avant/après)`);
  console.log(`  ${after.rls.avec_rls === after.rls.total ? "✓" : "✗"} RLS toujours actif partout`);
  console.log(`  ${after.grants.length === 0 ? "✓" : "✗"} plus aucun droit pour anon / authenticated dans public`);

  console.log("\n  ── ROLLBACK, si nécessaire ──");
  for (const r of ROLLBACK) console.log(`  ${r};`);

  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
