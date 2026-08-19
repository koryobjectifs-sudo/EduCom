/**
 * Fusionne les classes en double vers leur version correctement cyclée.
 *
 * Règle : une seule classe par nom et par cycle. Les classes créées avant
 * l'introduction du cycle éducatif sont restées en `AUTRE` et doublonnent
 * désormais leur équivalent cyclé (5 "CM1", 4 "CP"...).
 *
 * Les inscriptions et les notes rattachées au doublon sont DÉPLACÉES vers la
 * classe canonique avant suppression : `Enrollment.classId` et `Grade.classId`
 * sont en `onDelete: Cascade`, une suppression directe les effacerait.
 *
 *   npx tsx scripts/merge-duplicate-classes.ts        -> essai à blanc
 *   APPLY=1 npx tsx scripts/merge-duplicate-classes.ts -> applique
 */
import { Client } from "pg";
import { writeFileSync } from "fs";

const APPLY = process.env.APPLY === "1";

type ClassRow = {
  id: string;
  name: string;
  cycle: string;
  schoolId: string;
  teacherId: string | null;
};

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  await client.connect();

  console.log(APPLY ? "== MODE RÉEL ==\n" : "== ESSAI À BLANC (aucune écriture) ==\n");

  const { rows: classes } = await client.query<ClassRow>(
    `select id, name, cycle, "schoolId", "teacherId" from "Class" order by name`
  );

  // La classe canonique d'un nom est celle qui porte un vrai cycle.
  // On garde la clé par école : deux établissements peuvent avoir un "CM1".
  const canonical = new Map<string, ClassRow>();
  for (const c of classes) {
    if (c.cycle === "AUTRE") continue;
    const key = `${c.schoolId}::${c.name}`;
    if (canonical.has(key)) {
      console.log(`  ! Doublon inattendu hors AUTRE : ${c.name} [${c.cycle}] — ignoré`);
      continue;
    }
    canonical.set(key, c);
  }

  const duplicates = classes.filter((c) => c.cycle === "AUTRE");

  // Sauvegarde de l'état courant avant toute écriture.
  const backup = await client.query(
    `select e.id, e."studentId", e."classId", e."academicYear" from "Enrollment" e`
  );
  const backupPath = `/tmp/educom-classes-backup-${Date.now()}.json`;
  writeFileSync(backupPath, JSON.stringify({ classes, enrollments: backup.rows }, null, 2));
  console.log(`Sauvegarde écrite : ${backupPath}\n`);

  await client.query("begin");

  let merged = 0;
  let movedEnrollments = 0;
  let movedGrades = 0;
  const orphans: ClassRow[] = [];

  for (const dup of duplicates) {
    const target = canonical.get(`${dup.schoolId}::${dup.name}`);

    if (!target) {
      orphans.push(dup);
      continue;
    }

    const { rows: enr } = await client.query(
      `select count(*)::int as n from "Enrollment" where "classId" = $1`,
      [dup.id]
    );
    const { rows: grd } = await client.query(
      `select count(*)::int as n from "Grade" where "classId" = $1`,
      [dup.id]
    );

    const detail: string[] = [];
    if (enr[0].n) detail.push(`${enr[0].n} inscription(s)`);
    if (grd[0].n) detail.push(`${grd[0].n} note(s)`);
    console.log(
      `  ${dup.name} [AUTRE] -> ${target.name} [${target.cycle}]` +
        (detail.length ? `  (déplace ${detail.join(", ")})` : "  (vide)")
    );

    await client.query(`update "Enrollment" set "classId" = $1 where "classId" = $2`, [
      target.id,
      dup.id,
    ]);
    await client.query(`update "Grade" set "classId" = $1 where "classId" = $2`, [
      target.id,
      dup.id,
    ]);

    // Le professeur principal du doublon n'est pas perdu si la cible n'en a pas.
    if (dup.teacherId && !target.teacherId) {
      await client.query(`update "Class" set "teacherId" = $1 where id = $2`, [
        dup.teacherId,
        target.id,
      ]);
      target.teacherId = dup.teacherId;
      console.log(`      professeur principal repris depuis le doublon`);
    }

    await client.query(`delete from "Class" where id = $1`, [dup.id]);

    merged++;
    movedEnrollments += enr[0].n;
    movedGrades += grd[0].n;
  }

  if (orphans.length) {
    console.log(`\n  Classes en AUTRE sans équivalent cyclé (CONSERVÉES) :`);
    for (const o of orphans) console.log(`    - ${o.name}`);
  }

  const { rows: after } = await client.query(
    `select cycle, count(*)::int as n from "Class" group by cycle order by cycle`
  );

  console.log(`\nRésultat : ${merged} doublon(s) fusionné(s), ${movedEnrollments} inscription(s) et ${movedGrades} note(s) déplacée(s).`);
  console.log("Répartition finale par cycle :");
  for (const r of after) console.log(`  ${r.cycle.padEnd(12)} ${r.n}`);

  if (APPLY) {
    await client.query("commit");
    console.log("\nAppliqué.");
  } else {
    await client.query("rollback");
    console.log("\nEssai à blanc : tout a été annulé. Relance avec APPLY=1 pour appliquer.");
  }

  await client.end();
}

main().catch((e) => {
  console.error("ÉCHEC :", e.message);
  process.exit(1);
});
