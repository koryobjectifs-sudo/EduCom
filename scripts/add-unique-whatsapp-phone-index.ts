/**
 * Pose l'index unique sur `School.whatsappPhoneNumberId`.
 *
 * ⚠️ POURQUOI PAS `prisma db push` : Prisma exige `--accept-data-loss` pour
 * toute création de contrainte unique, quel que soit l'état réel des données —
 * son avertissement est générique ("si des doublons existent, cela échouera"),
 * pas un constat. Utiliser ce drapeau reviendrait à désarmer l'avertissement
 * sans le lire. `CREATE UNIQUE INDEX` conserve le garde-fou là où il compte :
 * PostgreSQL refuse lui-même l'index si un doublon existe.
 *
 * Le nom de l'index est celui qu'attend Prisma (`School_whatsappPhoneNumberId_key`),
 * pour que `migrate diff` retombe à vide.
 *
 * ⚠️ ESSAI À BLANC PAR DÉFAUT. `APPLY=1` pour écrire.
 */
import { prisma } from "../src/lib/prisma";

const APPLY = process.env.APPLY === "1";
const INDEX = "School_whatsappPhoneNumberId_key";

async function main() {
  const dups = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM (
      SELECT "whatsappPhoneNumberId" FROM "School"
      WHERE "whatsappPhoneNumberId" IS NOT NULL
      GROUP BY 1 HAVING count(*) > 1
    ) x`;
  const nDup = Number(dups[0].n);
  console.log(`Doublons non-null : ${nDup}`);
  if (nDup > 0) {
    console.error("ABANDON : des doublons subsistent. L'index ne doit pas être posé.");
    process.exit(1);
  }

  const existing = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname=${INDEX}`;
  if (existing.length > 0) {
    console.log(`L'index ${INDEX} existe déjà — rien à faire (idempotent).`);
    return;
  }

  if (!APPLY) {
    console.log(`\n>>> ESSAI À BLANC — l'index ${INDEX} serait créé. APPLY=1 pour l'appliquer.`);
    return;
  }

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX "${INDEX}" ON "School"("whatsappPhoneNumberId")`
  );
  console.log(`\n>>> APPLIQUÉ : index ${INDEX} créé.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
