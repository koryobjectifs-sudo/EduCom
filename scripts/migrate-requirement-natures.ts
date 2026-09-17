import { prisma } from "./_env";

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(`=== MIGRATION DES NATURES D'EXIGENCES (BATCHING) (APPLY=${apply ? "1" : "0"}) ===`);

  const signatureLabels = [
    "Fiche de renseignements signée",
    "Règlement intérieur signé",
    "Personnes autorisées à récupérer l'enfant",
    "Demande d'inscription",
  ];

  const autoLabels = [
    "Bulletin de l'année précédente",
    "Fiche scolaire / certificat de scolarité",
    "Fiche scolaire",
    "Certificat de scolarité préscolaire",
    "Certificat de scolarité",
  ];

  const countSignature = await prisma.documentRequirement.count({
    where: { label: { in: signatureLabels } },
  });

  const countAuto = await prisma.documentRequirement.count({
    where: { label: { in: autoLabels } },
  });

  const countUpload = await prisma.documentRequirement.count({
    where: {
      NOT: [
        { label: { in: signatureLabels } },
        { label: { in: autoLabels } },
      ],
    },
  });

  console.log(`Comptages :`);
  console.log(`  SIGNATURE : ${countSignature}`);
  console.log(`  AUTO : ${countAuto}`);
  console.log(`  UPLOAD : ${countUpload}`);
  console.log(`  Total : ${countSignature + countAuto + countUpload}`);

  if (apply) {
    console.log("\nApplication des mises à jour en batch...");

    // 1. SIGNATURE
    const resSig = await prisma.documentRequirement.updateMany({
      where: { label: { in: signatureLabels } },
      data: { nature: "SIGNATURE" },
    });
    console.log(`  -> ${resSig.count} exigences passées en SIGNATURE`);

    // 2. AUTO
    const resAuto = await prisma.documentRequirement.updateMany({
      where: { label: { in: autoLabels } },
      data: { nature: "AUTO" },
    });
    console.log(`  -> ${resAuto.count} exigences passées en AUTO`);

    // 3. Renommage "Fiche scolaire / certificat de scolarité" -> "Certificat de scolarité"
    const resRename1 = await prisma.documentRequirement.updateMany({
      where: { label: "Fiche scolaire / certificat de scolarité" },
      data: {
        label: "Certificat de scolarité",
        shortLabel: "Certificat scolarité",
        nature: "AUTO",
      },
    });
    console.log(`  -> ${resRename1.count} exigences renommées de 'Fiche scolaire / certificat de scolarité' à 'Certificat de scolarité'`);

    const resRename2 = await prisma.documentRequirement.updateMany({
      where: { label: "Fiche scolaire" },
      data: {
        label: "Certificat de scolarité",
        shortLabel: "Certificat scolarité",
        nature: "AUTO",
      },
    });
    console.log(`  -> ${resRename2.count} exigences renommées de 'Fiche scolaire' à 'Certificat de scolarité'`);

    // 4. UPLOAD (le reste)
    const resUp = await prisma.documentRequirement.updateMany({
      where: {
        NOT: [
          { label: { in: signatureLabels } },
          { label: { in: autoLabels } },
          { label: "Certificat de scolarité" },
        ],
      },
      data: { nature: "UPLOAD" },
    });
    console.log(`  -> ${resUp.count} exigences passées en UPLOAD`);

    console.log("\nMigration terminée avec succès en 5 requêtes batchées !");
  } else {
    console.log("\nEssai à blanc terminé. Relancer avec APPLY=1 pour persister.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
