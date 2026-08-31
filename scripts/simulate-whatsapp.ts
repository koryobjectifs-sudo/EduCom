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
    // Le webhook vérifie désormais `X-Hub-Signature-256`. Le simulateur doit
    // signer comme Meta, sinon il teste un chemin que la production rejette.
    // ⚠️ Signer la chaîne EXACTE envoyée, pas l'objet : deux sérialisations
    // d'un même objet ne produisent pas les mêmes octets.
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("META_APP_SECRET manquant : le webhook rejettera la requête (échec fermé).");
      process.exit(1);
    }
    const rawBody = JSON.stringify(payload);
    const signature =
      "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

    const res = await fetch("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": signature,
      },
      body: rawBody
    });
    console.log("Status:", res.status);
    console.log("Simulated incoming message:", text);
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
}
run();
