import { prisma } from '../src/lib/prisma';

async function run() {
  const user = await prisma.user.findFirst({ where: { email: "koryobjectifs@gmail.com" } });
  if (!user) {
    console.log("No user found");
    return;
  }
  
  const schoolId = user.schoolId;

  const existing = await prisma.whatsAppTemplate.findMany({ where: { schoolId } });
  if (existing.length === 0) {
    console.log(`Seeding templates for school ${schoolId}...`);
    await prisma.whatsAppTemplate.createMany({
      data: [
        {
          id: "template_1_kory",
          schoolId,
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
          id: "template_2_kory",
          schoolId,
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
          id: "template_3_kory",
          schoolId,
          name: "Réunion parents-professeurs",
          language: "fr",
          status: "APPROVED",
          category: "UTILITY",
          components: [
            { type: "BODY", text: "Bonjour {{1}}, une réunion parents-professeurs aura lieu le {{2}} à {{3}}." }
          ]
        },
        {
          id: "template_4_kory",
          schoolId,
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
    console.log("Templates seeded for user's school.");
  } else {
    console.log("Templates already exist for user's school.");
  }
}
run();
