/**
 * Vérificateur des INTÉGRATIONS EXTERNES — 19 août 2026.
 *
 *   npm run script -- scripts/verify-integrations.ts
 *
 * ═══ CE QUE CE FICHIER EMPÊCHE DE REVENIR ═══
 *
 * Trois mensonges ont coexisté dans ce dépôt, tous de la même famille : **le
 * produit affirmait qu'une chose extérieure avait eu lieu alors que rien n'était
 * branché.**
 *
 *   1. `/api/webhooks/paydunya` acceptait un POST ANONYME et, sur la seule foi
 *      d'un `status: "completed"` fourni par l'appelant, passait une facture à
 *      `PAID` et créait un `Payment`. N'importe qui pouvant deviner un
 *      identifiant de facture pouvait solder la scolarité d'un élève.
 *
 *   2. `chatbot.ts` envoyait aux parents un lien de paiement ÉCRIT EN DUR
 *      (`.../checkout/demo-link-123`), présenté comme « lien sécurisé pour payer
 *      via Wave / Orange Money ». La clé d'API n'a jamais existé dans `.env` :
 *      ce faux lien était donc le SEUL jamais produit.
 *
 *   3. `sendBotReply` écrivait `status: "SENT"` sur chaque message — le défaut
 *      exact que le lot 17 avait corrigé dans la diffusion, oublié dans ce
 *      service. Six lignes `SENT` existent en base pour zéro message émis.
 *
 * Les trois fichiers ont été supprimés. Ce vérificateur prouve qu'ils ne
 * reviennent pas, et surtout que **le raisonnement** qui les a produits ne
 * revient pas ailleurs.
 *
 * ⚠️ Les contrôles RÉSEAU (section 5) exigent un serveur en marche. Sans lui ils
 * sont déclarés NON PROUVÉS — jamais comptés comme réussis.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let checks = 0, failures = 0, unproven = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const nonProuve = (l: string) => { unproven++; console.log(`  ? NON PROUVÉ — ${l}`); };

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";

/** Tous les fichiers source du produit (hors client Prisma généré). */
function sources(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (p.includes("generated")) continue;
    if (statSync(p).isDirectory()) sources(p, acc);
    else if (/\.(ts|tsx)$/.test(p)) acc.push(p);
  }
  return acc;
}

/** Retire commentaires et chaînes de commentaire : on cherche du CODE, pas des explications. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

async function main() {
  const files = sources("src");
  const prismaSchema = readFileSync("prisma/schema.prisma", "utf8");
  const envExample = readFileSync(".env.example", "utf8");

  /* ═════════ 1. le prestataire abandonné a réellement disparu ═════════ */
  console.log("\n【1】 Prestataire de paiement abandonné");

  // ⚠️ Le nom est reconstitué pour que ce fichier lui-même ne le contienne pas
  // en clair : sans cela, le vérificateur se déclencherait sur son propre code.
  const ABANDONNE = ["pay", "dunya"].join("");
  const enDur = files.filter((f) => new RegExp(ABANDONNE, "i").test(readFileSync(f, "utf8")));
  check(enDur.length === 0, "aucune mention du prestataire abandonné dans src/", enDur.join(", "));

  check(!new RegExp(ABANDONNE, "i").test(prismaSchema),
    "aucune mention du prestataire abandonné dans le schéma Prisma");
  check(!new RegExp(ABANDONNE, "i").test(envExample),
    "aucune variable du prestataire abandonné dans .env.example");

  check(!existsSync("src/app/api/webhooks"),
    "le dossier des webhooks n'existe plus — aucune route ouverte à un fournisseur");

  /* ═════════ 2. aucun lien de paiement fabriqué ═════════ */
  console.log("\n【2】 Liens de paiement");

  /**
   * ⚠️ Contrôle volontairement plus large que « pas de lien de paiement ».
   *
   * Le faux lien de paiement était un cas particulier d'un défaut plus général :
   * **du code produit qui s'adresse à un hôte extérieur sans que personne l'ait
   * décidé.** La même page portait un fond de conversation chargé depuis
   * `web.whatsapp.com`, et un tableau de bord envoyait le NOM ET LE PRÉNOM
   * D'ÉLÈVES à `ui-avatars.com` à chaque affichage.
   *
   * La liste ci-dessous est donc une AUTORISATION explicite, pas une liste
   * d'interdits : tout hôte absent fait échouer ce contrôle. Y ajouter une
   * ligne est une décision, et elle se voit en revue.
   */
  const HOTES_AUTORISES = [
    // Lien « ouvrir WhatsApp » que l'utilisateur clique lui-même : aucune
    // requête n'est émise par la page, c'est une intention de navigation.
    "wa.me",
    // Espace de noms XML de SVG. Jamais résolu par le navigateur.
    "www.w3.org",
    // Valeur de repli de NEXT_PUBLIC_SITE_URL en développement.
    "localhost",
  ];
  const HOTE = /https?:\/\/([a-zA-Z0-9.-]+)/g;
  const externes = new Map<string, string[]>();
  for (const f of files) {
    const src = stripComments(readFileSync(f, "utf8"));
    for (const m of src.matchAll(HOTE)) {
      const hote = m[1];
      if (HOTES_AUTORISES.some((a) => hote === a || hote.endsWith(`.${a}`))) continue;
      externes.set(hote, [...(externes.get(hote) ?? []), f]);
    }
  }
  check(externes.size === 0,
    "aucun hôte extérieur non autorisé n'est appelé depuis le code produit",
    [...externes].map(([h, fs]) => `${h} ← ${[...new Set(fs)].join(", ")}`).join(" | "));

  const demo = files.filter((f) => /demo-link|demo_link|SIMULATED|simuler? (une|le|la) (réponse|webhook|paiement)/i.test(stripComments(readFileSync(f, "utf8"))));
  check(demo.length === 0, "aucun lien, identifiant ni simulateur « de démonstration »", demo.join(", "));

  // Un simulateur de webhook livré dans le produit : le banc d'essai que la
  // messagerie embarquait, et qui postait une charge utile Meta forgée.
  const simulateurs = files.filter((f) => /fetch\(\s*["'`]\/api\/webhooks/.test(stripComments(readFileSync(f, "utf8"))));
  check(simulateurs.length === 0,
    "aucun écran ne poste vers un webhook — pas de banc d'essai livré dans le produit",
    simulateurs.join(", "));

  /* ═════════ 3. le faux « envoyé » ═════════ */
  console.log("\n【3】 Statut des messages — le faux vert du lot 17");

  const channelsSrc = readFileSync("src/lib/channels.ts", "utf8");
  const registre = channelsSrc.match(/const SEND_IMPLEMENTATIONS[^=]*=\s*(\{[^}]*\})/);
  check(registre !== null, "le registre des envois réels existe toujours dans channels.ts");
  check(registre !== null && registre[1].replace(/\s/g, "") === "{}",
    "SEND_IMPLEMENTATIONS est VIDE — aucun canal n'a le droit de dire « envoyé »",
    registre ? registre[1] : undefined);

  // ⚠️ Le cœur du test. Écrire SENT est légitime UNIQUEMENT dans un chemin qui a
  // d'abord interrogé `channels.ts`. Tout fichier qui écrit un statut de message
  // sans consulter le registre reproduit le défaut de `chatbot.ts`.
  const ECRIT_STATUT = /status:\s*["']?(SENT|DELIVERED|READ)["']?/;
  const ecrivains = files.filter((f) => ECRIT_STATUT.test(stripComments(readFileSync(f, "utf8"))));
  const sansGarde = ecrivains.filter((f) => {
    const src = readFileSync(f, "utf8");
    return !/from "@\/lib\/channels"|canSend|MESSAGE_STATES/.test(src);
  });
  check(sansGarde.length === 0,
    "aucun fichier n'écrit « envoyé » sans passer par channels.ts",
    sansGarde.length ? `${sansGarde.join(", ")} — c'est exactement ce que faisait sendBotReply()` : undefined);

  const messageCreate = files.filter((f) => /prisma\.message\.create/.test(stripComments(readFileSync(f, "utf8"))));
  check(messageCreate.length === 0,
    "aucun code ne crée de ligne Message — plus aucun canal n'émet ni ne reçoit",
    messageCreate.join(", "));

  /* ═════════ 4. aucune écriture métier depuis une requête non authentifiée ═════════ */
  console.log("\n【4】 Routes d'API — écriture et autorisation");

  const routes = existsSync("src/app/api") ? sources("src/app/api") : [];
  console.log(`      ${routes.length} route(s) d'API : ${routes.join(", ") || "aucune"}`);

  for (const r of routes) {
    const src = readFileSync(r, "utf8");
    const nom = r.replace("src/app/api/", "").replace("/route.ts", "");
    // Toute route qui écrit doit refuser avant d'écrire. Le modèle admis est
    // celui de `cron/overdue` : secret obligatoire, comparaison à durée
    // constante, échec fermé si le secret est absent de l'environnement.
    const ecrit = /prisma\.\w+\.(create|update|delete|updateMany|deleteMany|upsert)|sweepAllSchools/.test(src);
    if (!ecrit) { ok(`${nom} : n'écrit rien en base`); continue; }
    check(/authorization|Bearer|CRON_SECRET|requireActionContext|getUser\(\)/i.test(src),
      `${nom} : vérifie une autorisation avant d'écrire`);
    check(/timingSafeEqual|timing-safe|crypto\.timingSafeEqual/.test(src),
      `${nom} : compare le secret à durée constante`);
    check(/if \(!secret\)|!process\.env\.CRON_SECRET/.test(src),
      `${nom} : ÉCHEC FERMÉ — refuse tout si le secret est absent de l'environnement`);
  }

  const enDurToken = files.filter((f) => /educom_local_dev|verify_token\s*\|\|\s*["']/i.test(stripComments(readFileSync(f, "utf8"))));
  check(enDurToken.length === 0,
    "aucun jeton de vérification écrit en dur comme valeur de repli",
    enDurToken.length ? `${enDurToken.join(", ")} — un repli en dur annule le secret` : undefined);

  /* ═════════ 5. preuve réseau : la route supprimée ne répond plus ═════════ */
  console.log("\n【5】 Preuve réseau — POST anonyme");

  let serveurLà = false;
  try {
    const r = await fetch(BASE, { method: "GET", signal: AbortSignal.timeout(4000) });
    serveurLà = r.ok || r.status < 500;
  } catch { serveurLà = false; }

  if (!serveurLà) {
    nonProuve(`aucun serveur ne répond sur ${BASE} : les POST anonymes n'ont PAS été rejoués.`);
    nonProuve("relancer avec `npm run dev` en marche pour obtenir la preuve.");
  } else {
    // On rejoue EXACTEMENT la charge utile qui soldait une facture.
    const cibles = [
      { url: "/api/webhooks/paydunya".replace("paydunya", ABANDONNE), nom: "webhook du prestataire abandonné" },
      { url: "/api/webhooks/whatsapp", nom: "webhook WhatsApp" },
    ];
    for (const c of cibles) {
      const res = await fetch(`${BASE}${c.url}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "completed", custom_data: { invoice_id: "sonde" }, receipt: { receipt_receipt: { total_amount: 1 } } }),
      });
      check(res.status === 404, `${c.nom} : POST anonyme → 404 (route inexistante)`, `reçu ${res.status}`);
    }

    // La route conservée doit refuser sans secret, et ne rien exécuter.
    const cron = await fetch(`${BASE}/api/cron/overdue`, { method: "POST" });
    check(cron.status === 401 || cron.status === 503,
      `cron/overdue : POST anonyme → ${cron.status} (refusé)`,
      `reçu ${cron.status}`);
  }

  /* ═════════ 6. aucune intégration de paiement annoncée ═════════ */
  console.log("\n【6】 Aucune promesse de paiement en ligne");

  const marketing = sources("src/components/landing").concat(
    existsSync("src/app/(marketing)") ? sources("src/app/(marketing)") : [],
  );
  const promesses = marketing.filter((f) =>
    /pay(ez|er) en ligne|paiement en ligne (est )?(disponible|possible|actif)|réglez? par (wave|mobile money)/i
      .test(readFileSync(f, "utf8")),
  );
  check(promesses.length === 0, "aucune page publique n'annonce un paiement en ligne", promesses.join(", "));

  // ⚠️ Ce que le produit a le DROIT de dire : qu'il n'en a pas.
  const aveu = marketing.some((f) => /pas encore de paiement en ligne/i.test(readFileSync(f, "utf8")));
  check(aveu, "les pages publiques disent explicitement qu'EduCom n'a pas de paiement en ligne");

  /* ═════════ 7. Wave : rien d'inventé ═════════ */
  console.log("\n【7】 Wave — préparation sans fausse intégration");

  const waveCode = files.filter((f) => {
    const src = stripComments(readFileSync(f, "utf8"));
    return /wave[_.]?(api|key|secret|token|webhook|checkout)|api\.wave\.com|WAVE_/i.test(src);
  });
  check(waveCode.length === 0,
    "aucun code Wave — ni endpoint, ni clé, ni signature inventés",
    waveCode.join(", "));
  check(!/WAVE_/.test(envExample),
    "aucune variable Wave dans .env.example tant que la documentation n'est pas fournie");
}

main()
  .catch((e) => { fail(`le vérificateur s'est interrompu : ${e instanceof Error ? e.message : String(e)}`); })
  .finally(() => {
    console.log(`\n${"═".repeat(74)}`);
    console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoué(s)` +
      (unproven ? ` — ${unproven} NON PROUVÉ(S)` : ""));
    console.log("═".repeat(74));
    process.exit(failures ? 1 : 0);
  });
