/**
 * Remplace le jeton d'accès Meta d'une SEULE école par celui de `.env`.
 *
 * ⚠️ Ce script n'existe que parce que le parcours normal (Réglages →
 * Déconnecter → Reconnecter via Embedded Signup) exige un navigateur et une
 * session Meta réelle. Dès que ce parcours est jouable, c'est LUI qu'il faut
 * utiliser : il réécrit les trois identifiants de façon atomique et cohérente.
 *
 * ⚠️ Le jeton n'est JAMAIS affiché, journalisé, ni écrit ailleurs que dans la
 * colonne visée. Les vérifications se font sur des empreintes SHA-256.
 *
 * ⚠️ Aucun `updateMany`, aucun identifiant d'école en dur. L'école est déduite,
 * et le script s'interrompt si le critère n'en désigne pas exactement une.
 *
 * ESSAI À BLANC PAR DÉFAUT. `APPLY=1` pour écrire.
 */
import { prisma } from "../src/lib/prisma";
import { createHash } from "crypto";

const APPLY = process.env.APPLY === "1";
const fingerprint = (v: string | null) =>
  v ? createHash("sha256").update(v).digest("hex").slice(0, 12) : "—";

async function main() {
  const newToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!newToken) {
    console.error("ABANDON : WHATSAPP_ACCESS_TOKEN absent de l'environnement.");
    process.exit(1);
  }

  const connected = await prisma.school.findMany({
    where: { whatsappConnectionStatus: "CONNECTED", whatsappAccessToken: { not: null } },
    select: { id: true, name: true, whatsappAccessToken: true, whatsappPhoneNumberId: true },
  });

  if (connected.length !== 1) {
    console.error(`ABANDON : ${connected.length} école(s) connectée(s) trouvée(s). Il en faut exactement une.`);
    process.exit(1);
  }

  const school = connected[0];
  const before = fingerprint(school.whatsappAccessToken);
  const target = fingerprint(newToken);

  console.log(`École ciblée        : ${school.name}`);
  console.log(`Jeton actuel        : empreinte ${before}`);
  console.log(`Jeton de .env       : empreinte ${target}`);
  console.log(`Rotation nécessaire : ${before !== target ? "OUI" : "NON (déjà à jour)"}`);

  if (before === target) {
    console.log("\nRien à faire — le jeton en base est déjà celui de l'environnement.");
    return;
  }

  const others = await prisma.school.count({ where: { id: { not: school.id }, whatsappAccessToken: { not: null } } });
  console.log(`Autres écoles portant un jeton : ${others} (doit rester inchangé)`);

  if (!APPLY) {
    console.log("\n>>> ESSAI À BLANC — aucune écriture. APPLY=1 pour appliquer.");
    return;
  }

  // `update` sur un id unique — jamais `updateMany`.
  await prisma.school.update({
    where: { id: school.id },
    data: { whatsappAccessToken: newToken },
  });

  const after = await prisma.school.findUniqueOrThrow({
    where: { id: school.id },
    select: { whatsappAccessToken: true },
  });
  const afterFp = fingerprint(after.whatsappAccessToken);

  const othersAfter = await prisma.school.count({ where: { id: { not: school.id }, whatsappAccessToken: { not: null } } });

  console.log(`\n>>> APPLIQUÉ.`);
  console.log(`   empreinte avant  : ${before}`);
  console.log(`   empreinte après  : ${afterFp}`);
  console.log(`   correspond à .env: ${afterFp === target ? "OUI" : "NON — ÉCHEC"}`);
  console.log(`   a réellement changé : ${afterFp !== before ? "OUI" : "NON — ÉCHEC"}`);
  console.log(`   autres écoles avec jeton : ${othersAfter} (avant : ${others})`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
