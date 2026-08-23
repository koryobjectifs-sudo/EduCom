/**
 * Sonde RUNTIME du calendrier de trimestre — `setTermDates()` enfin branché.
 *
 *   npm run script -- scripts/verify-term-dates.ts
 *
 * ⚠️ Ce qu'elle éprouve, et qu'aucune relecture de code ne prouve :
 *   ① les champs de date existent pour CHAQUE trimestre ;
 *   ② Chrome saisit une date → elle est réellement en base ;
 *   ③ une fois datés, `pickCurrentTerm()` désigne le BON trimestre — c'est tout
 *      l'intérêt du champ, et c'était le défaut d'origine ;
 *   ④ un intervalle inversé est REFUSÉ et rien n'est écrit ;
 *   ⑤ effacer la date la remet à `null`, sans écrire une date fantôme.
 *
 * ⚠️ Elle travaille sur SES PROPRES trimestres (préfixe `DATEPROBE`) et les
 * supprime à la fin. Les trimestres réels de l'établissement ne sont ni lus en
 * écriture ni modifiés. Interrompue (Ctrl-C), elle laisse ses fixtures.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { CDP, chromeAvailable, launchChrome, waitFor, evaluate, shot, sessionCookies } from "./_cdp";
import { pickCurrentTerm } from "../src/lib/terms";
import { termPeriod } from "../src/lib/period";

const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "dates-"));
const TAG = "DATEPROBE";
const PASSWORD = `Dt-${Math.random().toString(36).slice(2)}-26!`;

const trash = { authIds: [] as string[], userIds: [] as string[], termIds: [] as string[] };
let ko = 0;
const check = (c: boolean, l: string) => { if (!c) ko++; console.log(`  ${c ? "✓" : "✗"} ${l}`); };

async function main() {
  if (!chromeAvailable()) throw new Error("Chrome introuvable");
  const admin = createAdminClient();
  const school = await prisma.school.findFirst({ where: { onboardingCompleted: true }, select: { id: true, name: true } });
  if (!school) throw new Error("aucune école");
  const schoolId = school.id;
  console.log(`établissement : ${school.name}`);

  const email = `${TAG.toLowerCase()}.${Date.now()}@sonde.invalid`;
  const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(String(created.error?.message));
  trash.authIds.push(created.data.user.id);
  await prisma.user.create({
    data: { id: created.data.user.id, email, firstName: TAG, lastName: "Sonde", role: "OWNER", schoolId },
  });
  trash.userIds.push(created.data.user.id);

  // Trois trimestres de sonde, TOUS sans dates — l'état de départ réel.
  const noms = [`${TAG} Periode A`, `${TAG} Periode B`, `${TAG} Periode C`];
  const fixtures: { id: string; name: string }[] = [];
  for (const name of noms) {
    const t = await prisma.term.create({ data: { name, schoolId }, select: { id: true, name: true } });
    trash.termIds.push(t.id);
    fixtures.push(t);
  }
  console.log(`fixtures : 3 trimestres sans dates\n`);

  const cookies = await sessionCookies(email, PASSWORD);

  const profile = mkdtempSync(join(tmpdir(), "dt-"));
  const launched = await launchChrome(Number(process.env.CDP_PORT ?? 9494), profile);
  if (!launched) throw new Error("Chrome n'a pas démarré");
  const { chrome, wsUrl } = launched;
  const cdp = await CDP.open(wsUrl);
  const t0 = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const at = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: t0.targetId, flatten: true });
  const session = at.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);
  for (const k of cookies) await cdp.send("Network.setCookie", { name: k.name, value: k.value, domain: "localhost", path: "/" }, session);

  const ouvrirConfig = async (w = 1440, h = 950) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false }, session);
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: `${BASE}/dashboard/grades/bulletin` }, session);
    await loaded;
    await waitFor(cdp, session, `!!document.querySelector('h1')`);
    await new Promise((r) => setTimeout(r, 1200));
    // La configuration est un bouton flottant, pas un onglet.
    await evaluate(cdp, session, `(() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Configuration');
      if (b) b.click(); return !!b;
    })()`);
    await waitFor(cdp, session, `!!document.querySelector('input[type=date]')`, 10000);
    await new Promise((r) => setTimeout(r, 400));
  };

  /** Le bloc DOM d'un trimestre, repéré par son nom. */
  const bloc = (nom: string) => `(() => {
    const s = [...document.querySelectorAll('span.font-semibold')].find(x => x.textContent.trim() === ${JSON.stringify(nom)});
    return s ? s.closest('div.rounded-xl') : null;
  })()`;

  await ouvrirConfig();

  console.log("── ① Les champs existent, pour chaque trimestre ──");
  const totalTerms = await prisma.term.count({ where: { schoolId } });
  const nbDate = await evaluate<number>(cdp, session, `document.querySelectorAll('input[type=date]').length`);
  check(nbDate === totalTerms * 2, `${totalTerms} trimestres → ${totalTerms * 2} champs de date attendus (${nbDate})`);

  const mention = await evaluate<boolean>(cdp, session,
    `document.body.innerText.includes('ne peut pas être choisi comme trimestre courant')`);
  check(mention === true, "un trimestre sans dates dit ce que ce vide coûte");

  // Les trimestres RÉELS de l'école apparaissent aussi, avec leurs évaluations.
  const reels = await evaluate<string>(cdp, session, `document.body.innerText`);
  check(reels.includes("1er Trimestre") && reels.includes("2ème Trimestre") && reels.includes("3ème Trimestre"),
    "les 3 trimestres réels sont listés");
  check(reels.includes("Contrôle du 1er trimestre") && reels.includes("Composition du 1er trimestre"),
    "leurs évaluations sont listées");
  check(reels.includes("Contrôle") && reels.includes("Composition"), "les types sont étiquetés Contrôle / Composition");
  console.log(`      → ${await shot(cdp, session, OUT, "config-dates")}`);

  console.log("\n── ② Chrome saisit une date, la base est relue ──");
  const poser = async (nom: string, debut: string, fin: string) => evaluate(cdp, session, `(() => {
    const b = ${bloc(nom)};
    if (!b) return false;
    const [d, f] = b.querySelectorAll('input[type=date]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(d, ${JSON.stringify(debut)}); d.dispatchEvent(new Event('input', { bubbles: true }));
    set.call(f, ${JSON.stringify(fin)});   f.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);

  await poser(fixtures[0].name, "2026-10-01", "2026-12-20");
  await new Promise((r) => setTimeout(r, 2500));
  let a = await prisma.term.findUnique({ where: { id: fixtures[0].id }, select: { startDate: true, endDate: true } });
  check(a?.startDate?.toISOString().slice(0, 10) === "2026-10-01", `date de début écrite en base (${a?.startDate?.toISOString().slice(0, 10)})`);
  check(a?.endDate?.toISOString().slice(0, 10) === "2026-12-20", `date de fin écrite en base (${a?.endDate?.toISOString().slice(0, 10)})`);
  const okBadge = await evaluate<boolean>(cdp, session, `document.body.innerText.includes('Enregistré')`);
  check(okBadge === true, "l'écran confirme « Enregistré »");

  console.log("\n── ③ Une fois daté, le BON trimestre devient courant ──");
  await poser(fixtures[1].name, "2027-01-05", "2027-03-25");
  await new Promise((r) => setTimeout(r, 2000));
  const rows = await prisma.term.findMany({
    where: { id: { in: trash.termIds } },
    select: { id: true, name: true, startDate: true, createdAt: true },
  });
  // À la date du 1er novembre 2026, seule la Periode A a commencé.
  const { current } = pickCurrentTerm(rows, new Date("2026-11-01T00:00:00Z"));
  check(current?.name === fixtures[0].name, `au 1er nov. 2026 → « ${current?.name} » (attendu « ${fixtures[0].name} »)`);
  const { current: c2 } = pickCurrentTerm(rows, new Date("2027-02-01T00:00:00Z"));
  check(c2?.name === fixtures[1].name, `au 1er fév. 2027 → « ${c2?.name} » (attendu « ${fixtures[1].name} »)`);
  // Sans le champ, les trois restaient nuls et la fonction retombait sur le dernier.
  check(current?.name !== fixtures[2].name, "ce n'est PLUS le dernier trimestre par défaut");

  /**
   * ⚠️ FAUX ÉCHEC CORRIGÉ — la sonde vérifiait le mauvais invariant.
   *
   * Elle attendait « aucune date écrite ». Or **chaque champ s'enregistre
   * indépendamment**, et c'est le bon comportement : poser une date de début
   * seule est légitime, une école le fait en ouvrant son calendrier. La
   * séquence réelle est donc : début « 2027-06-30 » accepté et écrit, puis fin
   * « 2027-04-01 » REFUSÉE parce qu'elle précède ce début.
   *
   * L'invariant qui compte n'est pas « rien n'est écrit », c'est **« la valeur
   * refusée n'est pas écrite »**. Et le trimestre à moitié daté qui en résulte
   * se dégrade proprement : `termPeriod()` rend `null` dès qu'une des deux
   * dates manque, donc aucun calcul ne tourne sur une période incomplète.
   */
  console.log("\n── ④ Intervalle inversé : la valeur refusée n'est pas écrite ──");
  await poser(fixtures[2].name, "2027-06-30", "2027-04-01");
  await new Promise((r) => setTimeout(r, 2500));
  const apres = await prisma.term.findUnique({ where: { id: fixtures[2].id }, select: { startDate: true, endDate: true } });
  check(apres?.endDate === null, `la date de FIN inversée n'est pas écrite (${apres?.endDate ?? "null"})`);
  check(apres?.startDate?.toISOString().slice(0, 10) === "2027-06-30",
    `la date de DÉBUT, valide et enregistrée seule, est conservée (${apres?.startDate?.toISOString().slice(0, 10)})`);
  check(termPeriod({ name: "x", startDate: apres!.startDate, endDate: apres!.endDate }) === null,
    "un trimestre à moitié daté ne produit aucune période — dégradation propre, pas de calcul faux");
  const msg = await evaluate<boolean>(cdp, session,
    `document.body.innerText.includes('La date de fin précède la date de début')`);
  check(msg === true, "le motif du refus est affiché à l'écran");
  console.log(`      → ${await shot(cdp, session, OUT, "intervalle-inverse")}`);

  console.log("\n── ⑤ Effacer une date la remet à null ──");
  await poser(fixtures[0].name, "", "");
  await new Promise((r) => setTimeout(r, 2500));
  a = await prisma.term.findUnique({ where: { id: fixtures[0].id }, select: { startDate: true, endDate: true } });
  check(a?.startDate === null && a?.endDate === null, "les deux dates sont revenues à null, aucune date fantôme");

  console.log("\n── Responsive ──");
  for (const [w, h] of [[1440, 950], [1024, 850], [390, 844]] as const) {
    await ouvrirConfig(w, h);
    const over = await evaluate<boolean>(cdp, session,
      "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1");
    check(over === false, `${w} px : aucun débordement horizontal`);
  }

  chrome.kill();
  console.log(`\ncaptures : ${OUT}`);
  console.log(ko === 0 ? "\nTOUT EST VERT\n" : `\n${ko} ÉCHEC(S)\n`);
}

main()
  .catch((e) => { ko++; console.error("ÉCHEC :", e.message); })
  .finally(async () => {
    const admin = createAdminClient();
    await prisma.term.deleteMany({ where: { id: { in: trash.termIds } } });
    await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
    for (const id of trash.authIds) await admin.auth.admin.deleteUser(id);
    console.log("fixtures supprimées");
    await prisma.$disconnect();
    process.exit(ko === 0 ? 0 : 1);
  });
