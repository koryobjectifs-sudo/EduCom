import "./_env";
import { Client } from "pg";
import { writeFileSync } from "fs";

const APPLY = process.env.APPLY === "1";

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  await client.connect();

  console.log(APPLY ? "== MODE RÉEL ==\n" : "== ESSAI À BLANC (aucune écriture) ==\n");

  const { rows: classes } = await client.query(
    `select id, name, "schoolId", "createdAt" from "Class" order by "createdAt" asc`
  );

  const canonical = new Map<string, string>();
  const duplicates: any[] = [];

  for (const c of classes) {
    const key = `${c.schoolId}::${c.name}`;
    if (canonical.has(key)) {
      duplicates.push({ ...c, targetId: canonical.get(key) });
    } else {
      canonical.set(key, c.id);
    }
  }

  if (duplicates.length === 0) {
    console.log("Aucun doublon trouvé.");
    await client.end();
    return;
  }

  const backupPath = `/tmp/educom-dup-classes-backup-${Date.now()}.json`;
  writeFileSync(backupPath, JSON.stringify({ duplicates }, null, 2));
  console.log(`Sauvegarde écrite : ${backupPath}\n`);

  await client.query("begin");

  let merged = 0;
  let movedEnrollments = 0;
  let movedGrades = 0;

  for (const dup of duplicates) {
    const targetId = dup.targetId;

    const { rows: enr } = await client.query(
      `select count(*)::int as n from "Enrollment" where "classId" = $1`,
      [dup.id]
    );
    const { rows: grd } = await client.query(
      `select count(*)::int as n from "Grade" where "classId" = $1`,
      [dup.id]
    );

    console.log(`Fusion: ${dup.name} -> cible: ${targetId}`);

    await client.query(`update "Enrollment" set "classId" = $1 where "classId" = $2`, [targetId, dup.id]);
    await client.query(`update "Grade" set "classId" = $1 where "classId" = $2`, [targetId, dup.id]);
    await client.query(`delete from "Class" where id = $1`, [dup.id]);

    merged++;
    movedEnrollments += enr[0].n;
    movedGrades += grd[0].n;
  }

  console.log(`\nRésultat : ${merged} doublon(s) supprimé(s), ${movedEnrollments} inscription(s) et ${movedGrades} note(s) déplacée(s).`);

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
