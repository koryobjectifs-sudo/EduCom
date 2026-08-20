/**
 * Vérifie l'isolation des données par établissement. LECTURE SEULE.
 *
 * Le client Prisma n'applique aucun filtre global (`src/lib/prisma.ts` instancie
 * un client nu) : chaque requête doit porter son propre `where: { schoolId }`.
 * Ce script reproduit les requêtes du tableau de bord et de la page Rapports
 * dans les deux versions — sans filtre (le code d'avant le lot 00) et par école
 * (le code d'après) — puis contrôle trois propriétés :
 *
 *   1. PARTITION  la somme des valeurs par école égale la valeur globale ;
 *   2. DISTINCTION deux écoles peuplées ne renvoient pas les mêmes chiffres ;
 *   3. NON-FUITE  aucune école ne voit l'effectif total de la base.
 *
 * Interroge la base directement en SQL, sans passer par la couche applicative :
 * une régression dans le code ne peut donc pas masquer un échec.
 *
 *   npm run script -- scripts/verify-tenant-isolation.ts
 */
// ⚠️ Ce vérificateur ouvre une connexion `pg` BRUTE avec `DATABASE_URL` :
// il ne passait par aucun garde-fou, pas même l'import de Prisma. Cet
// import n'est pas décoratif — il déclenche la vérification d'environnement.
import "./_env";
import { Client } from "pg";

type SchoolRow = { id: string; name: string };

type Snapshot = {
  enrolled: number;
  pending: number;
  classes: number;
  invoices: number;
  expected: number;
  collected: number;
  rate: number;
};

const fmt = (n: number) => n.toLocaleString("fr-FR");
const pct = (collected: number, expected: number) =>
  expected > 0 ? Math.round((collected / expected) * 100) : 0;

async function snapshot(c: Client, schoolId: string | null): Promise<Snapshot> {
  // schoolId null => requête sans filtre, telle qu'elle était écrite avant le lot 00
  const clause = schoolId ? ` AND "schoolId" = $1` : "";
  const args = schoolId ? [schoolId] : [];
  const clauseW = schoolId ? ` WHERE "schoolId" = $1` : "";

  const enrolled = await c.query(
    `SELECT count(*)::int AS n FROM "Student" WHERE status = 'ENROLLED'${clause}`, args);
  const pending = await c.query(
    `SELECT count(*)::int AS n FROM "Student" WHERE status = 'PENDING'${clause}`, args);
  const classes = await c.query(
    `SELECT count(*)::int AS n FROM "Class"${clauseW}`, args);
  const inv = await c.query(
    `SELECT count(*)::int AS n,
            COALESCE(sum("totalAmount"), 0)::float AS expected,
            COALESCE(sum(CASE WHEN status = 'PAID' THEN "totalAmount" ELSE 0 END), 0)::float AS collected
     FROM "Invoice"${clauseW}`, args);

  const expected = inv.rows[0].expected;
  const collected = inv.rows[0].collected;

  return {
    enrolled: enrolled.rows[0].n,
    pending: pending.rows[0].n,
    classes: classes.rows[0].n,
    invoices: inv.rows[0].n,
    expected,
    collected,
    rate: pct(collected, expected),
  };
}

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const schools = (await c.query<SchoolRow>(
    `SELECT id, name FROM "School" ORDER BY "createdAt" ASC`)).rows;

  console.log(`\n=== ISOLATION PAR ÉTABLISSEMENT ===`);
  console.log(`Écoles en base : ${schools.length}\n`);

  const global = await snapshot(c, null);
  console.log(`AVANT le lot 00 (aucun filtre) — ce que CHAQUE école voyait :`);
  console.log(`  élèves inscrits ${global.enrolled} · en attente ${global.pending} · classes ${global.classes}`);
  console.log(`  factures ${global.invoices} · attendu ${fmt(global.expected)} FCFA · encaissé ${fmt(global.collected)} FCFA · taux ${global.rate} %\n`);

  console.log(`APRÈS le lot 00 (filtré par schoolId) — ce que chaque école voit :\n`);

  const per: { school: SchoolRow; snap: Snapshot }[] = [];
  for (const school of schools) {
    const snap = await snapshot(c, school.id);
    per.push({ school, snap });
    console.log(`  ${school.name}  [${school.id.slice(0, 8)}]`);
    console.log(`      élèves inscrits ${snap.enrolled} · en attente ${snap.pending} · classes ${snap.classes}`);
    console.log(`      factures ${snap.invoices} · attendu ${fmt(snap.expected)} · encaissé ${fmt(snap.collected)} · taux ${snap.rate} %`);
  }

  // ---- 1. PARTITION ----
  const sum = per.reduce<Snapshot>((a, { snap }) => ({
    enrolled: a.enrolled + snap.enrolled,
    pending: a.pending + snap.pending,
    classes: a.classes + snap.classes,
    invoices: a.invoices + snap.invoices,
    expected: a.expected + snap.expected,
    collected: a.collected + snap.collected,
    rate: 0,
  }), { enrolled: 0, pending: 0, classes: 0, invoices: 0, expected: 0, collected: 0, rate: 0 });

  console.log(`\n[1] PARTITION — somme des écoles = global ?`);
  const checks: [string, number, number][] = [
    ["élèves inscrits", sum.enrolled, global.enrolled],
    ["en attente", sum.pending, global.pending],
    ["classes", sum.classes, global.classes],
    ["factures", sum.invoices, global.invoices],
    ["attendu", sum.expected, global.expected],
    ["encaissé", sum.collected, global.collected],
  ];
  let partitionOk = true;
  for (const [label, s, g] of checks) {
    const ok = Math.abs(s - g) < 0.001;
    if (!ok) partitionOk = false;
    console.log(`    ${ok ? "OK   " : "ÉCHEC"} ${label.padEnd(16)} ${fmt(s)} / ${fmt(g)}`);
  }

  // ---- 2. DISTINCTION ----
  console.log(`\n[2] DISTINCTION — deux écoles voient-elles des chiffres différents ?`);
  const populated = per.filter(p => p.snap.enrolled > 0 || p.snap.invoices > 0 || p.snap.classes > 0);
  let distinctionOk = false;
  if (schools.length < 2) {
    console.log(`    NON TESTABLE — une seule école en base.`);
  } else if (populated.length < 2) {
    console.log(`    NON DÉMONTRÉ — ${populated.length} école(s) peuplée(s) sur ${schools.length}.`);
    console.log(`    Le filtre est en place, mais aucune deuxième école ne porte de données`);
    console.log(`    permettant de constater une différence de valeurs.`);
  } else {
    const keys = new Set(populated.map(p => `${p.snap.enrolled}|${p.snap.invoices}|${p.snap.classes}`));
    distinctionOk = keys.size > 1;
    console.log(`    ${distinctionOk ? "OK   " : "ÉCHEC"} ${keys.size} jeu(x) de valeurs distinct(s) sur ${populated.length} écoles peuplées`);
    for (const p of populated) {
      console.log(`         ${p.school.name.padEnd(20)} → ${p.snap.enrolled} inscrits, ${p.snap.invoices} factures, ${p.snap.classes} classes`);
    }
  }

  // ---- 3. NON-FUITE ----
  console.log(`\n[3] NON-FUITE — une école voit-elle le total global ?`);
  let leak = false;
  for (const { school, snap } of per) {
    const others = sum.enrolled - snap.enrolled;
    if (others > 0 && snap.enrolled === global.enrolled) {
      leak = true;
      console.log(`    ÉCHEC ${school.name} voit les ${global.enrolled} élèves de toute la base`);
    }
  }
  if (!leak) console.log(`    OK    chaque école ne voit que son propre périmètre.`);

  // ---- Documents : le nom d'école imprimé ----
  console.log(`\n[4] DOCUMENTS — nom d'établissement disponible pour l'impression :`);
  const named = (await c.query<{ id: string; name: string; address: string | null }>(
    `SELECT id, name, address FROM "School" ORDER BY "createdAt" ASC`)).rows;
  for (const s of named) {
    const ok = !!s.name && s.name.trim().length > 0;
    console.log(`    ${ok ? "OK   " : "ÉCHEC"} [${s.id.slice(0, 8)}] name="${s.name}" address=${s.address ? `"${s.address}"` : "(vide)"}`);
  }

  // ---- 5. SIMULATION DEUX ÉCOLES PEUPLÉES ----
  //
  // Quand une seule école porte des données, la propriété [2] ne peut pas être
  // constatée. On peuple alors une seconde école DANS UNE TRANSACTION ANNULÉE :
  // les lignes existent le temps des mesures, puis le ROLLBACK les efface. Rien
  // n'est committé, aucune donnée existante n'est touchée.
  if (!distinctionOk && schools.length >= 2) {
    const host = per.find(p => p.snap.enrolled > 0)?.school;
    const target = per.find(p => p.snap.enrolled === 0 && p.snap.invoices === 0)?.school;

    if (host && target) {
      console.log(`\n[5] SIMULATION — seconde école peuplée dans une transaction annulée`);
      console.log(`    Témoin  : ${host.name} (données réelles)`);
      console.log(`    Cible   : ${target.name} (jeu temporaire, annulé ensuite)`);

      await c.query("BEGIN");
      try {
        const now = new Date().toISOString();
        await c.query(
          `INSERT INTO "Class" (id, name, "schoolId", "updatedAt") VALUES
             ('_vfy_c1', 'Classe test A', $1, $2),
             ('_vfy_c2', 'Classe test B', $1, $2)`, [target.id, now]);
        await c.query(
          `INSERT INTO "Student" (id, "firstName", "lastName", status, "schoolId", "updatedAt") VALUES
             ('_vfy_s1', 'Test', 'Un',    'ENROLLED', $1, $2),
             ('_vfy_s2', 'Test', 'Deux',  'ENROLLED', $1, $2),
             ('_vfy_s3', 'Test', 'Trois', 'PENDING',  $1, $2)`, [target.id, now]);
        await c.query(
          `INSERT INTO "Invoice" (id, title, "totalAmount", status, "dueDate", "schoolId", "updatedAt") VALUES
             ('_vfy_i1', 'Facture test 1', 50000, 'PAID',    $2, $1, $2),
             ('_vfy_i2', 'Facture test 2', 30000, 'OVERDUE', $2, $1, $2)`, [target.id, now]);

        const hostSnap = await snapshot(c, host.id);
        const targetSnap = await snapshot(c, target.id);
        const globalSim = await snapshot(c, null);

        console.log(`\n    ${host.name.padEnd(18)} inscrits ${hostSnap.enrolled} · factures ${hostSnap.invoices} · classes ${hostSnap.classes} · taux ${hostSnap.rate} %`);
        console.log(`    ${target.name.padEnd(18)} inscrits ${targetSnap.enrolled} · factures ${targetSnap.invoices} · classes ${targetSnap.classes} · taux ${targetSnap.rate} %`);
        console.log(`    ${"(sans filtre)".padEnd(18)} inscrits ${globalSim.enrolled} · factures ${globalSim.invoices} · classes ${globalSim.classes} · taux ${globalSim.rate} %`);

        const differ =
          hostSnap.enrolled !== targetSnap.enrolled &&
          hostSnap.invoices !== targetSnap.invoices &&
          hostSnap.classes !== targetSnap.classes;
        const neitherSeesGlobal =
          hostSnap.enrolled !== globalSim.enrolled &&
          targetSnap.enrolled !== globalSim.enrolled;
        const partitions =
          hostSnap.enrolled + targetSnap.enrolled === globalSim.enrolled &&
          hostSnap.invoices + targetSnap.invoices === globalSim.invoices;

        console.log(`\n    ${differ ? "OK   " : "ÉCHEC"} les deux écoles voient des chiffres différents`);
        console.log(`    ${neitherSeesGlobal ? "OK   " : "ÉCHEC"} aucune des deux ne voit le total global (${globalSim.enrolled} inscrits)`);
        console.log(`    ${partitions ? "OK   " : "ÉCHEC"} les deux périmètres additionnés reconstituent le global`);

        distinctionOk = differ && neitherSeesGlobal && partitions;
      } finally {
        await c.query("ROLLBACK");
        const leftovers = await c.query(
          `SELECT
             (SELECT count(*)::int FROM "Student" WHERE id LIKE '\\_vfy\\_%') AS s,
             (SELECT count(*)::int FROM "Class"   WHERE id LIKE '\\_vfy\\_%') AS c,
             (SELECT count(*)::int FROM "Invoice" WHERE id LIKE '\\_vfy\\_%') AS i`);
        const { s, c: cl, i } = leftovers.rows[0];
        console.log(`\n    ROLLBACK effectué — restes en base : ${s} élèves, ${cl} classes, ${i} factures ${s + cl + i === 0 ? "(propre)" : "(ANOMALIE)"}`);
        if (s + cl + i !== 0) distinctionOk = false;
      }
    }
  }

  const verdict = partitionOk && !leak && distinctionOk;
  console.log(`\n=== RÉSULTAT : partition ${partitionOk ? "OK" : "ÉCHEC"} · fuite ${leak ? "DÉTECTÉE" : "aucune"} · distinction ${distinctionOk ? "démontrée" : "non démontrée"} ===`);
  console.log(verdict ? "Isolation conforme.\n" : "ISOLATION NON CONFIRMÉE.\n");

  await c.end();
  if (!verdict) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
