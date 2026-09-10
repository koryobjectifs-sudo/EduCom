import "./_env";
import { Client } from "pg";

const APPLY = process.env.APPLY === "1";

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  await client.connect();

  console.log(APPLY ? "== MODE RÉEL ==\n" : "== ESSAI À BLANC (aucune écriture) ==\n");

  try {
    await client.query("begin");

    if (APPLY) {
      // 1. Ajouter la colonne
      await client.query(`ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;`);
      console.log("✅ Colonne academicYear ajoutée");

      // 2. Backfill des données
      const { rows: classes } = await client.query(`
        SELECT c.id, c.name, s."activeAcademicYear"
        FROM "Class" c
        JOIN "School" s ON c."schoolId" = s.id
        WHERE c."academicYear" IS NULL
      `);
      
      let updated = 0;
      for (const c of classes) {
        const year = c.activeAcademicYear || "2024-2025";
        await client.query(`UPDATE "Class" SET "academicYear" = $1 WHERE id = $2`, [year, c.id]);
        updated++;
      }
      console.log(`✅ ${updated} classes mises à jour avec l'année académique active.`);

      // 3. Remplacer l'index unique
      await client.query(`ALTER TABLE "Class" DROP CONSTRAINT IF EXISTS "Class_schoolId_name_key" CASCADE;`);
      await client.query(`DROP INDEX IF EXISTS "Class_schoolId_name_key";`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Class_schoolId_name_academicYear_key" ON "Class"("schoolId", "name", "academicYear");`);
      console.log("✅ Index unique recréé avec academicYear");

      // 4. Ajouter un index simple sur academicYear
      await client.query(`CREATE INDEX IF NOT EXISTS "Class_academicYear_idx" ON "Class"("academicYear");`);
      console.log("✅ Index simple sur academicYear ajouté");

      await client.query("commit");
      console.log("\nMigration terminée avec succès.");
    } else {
      await client.query("rollback");
      console.log("(Essai à blanc terminé sans erreur. Relancez avec APPLY=1)");
    }
  } catch (e) {
    await client.query("rollback");
    console.error("Erreur durant la migration:", e);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
