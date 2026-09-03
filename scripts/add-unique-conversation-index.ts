/**
 * Pose l'index unique composite sur `WhatsAppConversation`
 * (schoolId, parentWaNumber, waPhoneId).
 *
 * Même raisonnement que `add-unique-whatsapp-phone-index.ts` : on n'utilise pas
 * `prisma db push --accept-data-loss`, dont l'avertissement est générique.
 * PostgreSQL refuse lui-même l'index si un doublon existe — le garde-fou reste
 * armé, il est simplement appliqué par la base.
 *
 * ⚠️ ESSAI À BLANC PAR DÉFAUT. `APPLY=1` pour écrire.
 */
import { prisma } from "../src/lib/prisma";

const APPLY = process.env.APPLY === "1";
const INDEX = "WhatsAppConversation_schoolId_parentWaNumber_waPhoneId_key";

async function main() {
  const dups = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM (
      SELECT "schoolId", "parentWaNumber", "waPhoneId"
      FROM "WhatsAppConversation" GROUP BY 1,2,3 HAVING count(*) > 1
    ) x`;
  const nDup = Number(dups[0].n);
  console.log(`Triplets en doublon : ${nDup}`);
  if (nDup > 0) {
    console.error("ABANDON : des doublons subsistent. Ils doivent être arbitrés à la main, jamais supprimés automatiquement.");
    process.exit(1);
  }

  const existing = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname=${INDEX}`;
  if (existing.length > 0) {
    console.log(`L'index ${INDEX} existe déjà — rien à faire (idempotent).`);
    return;
  }

  if (!APPLY) {
    console.log(`\n>>> ESSAI À BLANC — l'index serait créé. APPLY=1 pour appliquer.`);
    return;
  }

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX "${INDEX}" ON "WhatsAppConversation"("schoolId", "parentWaNumber", "waPhoneId")`
  );
  console.log(`\n>>> APPLIQUÉ : index ${INDEX} créé.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
