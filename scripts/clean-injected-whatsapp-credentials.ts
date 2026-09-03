/**
 * Neutralise les identifiants Meta injectés en masse par `inject-tokens.ts`,
 * qui appelait `updateMany` SANS clause `where` : le jeton de production s'est
 * retrouvé écrit dans toutes les écoles de la base.
 *
 * ⚠️ ESSAI À BLANC PAR DÉFAUT. `APPLY=1` pour écrire.
 *
 * L'école à CONSERVER n'est pas choisie à la main : elle est déduite du seul
 * signal que le script fautif n'écrivait pas — `whatsappBusinessAccountId`.
 * Le script s'interrompt si ce critère ne désigne pas exactement une école.
 *
 * ⚠️ La sauvegarde ne contient AUCUN jeton. Ce n'est pas un oubli : les 94
 * écoles portent la MÊME valeur, et l'école conservée la garde. Écrire le
 * jeton dans un fichier de sauvegarde recréerait le secret en clair sur disque,
 * ce qui est précisément le problème qu'on répare.
 */
import { prisma } from "../src/lib/prisma";
import { writeFileSync } from "fs";

const APPLY = process.env.APPLY === "1";

async function main() {
  const legit = await prisma.school.findMany({
    where: { whatsappBusinessAccountId: { not: null } },
    select: { id: true, name: true, whatsappConnectedAt: true },
  });

  if (legit.length !== 1) {
    console.error(`ABANDON : ${legit.length} école(s) portent un whatsappBusinessAccountId.`);
    console.error("Le critère de légitimité doit en désigner exactement une. Rien n'a été écrit.");
    process.exit(1);
  }
  const keep = legit[0];

  const targets = await prisma.school.findMany({
    where: {
      id: { not: keep.id },
      OR: [
        { whatsappAccessToken: { not: null } },
        { whatsappPhoneNumberId: { not: null } },
        { whatsappConnectionStatus: "CONNECTED" },
      ],
    },
    select: {
      id: true, name: true,
      whatsappPhoneNumberId: true,
      whatsappBusinessAccountId: true,
      whatsappConnectionStatus: true,
      whatsappName: true, whatsappPhone: true, whatsappConnectedAt: true,
      _count: { select: { students: true, messages: true } },
    },
  });

  console.log(`École CONSERVÉE  : ${keep.name} (connectée le ${keep.whatsappConnectedAt?.toISOString()})`);
  console.log(`Écoles à NETTOYER : ${targets.length}`);
  const withStudents = targets.filter(t => t._count.students > 0);
  const withMessages = targets.filter(t => t._count.messages > 0);
  console.log(`  dont avec des élèves  : ${withStudents.length} (données métier NON touchées)`);
  console.log(`  dont avec des messages: ${withMessages.length} (messages NON touchés)`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `backups/whatsapp-credentials-${stamp}.json`;
  writeFileSync(file, JSON.stringify({
    generatedAt: new Date().toISOString(),
    note: "Aucun jeton n'est stocké ici — voir l'en-tête du script.",
    keptSchoolId: keep.id,
    cleared: targets.map(t => ({
      id: t.id, name: t.name,
      whatsappPhoneNumberId: t.whatsappPhoneNumberId,
      whatsappBusinessAccountId: t.whatsappBusinessAccountId,
      whatsappConnectionStatus: t.whatsappConnectionStatus,
      whatsappName: t.whatsappName, whatsappPhone: t.whatsappPhone,
      whatsappConnectedAt: t.whatsappConnectedAt,
      hadAccessToken: true,
    })),
  }, null, 2));
  console.log(`Sauvegarde écrite : ${file}`);

  if (!APPLY) {
    console.log("\n>>> ESSAI À BLANC — aucune écriture. Relancer avec APPLY=1 pour appliquer.");
    return;
  }

  // Écriture ciblée : uniquement les 6 colonnes d'identifiants Meta.
  // Aucune table métier n'est touchée.
  const res = await prisma.school.updateMany({
    where: { id: { in: targets.map(t => t.id) } },
    data: {
      whatsappAccessToken: null,
      whatsappPhoneNumberId: null,
      whatsappBusinessAccountId: null,
      whatsappName: null,
      whatsappPhone: null,
      whatsappConnectedAt: null,
      whatsappConnectionStatus: "NOT_CONNECTED",
    },
  });
  console.log(`\n>>> APPLIQUÉ : ${res.count} écoles nettoyées.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
