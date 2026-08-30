import { prisma } from '../src/lib/prisma';
import crypto from 'crypto';

async function run() {
  // ⚠️ Aucun numéro réel en dur ici : ce fichier est versé. Le numéro du parent
  // de test se passe par l'environnement, sans le « + » (format attendu par Meta).
  const waPhone = process.env.TEST_PARENT_PHONE;
  if (!waPhone) {
    console.error("TEST_PARENT_PHONE manquant. Exemple : TEST_PARENT_PHONE=221XXXXXXXXX npm run script -- scripts/simulate-whatsapp.ts");
    process.exit(1);
  }
  const text = process.argv[2] || "Bonjour, je voudrais savoir comment justifier l'absence de mon fils";

  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "105953185836067",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "1234567890",
                phone_number_id: "101683416343513"
              },
              contacts: [
                {
                  profile: {
                    name: "Parent Test"
                  },
                  wa_id: waPhone
                }
              ],
              messages: [
                {
                  from: waPhone,
                  id: "wamid." + crypto.randomUUID(),
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: {
                    body: text
                  },
                  type: "text"
                }
              ]
            },
            field: "messages"
          }
        ]
      }
    ]
  };

  try {
    const res = await fetch("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    console.log("Simulated incoming message:", text);
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
}
run();
