import { prisma } from '../src/lib/prisma';

async function run() {
  const school = await prisma.school.findFirst();
  if (!school) {
    console.log("No school found");
    return;
  }

  const existing = await prisma.whatsAppTemplate.findMany({ where: { schoolId: school.id } });
  console.log("Existing templates:", existing.length);

  if (existing.length === 0) {
    console.log("Seeding templates...");
    await prisma.whatsAppTemplate.createMany({
      data: [
        {
          id: "template_1",
          schoolId: school.id,
          name: "Rappel de paiement",
          language: "fr",
          status: "APPROVED",
          category: "UTILITY",
          components: [
            { type: "BODY", text: "Bonjour {{1}}, votre facture de {{2}} est arrivée à échéance le {{3}}." },
            { type: "BUTTONS", buttons: [{ type: "URL", text: "Payer", url: "{{4}}" }] }
          ]
        },
        {
          id: "template_2",
          schoolId: school.id,
          name: "Absence",
          language: "fr",
          status: "APPROVED",
          category: "UTILITY",
          components: [
            { type: "BODY", text: "Bonjour {{1}}, nous avons constaté l'absence de {{2}} aujourd'hui. Pouvez-vous nous indiquer le motif ?" },
            { type: "BUTTONS", buttons: [{ type: "REPLY", text: "Maladie" }, { type: "REPLY", text: "Autre" }] }
          ]
        },
        {
          id: "template_3",
          schoolId: school.id,
          name: "Réunion parents-professeurs",
          language: "fr",
          status: "APPROVED",
          category: "UTILITY",
          components: [
            { type: "BODY", text: "Bonjour {{1}}, une réunion parents-professeurs aura lieu le {{2}} à {{3}}." }
          ]
        },
        {
          id: "template_4",
          schoolId: school.id,
          name: "Bulletin disponible",
          language: "fr",
          status: "APPROVED",
          category: "UTILITY",
          components: [
            { type: "BODY", text: "Bonjour {{1}}, le bulletin de {{2}} est maintenant disponible. Vous pouvez le consulter en ligne." },
            { type: "BUTTONS", buttons: [{ type: "URL", text: "Voir le bulletin", url: "{{3}}" }] }
          ]
        }
      ]
    });
    console.log("Templates seeded.");
  }
}
run();
