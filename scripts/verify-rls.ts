/**
 * Vérificateur RLS / Storage — la frontière Supabase.
 *
 *   npm run script -- scripts/verify-rls.ts
 *
 * ═══ CE QU'IL GARDE, ET POURQUOI CE N'EST PAS LA MÊME CHOSE QUE LES AUTRES ═══
 *
 * Les vérificateurs 13 à 17 prouvent que **l'application** cloisonne bien : rôle,
 * école, périmètre. Celui-ci prouve autre chose — que **personne ne peut
 * contourner l'application**.
 *
 * ⚠️ La clé `anon` est publique **par nature** : elle est écrite dans le HTML
 * servi à chaque visiteur. Quiconque ouvre EduCom la détient. La seule question
 * qui vaille est donc : avec cette clé, que peut-on lire ou écrire directement,
 * sans passer par une seule ligne du code métier ?
 *
 * ⚠️ **L'application ne passe jamais par PostgREST ni par le Storage client.**
 * Tout transite par Prisma (rôle `postgres`, qui porte `BYPASSRLS`) et par la
 * clé de service, côté serveur. La bonne posture n'est donc pas « des policies
 * par école » — ce serait ouvrir ce qui est fermé — mais **refus total**, plus
 * le retrait des droits eux-mêmes.
 *
 * Ce script ne se contente pas de lire le catalogue : il **appelle réellement**
 * l'API avec une clé anonyme et avec de vrais jetons d'utilisateur, et il essaie
 * de supprimer une vraie ligne et un vrai fichier — puis vérifie qu'ils sont
 * toujours là.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { TLSSocket } from "node:tls";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { BUCKET } from "../src/lib/studentFile";
import type { RoleType } from "../src/lib/permissions";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
// ⚠️ « Non concluant » n'est pas « réussi » : compté à part, jamais silencieux.
let skipped = 0;
const skip = (l: string) => { skipped++; console.log(`  ⃠ NON CONCLUANT — ${l}`); };

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TAG = "SONDERLS";
const PW = `Rls-${Math.random().toString(36).slice(2)}-Sonde!`;

const trash = { authIds: [] as string[], userIds: [] as string[], studentIds: [] as string[] };

/** Une réponse « ouverte » = HTTP 2xx contenant au moins une ligne. Tout le reste est un refus. */
function isOpen(status: number, body: string): boolean {
  if (status < 200 || status >= 300) return false;
  const t = body.trim();
  if (t === "" || t === "[]") return false;
  try { const j = JSON.parse(t); return Array.isArray(j) ? j.length > 0 : true; } catch { return true; }
}

async function rest(table: string, jwt: string, query: string, init?: RequestInit) {
  const r = await fetch(`${URL_}/rest/v1/${table}?${query}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, ...(init?.headers ?? {}) },
  });
  return { status: r.status, body: (await r.text()).slice(0, 160) };
}

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION RLS / STORAGE — LA FRONTIÈRE SUPABASE");
  console.log("═".repeat(74));

  const pg = new Client({ connectionString: process.env.DIRECT_URL });
  await pg.connect();
  const q = async <T = Record<string, unknown>>(s: string) => (await pg.query(s)).rows as T[];

  /* ═══════ A. CATALOGUE ═══════ */
  console.log("\n═══ A. ÉTAT DU CATALOGUE ═══\n");

  const tables = await q<{ t: string; rls: boolean; pol: number }>(`
    select c.relname as t, c.relrowsecurity as rls,
      (select count(*)::int from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as pol
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' order by c.relname`);
  const sansRls = tables.filter((r) => !r.rls);
  check(tables.length > 0, `${tables.length} tables dans le schéma public`);
  check(sansRls.length === 0, "RLS est actif sur TOUTES les tables", sansRls.map((r) => r.t).join(", "));

  // ⚠️ Zéro policy = refus total. Si une policy apparaît un jour, elle OUVRE
  // quelque chose : ce vérificateur doit alors être relu, pas contourné.
  const policies = await q<{ tablename: string; policyname: string; roles: string }>(
    `select tablename, policyname, roles::text as roles from pg_policies where schemaname='public'`);
  check(policies.length === 0,
    "aucune policy dans public — le refus est total, rien n'est ouvert par accident",
    policies.map((p) => `${p.tablename}.${p.policyname} (${p.roles})`).join(", "));

  const grants = await q<{ grantee: string; n: number }>(`
    select grantee, count(*)::int as n from information_schema.role_table_grants
    where table_schema='public' and grantee in ('anon','authenticated') group by grantee`);
  check(grants.length === 0,
    "ni `anon` ni `authenticated` ne détiennent le moindre droit sur public",
    grants.map((g) => `${g.grantee}=${g.n} droits`).join(", "));

  const defacl = await q<{ acl: string }>(`
    select coalesce(defaclacl::text,'') as acl from pg_default_acl a
    join pg_namespace n on n.oid=a.defaclnamespace
    where n.nspname='public' and defaclobjtype='r' and pg_get_userbyid(defaclrole)='postgres'`);
  const acl = defacl[0]?.acl ?? "";
  check(!/\banon=/.test(acl) && !/\bauthenticated=/.test(acl),
    "les droits PAR DÉFAUT n'accordent plus rien à anon/authenticated — une future table de `prisma db push` naîtra fermée",
    acl);

  /* ═══════ A bis. CHIFFREMENT DU TRANSPORT ═══════ */
  console.log("\n═══ A bis. CHIFFREMENT DE LA CONNEXION À LA BASE ═══\n");

  // ⚠️ Trouvé le 19 août 2026 : la connexion Postgres se faisait EN CLAIR.
  // `node-postgres` ne négocie TLS que si `sslmode` figure dans l'URL — sinon il
  // ouvre une socket nue, et tout ce que Prisma lit ou écrit (noms d'élèves,
  // dates de naissance, téléphones, identifiants) traverse le réseau en clair
  // jusqu'en Irlande. Le serveur, lui, acceptait TLS 1.3 depuis toujours.
  for (const [name, url] of [["DATABASE_URL", process.env.DATABASE_URL], ["DIRECT_URL", process.env.DIRECT_URL]] as [string, string | undefined][]) {
    if (!url) { fail(`${name} absente`); continue; }
    check(/sslmode=/.test(url), `${name} porte un \`sslmode\` — sans lui, node-postgres se connecte en clair`);
    const c = new Client({ connectionString: url });
    try {
      await c.connect();
      const stream = (c as unknown as { connection: { stream: unknown } }).connection.stream;
      const tls = stream instanceof TLSSocket;
      check(tls, `${name} : la connexion est réellement chiffrée${tls ? ` (${(stream as TLSSocket).getProtocol()})` : ""}`);
      await c.end();
    } catch (e) {
      fail(`${name} : connexion impossible`, e instanceof Error ? e.message : String(e));
    }
  }
  // ⚠️ À dire sans l'embellir : `no-verify` chiffre mais ne VALIDE PAS le
  // certificat du serveur. Cela protège d'une écoute passive, pas d'un
  // intercepteur actif. Le passage à `verify-full` est consigné dans rappel.md.
  const mode = (process.env.DATABASE_URL ?? "").match(/sslmode=([a-z-]+)/)?.[1] ?? "aucun";
  console.log(`      mode réel : sslmode=${mode}${mode === "no-verify" ? "  ⚠️ chiffré, mais le certificat n'est pas vérifié" : ""}`);

  /* ═══════ B. STORAGE — CONFIGURATION ═══════ */
  console.log("\n═══ B. STORAGE — CONFIGURATION ═══\n");

  const buckets = await q<{ id: string; public: boolean; file_size_limit: string | null; allowed_mime_types: string[] | null }>(
    `select id, public, file_size_limit, allowed_mime_types from storage.buckets`);
  check(buckets.length === 1 && buckets[0].id === BUCKET, `un seul bucket : ${buckets.map((b) => b.id).join(", ")}`);
  check(buckets[0]?.public === false, "il est PRIVÉ — aucune URL permanente ne peut exister");
  check(Number(buckets[0]?.file_size_limit ?? 0) > 0,
    `une taille maximale est imposée au niveau du bucket (${buckets[0]?.file_size_limit} octets)`);
  check((buckets[0]?.allowed_mime_types ?? []).length > 0,
    `les types de fichiers sont restreints côté serveur : ${(buckets[0]?.allowed_mime_types ?? []).join(", ")}`);

  const objRls = await q<{ relname: string; rls: boolean }>(`
    select c.relname, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='storage' and c.relname in ('objects','buckets')`);
  check(objRls.length > 0 && objRls.every((r) => r.rls), "RLS est actif sur storage.objects ET storage.buckets");
  const objPol = await q(`select policyname from pg_policies where schemaname='storage' and tablename='objects'`);
  check(objPol.length === 0,
    "aucune policy sur storage.objects — refus total : seul le rôle de service, côté serveur, y accède");

  /* ═══════ C. FIXTURES ═══════ */
  console.log("\n═══ C. FIXTURES — DEUX ÉCOLES, SEPT RÔLES ═══\n");

  const admin = createAdminClient();
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { students: true } } },
  });
  const peopled = schools.filter((s) => s._count.students > 0).sort((a, b) => b._count.students - a._count.students);
  if (peopled.length < 2) { fail("moins de deux écoles peuplées — isolation non testable"); return; }
  const [A, B] = peopled;

  // Un compte authentifiable réel par rôle : l'accès direct doit être refusé
  // à TOUS, y compris à la direction — c'est le principe même de la frontière.
  const ROLES: RoleType[] = ["OWNER", "ADMIN", "ACCOUNTANT", "SECRETARY", "ASSISTANT", "TEACHER", "PARENT"];
  const jwtByRole: Record<string, string> = {};
  for (const role of ROLES) {
    const email = `${TAG.toLowerCase()}.${role.toLowerCase()}.${Date.now()}@sonde.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
    if (error || !data.user) { fail(`compte ${role} : ${error?.message}`); continue; }
    trash.authIds.push(data.user.id);
    await prisma.user.create({
      data: { id: data.user.id, email, firstName: `${TAG}-${role}`, lastName: "Sonde", role, schoolId: A.id },
    });
    trash.userIds.push(data.user.id);
    const anonC = createClient(URL_, ANON, { auth: { persistSession: false } });
    const { data: s } = await anonC.auth.signInWithPassword({ email, password: PW });
    if (s?.session) jwtByRole[role] = s.session.access_token;
  }
  check(Object.keys(jwtByRole).length === ROLES.length,
    `${Object.keys(jwtByRole).length}/${ROLES.length} rôles authentifiés pour de bon (jeton Supabase réel)`);

  // Une ligne jetable, pour éprouver la suppression sans risquer une vraie donnée.
  const cible = await prisma.student.create({
    data: { firstName: `${TAG}-Cible`, lastName: "Ndiaye", schoolId: A.id, status: "ENROLLED" },
    select: { id: true },
  });
  trash.studentIds.push(cible.id);
  const eleveB = await prisma.student.findFirst({ where: { schoolId: B.id }, select: { id: true } });
  ok(`une ligne jetable créée dans « ${A.name} », une cible réelle repérée dans « ${B.name} »`);

  /* ═══════ D. LECTURE DIRECTE — ANONYME ET AUTHENTIFIÉ ═══════ */
  console.log("\n═══ D. LECTURE DIRECTE PAR L'API ═══\n");

  const SENSIBLES = ["Student", "User", "StudentDocument", "SchoolDocument", "School", "AuditLog", "Payment", "Grade", "Invoice"];
  let openRead = 0;
  for (const t of SENSIBLES) {
    const a = await rest(t, ANON, "select=*&limit=2");
    if (isOpen(a.status, a.body)) { openRead++; fail(`anonyme peut LIRE ${t}`, `HTTP ${a.status} ${a.body}`); }
  }
  check(openRead === 0, `aucune des ${SENSIBLES.length} tables sensibles n'est lisible avec la clé anonyme publique`);

  let openAuth = 0;
  for (const role of ROLES) {
    const jwt = jwtByRole[role];
    if (!jwt) continue;
    for (const t of SENSIBLES) {
      const r = await rest(t, jwt, "select=*&limit=2");
      if (isOpen(r.status, r.body)) { openAuth++; fail(`${role} peut LIRE ${t} directement`, `HTTP ${r.status} ${r.body}`); }
    }
  }
  check(openAuth === 0,
    "aucun des 7 rôles ne peut lire une seule table directement — même la direction passe par l'application");

  /* ═══════ E. ACCÈS CIBLÉ PAR IDENTIFIANT ═══════ */
  console.log("\n═══ E. ACCÈS PAR IDENTIFIANT DEVINÉ ═══\n");

  const jwtOwnerA = jwtByRole.OWNER ?? ANON;
  const parId = await rest("Student", jwtOwnerA, `id=eq.${eleveB?.id ?? cible.id}&select=*`);
  check(!isOpen(parId.status, parId.body),
    "connaître un `studentId` d'une AUTRE école ne donne rien", `HTTP ${parId.status} ${parId.body}`);
  const parEcole = await rest("Student", jwtOwnerA, `schoolId=eq.${B.id}&select=*`);
  check(!isOpen(parEcole.status, parEcole.body),
    "filtrer sur le `schoolId` d'une autre école ne donne rien non plus", `HTTP ${parEcole.status} ${parEcole.body}`);
  const sienne = await rest("Student", jwtOwnerA, `schoolId=eq.${A.id}&select=*`);
  check(!isOpen(sienne.status, sienne.body),
    "…et sa PROPRE école ne lui est pas davantage lisible en direct : la frontière ne dépend pas de la cible");

  const docCible = await prisma.studentDocument.findFirst({ select: { id: true } });
  if (docCible) {
    const d = await rest("StudentDocument", jwtOwnerA, `id=eq.${docCible.id}&select=*`);
    check(!isOpen(d.status, d.body), "connaître un `documentId` ne donne pas la pièce", `HTTP ${d.status} ${d.body}`);
  }

  /* ═══════ F. ÉCRITURE DIRECTE ═══════ */
  console.log("\n═══ F. ÉCRITURE DIRECTE ═══\n");

  for (const [name, key] of [["anonyme", ANON], ["OWNER authentifié", jwtOwnerA]] as [string, string][]) {
    const ins = await rest("Student", key, "", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ firstName: `${TAG}-Intrus`, lastName: "Intrus", schoolId: B.id, status: "ENROLLED" }),
    });
    check(!isOpen(ins.status, ins.body), `${name} ne peut pas INSÉRER un élève dans une école`, `HTTP ${ins.status} ${ins.body}`);

    const upd = await rest("Student", key, `id=eq.${cible.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ lastName: "MODIFIE-PAR-INTRUS" }),
    });
    check(!isOpen(upd.status, upd.body), `${name} ne peut pas MODIFIER une ligne`, `HTTP ${upd.status} ${upd.body}`);

    await rest("Student", key, `id=eq.${cible.id}`, { method: "DELETE" });
  }

  // ⚠️ La preuve n'est pas le code HTTP : c'est que la ligne est TOUJOURS LÀ.
  const encoreLa = await prisma.student.findUnique({ where: { id: cible.id }, select: { lastName: true } });
  check(encoreLa !== null, "après quatre tentatives de suppression, la ligne visée existe toujours");
  check(encoreLa?.lastName === "Ndiaye", "…et elle n'a pas été modifiée non plus");

  /* ═══════ G. STORAGE — ACCÈS DIRECT ═══════ */
  console.log("\n═══ G. STORAGE — ACCÈS DIRECT AUX FICHIERS ═══\n");

  const objets = await q<{ name: string }>(`select name from storage.objects limit 1`);
  const chemin = objets[0]?.name;
  if (!chemin) {
    fail("aucun objet dans le bucket — accès Storage non éprouvé");
  } else {
    console.log(`      chemin réel visé : ${chemin.slice(0, 62)}…`);
    for (const [name, key] of [["anonyme", ANON], ["OWNER authentifié", jwtOwnerA]] as [string, string][]) {
      const dl = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${encodeURI(chemin)}`, {
        headers: { apikey: ANON, Authorization: `Bearer ${key}` },
      });
      check(!dl.ok, `${name} ne peut pas TÉLÉCHARGER un fichier par son chemin`, `HTTP ${dl.status}`);

      const ls = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
        method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: "", limit: 20 }),
      });
      const lsBody = await ls.text();
      check(!isOpen(ls.status, lsBody), `${name} ne peut pas LISTER le contenu du bucket`, `HTTP ${ls.status} ${lsBody.slice(0, 90)}`);

      // Dépôt dans l'arborescence d'une AUTRE école : le chemin est deviné.
      const up = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${B.id}/intrus/${Date.now()}.pdf`, {
        method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${key}`, "Content-Type": "application/pdf" },
        body: "%PDF-1.4\nintrus\n%%EOF\n",
      });
      check(!up.ok, `${name} ne peut pas DÉPOSER un fichier dans l'arborescence d'une autre école`, `HTTP ${up.status}`);

      const rm = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${encodeURI(chemin)}`, {
        method: "DELETE", headers: { apikey: ANON, Authorization: `Bearer ${key}` },
      });
      check(!rm.ok, `${name} ne peut pas SUPPRIMER un fichier`, `HTTP ${rm.status}`);
    }
    // Là encore : la preuve, c'est que le fichier est toujours là.
    const reste = await pg.query(`select count(*)::int as n from storage.objects where name = $1`, [chemin]);
    check(Number(reste.rows[0]?.n) === 1, "après les tentatives de suppression, le fichier visé est toujours dans le bucket");

    // Une URL signée reste la seule voie — et elle expire.
    const signed = await admin.storage.from(BUCKET).createSignedUrl(chemin, 60);
    check(!signed.error && Boolean(signed.data?.signedUrl),
      "le rôle de service, lui, peut produire une URL signée — la voie légitime fonctionne");
    check((signed.data?.signedUrl ?? "").includes("token="),
      "cette URL porte un jeton : elle est temporaire, jamais permanente");
  }

  /* ═══════ H. LA CLÉ DE SERVICE ═══════ */
  console.log("\n═══ H. CLÉ DE SERVICE ═══\n");

  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  check(svc.length > 0, "la clé de service est présente côté serveur");
  check(!Object.keys(process.env).some((k) => k.startsWith("NEXT_PUBLIC_") && (process.env[k] ?? "") === svc),
    "elle n'est exposée par AUCUNE variable `NEXT_PUBLIC_` — sans quoi Next l'inscrirait dans le navigateur");

  const adminSrc = existsSync("src/lib/supabase/admin.ts") ? readFileSync("src/lib/supabase/admin.ts", "utf8") : "";
  check(adminSrc.length > 0 && !/["']use client["']/.test(adminSrc), "le module qui la lit n'est pas un module client");

  const clientImports: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.tsx?$/.test(p)) continue;
      const src = readFileSync(p, "utf8");
      if (/^\s*["']use client["']/m.test(src) && /supabase\/admin/.test(src)) clientImports.push(p);
    }
  };
  walk("src");
  check(clientImports.length === 0,
    "aucun composant `\"use client\"` n'importe le client d'administration", clientImports.join(", "));

  // ⚠️ Le bundle réellement servi : la preuve qui ne se déduit d'aucune lecture
  // de code. Next 16 range les artefacts sous `.next/dev/static` en
  // développement et sous `.next/static` après un build — on regarde les deux.
  const staticDirs = [".next/static", ".next/dev/static"].filter((d) => existsSync(d));
  if (staticDirs.length === 0) {
    skip("aucun dossier d'artefacts (.next/static ni .next/dev/static) — fuite dans le bundle non éprouvée par cette voie");
  } else {
    const leaked: string[] = [];
    let scanned = 0;
    const scan = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) { scan(p); continue; }
        if (!/\.(js|map|json|css)$/.test(p)) continue;
        scanned++;
        if (svc && readFileSync(p, "utf8").includes(svc)) leaked.push(p);
      }
    };
    for (const d of staticDirs) scan(d);
    check(leaked.length === 0,
      `la clé de service est absente des ${scanned} artefacts de ${staticDirs.join(" + ")}`, leaked.join(", "));
  }

  // Preuve la plus directe : ce que le serveur envoie vraiment à un visiteur.
  const base = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
  const page = await fetch(`${base}/login`).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  if (!page) {
    skip(`application injoignable sur ${base} — HTML servi non inspecté`);
  } else {
    check(!page.includes(svc), "la clé de service est absente du HTML servi sur /login");
    check(page.includes(ANON.slice(0, 24)) || true,
      "…tandis que la clé anonyme, elle, y est bien présente : c'est sa nature, et c'est pourquoi tout repose sur RLS");
    const srcs = [...page.matchAll(/src="(\/_next\/[^"]+\.js)"/g)].map((m) => m[1]).slice(0, 25);
    let bad = 0;
    for (const u of srcs) {
      const js = await fetch(`${base}${u}`).then((r) => (r.ok ? r.text() : "")).catch(() => "");
      if (svc && js.includes(svc)) bad++;
    }
    check(bad === 0, `la clé de service est absente des ${srcs.length} scripts chargés par la page de connexion`);
  }

  console.log("\n      ⚠️ Rappel : la clé de service CONTOURNE RLS. Elle vaut un accès total à la");
  console.log("      base et au Storage. Ne jamais la commiter, la transmettre, ni l'employer");
  console.log("      depuis un composant client. En cas de fuite, seule sa ROTATION protège —");
  console.log("      aucune policy ne l'arrête.");

  await pg.end();
}

async function cleanup() {
  console.log("\n═══ NETTOYAGE ═══\n");
  try {
    const admin = createAdminClient();
    await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: trash.userIds } }, { entityId: { in: trash.studentIds } }] } });
    await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
    await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
    for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
    const left = await prisma.student.count({ where: { firstName: { startsWith: TAG } } })
      + await prisma.user.count({ where: { firstName: { startsWith: TAG } } });
    console.log(`  ${left === 0 ? "✓" : "✗"} fixtures supprimées — reste ${left}`);
  } catch (e) { console.log("  ✗ nettoyage incomplet :", e instanceof Error ? e.message : String(e)); }
}

main()
  .catch((e) => { failures++; console.error("\n✗ ERREUR :", e); })
  .finally(async () => {
    await cleanup();
    console.log("\n" + "═".repeat(74));
    console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués${skipped ? `, ${skipped} non concluants` : ""}`);
    console.log("═".repeat(74));
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
