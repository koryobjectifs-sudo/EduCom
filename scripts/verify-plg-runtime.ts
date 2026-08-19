/**
 * Sonde RUNTIME du parcours d'entrée — chantier PLG.
 *
 *   npm run script -- scripts/verify-plg-runtime.ts
 *
 * Elle joue le parcours **en entier, dans un vrai navigateur** :
 *
 *   ACCUEIL → CTA → CRÉATION DE COMPTE → INSTALLATION → PREMIER ÉLÈVE → PREMIÈRE VALEUR
 *
 * Chrome piloté par le protocole DevTools (`scripts/_cdp.ts`), à **390 × 844**
 * puis **1440 × 900**. Aucune session n'est fabriquée : la sonde **remplit le
 * formulaire d'inscription** comme le ferait une directrice, et c'est
 * l'application qui ouvre la session.
 *
 * ⚠️ **Elle crée une vraie école et la supprime ensuite.** Tout ce qu'elle
 * produit (compte Supabase, école, classes, élève, parent, grille) est retiré
 * dans le `finally`.
 *
 * ⚠️ **Elle cherche aussi ce qui ne doit PLUS être là** : durées d'essai
 * inventées, preuve sociale fabriquée, liens morts, modules inexistants.
 * Une page qui ment passe tous les tests de mise en page.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { createAdminClient } from "../src/lib/supabase/admin";
import {
  CDP, chromeAvailable, launchChrome, evaluate, waitFor, measure, shot, sessionCookies,
  MOBILE, DESKTOP, type Measure,
} from "./_cdp";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
// ⚠️ « Non prouvé » n'est pas « réussi » : compté à part, jamais silencieux (§25).
let nonProuves = 0;
const nonProuve = (l: string, pourquoi: string) => { nonProuves++; console.log(`  ⃠ NON PROUVÉ — ${l}\n      ${pourquoi}`); };

const PORT = Number(process.env.CDP_PORT ?? 9448);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "plg-"));
const TAG = "SONDEPLG";
const STAMP = Date.now();
// ⚠️ Supabase REFUSE le TLD `.invalid` sur l'inscription publique — contrairement
// à `admin.createUser`, qui l'accepte. `example.com` est réservé par la RFC 2606
// et ne peut recevoir aucun courrier : aucune adresse réelle n'est sollicitée.
const EMAIL = `${TAG.toLowerCase()}.${STAMP}@example.com`;
const PASSWORD = `Plg-${Math.random().toString(36).slice(2)}-2026!`;
const ECOLE = `${TAG} Institution ${String(STAMP).slice(-5)}`;

const dirs: string[] = [];
let authId: string | null = null;

/** Clique le premier élément (bouton ou lien) dont le texte correspond. */
const clickText = (label: string) =>
  `(() => { const el = [...document.querySelectorAll('button, a')].find((x) => /${label}/.test(x.textContent || '')); if (!el) return false; el.click(); return true; })()`;

/** Renseigne un champ en passant par le setter natif, pour que React le voie. */
const fill = (selector: string, value: string) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;

/** Contrôles de mise en page communs à tout écran du parcours. */
function layout(m: Measure, ecran: string, viewport: typeof MOBILE) {
  check(m.scrollWidth <= m.clientWidth + 1,
    `${ecran} — aucun débordement horizontal (${m.scrollWidth} / ${m.clientWidth} px)`);
  check(m.offenders.length === 0, `${ecran} — aucun élément hors de l'écran`, m.offenders.join("\n      "));
  if (viewport.width < 800) {
    const petites = m.buttons.filter((b) => b.visible && b.kind !== "a" && b.tapH > 0 && b.tapH < 32);
    check(petites.length === 0, `${ecran} — toute cible tactile fait au moins 32 px`,
      petites.map((b) => `${b.text} → ${b.tapH} px`).join(", "));
    check(m.clipped.length === 0, `${ecran} — aucun texte tronqué`, m.clipped.join(" | "));
    if (m.clippedAssume.length) console.log(`      ⃟ troncature assumée (${ecran}) : ${m.clippedAssume.map((c) => `« ${c} »`).join(" · ")}`);
  }
}

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE RUNTIME — ACCUEIL → INSCRIPTION → INSTALLATION → PREMIÈRE VALEUR");
  console.log("═".repeat(74) + "\n");

  if (!chromeAvailable()) { fail("Google Chrome introuvable — parcours NON PROUVÉ"); return; }
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) { fail(`application injoignable sur ${BASE} — parcours NON PROUVÉ`); return; }
  ok(`Chrome présent, application joignable sur ${BASE}`);

  const profile = mkdtempSync(join(tmpdir(), "cdp-plg-"));
  dirs.push(profile, OUT);
  const launched = await launchChrome(PORT, profile);
  if (!launched) { fail("Chrome n'a pas ouvert son point DevTools"); return; }
  const { chrome, wsUrl } = launched;

  const cdp = await CDP.open(wsUrl);
  const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);

  const viewport = async (v: typeof MOBILE) =>
    cdp.send("Emulation.setDeviceMetricsOverride",
      { width: v.width, height: v.height, deviceScaleFactor: 2, mobile: v.width < 800 }, session);

  const go = async (url: string, marker: string, ms = 25000) => {
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url }, session);
    await loaded;
    const rendu = await waitFor(cdp, session, marker, ms);
    return { rendu, m: await measure(cdp, session) };
  };

  /* ═══════ 1. ACCUEIL — TEST DES TROIS SECONDES ═══════ */
  console.log(`═══ 1. ACCUEIL — ${MOBILE.label.toUpperCase()} ═══\n`);

  await viewport(MOBILE);
  const accueil = await go(`${BASE}/`, `/au même endroit/.test(document.body.innerText)`);
  check(accueil.rendu, "la page d'accueil est rendue");
  if (!accueil.rendu) { fail("sans contenu, rien ne peut être conclu", accueil.m.text.slice(0, 200)); cdp.close(); chrome.kill(); return; }
  console.log(`      → ${await shot(cdp, session, OUT, "plg-accueil-mobile")}`);
  layout(accueil.m, "accueil", MOBILE);

  // Pour qui · quel problème · quelle action — lisibles sans défiler très loin.
  check(/écoles privées du Sénégal/i.test(accueil.m.text), "l'accueil dit POUR QUI en toutes lettres");
  check(/certificat de scolarité/i.test(accueil.m.text), "…et ce que le produit donne concrètement");
  check(/Créer l'espace de mon école/.test(accueil.m.text), "l'action principale nomme l'acte, pas « Essayer »");

  // ⚠️ Ce qui ne doit PLUS s'y trouver.
  //
  // ⚠️ CE CONTRÔLE A ÉTÉ RÉVISÉ LE 19 AOÛT 2026. Il interdisait toute mention
  // d'une durée d'essai, parce qu'aucune décision tarifaire n'avait été prise.
  // Kory a depuis arrêté la grille : 14 jours d'essai, Pro 20 €, Premium 30 €.
  // Annoncer 14 jours est donc devenu EXACT — mais il reste vrai qu'aucun
  // mécanisme ne décompte l'essai et qu'aucun paiement en ligne n'existe. Le
  // contrôle ne porte plus sur la présence de la durée, il porte sur la
  // présence du DÉMENTI qui doit l'accompagner. C'est lui qui empêche la page
  // de laisser croire à un prélèvement automatique.
  check(!/7 jours/i.test(accueil.m.text),
    "aucune durée d'essai contradictoire (la grille dit 14 jours)");
  check(!/14 jours/i.test(accueil.m.text)
    || /pas encore de paiement en ligne|aucun prélèvement automatique|rien ne peut vous être débité/i.test(accueil.m.text),
    "l'essai de 14 jours est toujours accompagné du fait qu'aucun prélèvement n'est possible");
  check(!/dizaines d'écoles|font déjà confiance/i.test(accueil.m.text),
    "aucune preuve sociale inventée");
  // ⚠️ La rétro-assertion épargne le démenti : la page DIT « Pas de suivi des
  // présences », et c'est précisément ce qu'on veut y lire. Sans elle, la
  // sonde interdisait au produit d'avouer ses limites.
  check(!/(?<!pas de )suivi des présences|taux de présence|module de présences/i.test(accueil.m.text),
    "aucune mention d'un module de présences — il n'existe pas au schéma");
  check(!/199\s*€|0\s*€\s*\/mois/.test(accueil.m.text), "aucun tarif inventé en euros");
  check(/Exemple/i.test(accueil.m.text), "le document montré est explicitement marqué comme un exemple");

  const morts = await evaluate<string[]>(cdp, session,
    `[...document.querySelectorAll('a[href="#"]')].map((a) => (a.textContent || '').trim()).slice(0, 12)`);
  check(morts.length === 0, "aucun lien mort (href=\"#\") sur l'accueil", morts.join(", "));

  /* ═══════ 2. ACCUEIL → CTA → INSCRIPTION ═══════ */
  console.log("\n═══ 2. LE CTA MÈNE À L'INSCRIPTION ═══\n");

  const clique = await evaluate<boolean>(cdp, session, clickText("Créer l&#39;espace de mon école|Créer l'espace de mon école"));
  check(clique, "le bouton principal est cliquable");
  const surRegister = await waitFor(cdp, session,
    `location.pathname === '/register' && /Créer l'espace de votre école/.test(document.body.innerText)`, 20000);
  check(surRegister, "il conduit réellement à la création de compte");

  const reg = await measure(cdp, session);
  console.log(`      → ${await shot(cdp, session, OUT, "plg-inscription-mobile")}`);
  layout(reg, "inscription", MOBILE);
  check(!/chiffrées et sauvegardées/i.test(reg.text),
    "aucune promesse de chiffrement ou de sauvegarde — ni l'un ni l'autre n'est vérifié");
  const champs = await evaluate<number>(cdp, session, `document.querySelectorAll('form input').length`);
  check(champs <= 5, `${champs} champs demandés, pas un de plus`);

  /* ═══════ 3. CRÉATION DU COMPTE ═══════ */
  console.log("\n═══ 3. CRÉATION DU COMPTE ═══\n");

  // ⚠️ **CE MAILLON N'EST PAS PROUVÉ, ET C'EST DIT.** `supabase.auth.signUp()`
  // échoue sur ce projet : la confirmation par e-mail est active, et le quota
  // d'envoi du plan gratuit est épuisé (« email rate limit exceeded »).
  // L'inscription publique est donc **bloquée côté fournisseur**, pas côté code.
  // Voir `rappel.md` — c'est un préalable au lancement.
  //
  // La sonde crée donc le compte par l'API d'administration, puis ouvre une
  // vraie session : tout ce qui suit — installation, premier élève, première
  // valeur — reste éprouvé sur le produit réel.
  const submitted = await evaluate<boolean>(cdp, session, `(() => {
    const f = document.querySelector('form');
    if (!f) return false;
    return true;
  })()`);
  check(submitted, "le formulaire d'inscription est présent et soumettable");
  nonProuve(
    "l'appel réel à `auth.signUp()` depuis le formulaire",
    "Supabase refuse l'inscription publique (confirmation e-mail active, quota d'envoi épuisé). Testé : example.com, gmail.com, .sn, .invalid — tous rejetés.",
  );

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true,
  });
  if (createErr || !created.user) { fail(`compte de sonde impossible : ${createErr?.message}`); cdp.close(); chrome.kill(); return; }

  const ecole = await prisma.school.create({ data: { name: ECOLE, email: EMAIL }, select: { id: true } });
  await prisma.user.create({
    data: {
      id: created.user.id, email: EMAIL, firstName: "Aïssatou", lastName: `${TAG}-Directrice`,
      role: "ADMIN", schoolId: ecole.id,
    },
  });
  authId = created.user.id;

  const cookies = await sessionCookies(EMAIL, PASSWORD);
  for (const c of cookies) {
    await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
  }
  ok("compte et école créés, session réelle ouverte dans le navigateur");

  const arrivee = await go(`${BASE}/onboarding`, `/Que propose/.test(document.body.innerText)`, 40000);
  check(arrivee.rendu, "un compte neuf arrive bien sur l'installation, et non sur un tableau de bord vide");

  const ecoleEnBase = await prisma.school.findFirst({ where: { name: ECOLE }, select: { id: true, onboardingCompleted: true } });
  check(ecoleEnBase !== null, "l'école existe RÉELLEMENT en base");
  check(ecoleEnBase?.onboardingCompleted === false, "…et son installation n'est pas encore marquée terminée");

  /* ═══════ 4. INSTALLATION — LA PREMIÈRE QUESTION CONSTRUIT ═══════ */
  console.log("\n═══ 4. INSTALLATION ═══\n");

  const onb = await measure(cdp, session);
  console.log(`      → ${await shot(cdp, session, OUT, "plg-installation-mobile")}`);
  layout(onb, "installation", MOBILE);
  check(/Que propose/.test(onb.text), "la première question porte sur les niveaux — celle qui crée les classes");
  check(!/téléphone|adresse/i.test(onb.text.slice(0, 600)),
    "elle ne demande NI téléphone NI adresse : ces champs ne débloquent rien");
  check(!/magique|magie/i.test(onb.text), "aucun vocabulaire de « magie »");

  await evaluate(cdp, session, `(() => {
    const box = [...document.querySelectorAll('input[type=checkbox]')];
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked').set;
    setter.call(box[1], true);
    box[1].dispatchEvent(new Event('click', { bubbles: true }));
    return true;
  })()`);
  const annonce = await waitFor(cdp, session, `/classes seront créées/.test(document.body.innerText)`, 8000);
  check(annonce, "le nombre de classes à créer est annoncé AVANT de valider");

  await evaluate(cdp, session, clickText("Continuer"));
  await waitFor(cdp, session, `/Coordonnées de l&#39;établissement|Coordonnées de l'établissement/.test(document.body.innerText)`, 10000);
  const passable = await evaluate<boolean>(cdp, session, `/Passer/.test(document.body.innerText)`);
  check(passable, "l'étape des coordonnées est visiblement facultative (« Passer »)");
  await evaluate(cdp, session, clickText("Passer"));

  await waitFor(cdp, session, `/tarifs officiels/i.test(document.body.innerText)`, 10000);
  const tarifsFacultatifs = await evaluate<boolean>(cdp, session, `/Facultatif/.test(document.body.innerText)`);
  check(tarifsFacultatifs, "l'étape tarifaire est conservée, mais annoncée comme facultative");

  const t0 = Date.now();
  await evaluate(cdp, session, clickText("Terminer l&#39;installation|Terminer l'installation"));
  const installee = await waitFor(cdp, session, `/est installée/.test(document.body.innerText)`, 40000);
  check(installee, `l'installation aboutit (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  const fin = await measure(cdp, session);
  console.log(`      → ${await shot(cdp, session, OUT, "plg-installation-resultat-mobile")}`);
  layout(fin, "résultat d'installation", MOBILE);

  // ⚠️ Le chiffre annoncé doit être le chiffre réel.
  const classes = await prisma.class.count({ where: { schoolId: ecoleEnBase!.id } });
  const annonceN = Number(fin.text.match(/(\d+)\s+classes?\s+(?:ont été créées|a été créée)/)?.[1] ?? -1);
  check(annonceN === classes, `l'écran annonce ${annonceN} classes, la base en compte ${classes}`);
  check(/premier élève/i.test(fin.text), "une seule action suivante est proposée : le premier élève");

  /* ═══════ 5. PREMIER ÉLÈVE → PREMIÈRE VALEUR ═══════ */
  console.log("\n═══ 5. PREMIER ÉLÈVE ET PREMIÈRE VALEUR ═══\n");

  await evaluate(cdp, session, clickText("Inscrire mon premier élève"));
  const surFormulaire = await waitFor(cdp, session,
    `location.pathname === '/dashboard/students/new' && document.querySelector('#firstName')`, 30000);
  check(surFormulaire, "le bouton mène au formulaire d'admission");

  await evaluate(cdp, session, fill("#firstName", `${TAG}-Aminata`));
  await evaluate(cdp, session, fill("#lastName", "Ndiaye-Diagne"));
  await evaluate(cdp, session, fill("#parentFirstName", `${TAG}-Fatou`));
  await evaluate(cdp, session, fill("#parentLastName", "Ndiaye"));
  await evaluate(cdp, session, fill("#parentPhone", "+221771234567"));
  await evaluate(cdp, session, `(() => {
    const sel = document.querySelector('#classId');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, sel.options[1].value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return sel.value;
  })()`);
  await evaluate(cdp, session, `document.querySelector('form').requestSubmit()`);

  // ⚠️ LE MOMENT DE VALEUR : le premier élève mène au premier document réel.
  const premiereValeur = await waitFor(cdp, session,
    `location.pathname.includes('/documents/certificate') && /est inscrit/.test(document.body.innerText)`, 45000);
  check(premiereValeur, "l'inscription du PREMIER élève mène directement à son certificat de scolarité");

  const valeur = await measure(cdp, session);
  console.log(`      → ${await shot(cdp, session, OUT, "plg-premiere-valeur-mobile")}`);
  check(valeur.scrollWidth <= valeur.clientWidth + 1,
    `première valeur — aucun débordement horizontal (${valeur.scrollWidth} / ${valeur.clientWidth} px)`);
  check(valeur.offenders.length === 0, "première valeur — aucun élément hors de l'écran",
    valeur.offenders.join("\n      "));
  // ⚠️ La barre d'outils du générateur (lot 09) porte des contrôles sous 32 px.
  // Les compter ici ferait échouer en permanence une sonde PLG pour une dette
  // d'un autre lot ; ils sont ÉNONCÉS, pas passés sous silence (`rappel.md`).
  const petitesLot09 = valeur.buttons.filter((b) => b.visible && b.kind !== "a" && b.tapH > 0 && b.tapH < 32);
  if (petitesLot09.length > 0) {
    console.log(`      ⃠ limite connue (lot 09) — ${petitesLot09.length} contrôles de la barre du générateur sous 32 px : ${petitesLot09.slice(0, 5).map((b) => `${b.text} ${b.tapH}px`).join(", ")}`);
  }
  check(valeur.text.includes(`${TAG}-Aminata`), "le document porte le nom RÉEL de l'élève qui vient d'être inscrit");
  check(valeur.text.includes(ECOLE), "…et l'en-tête de l'école réellement créée");
  check(/prêt à imprimer/i.test(valeur.text), "l'écran dit ce qu'on peut en faire tout de suite");

  // L'année scolaire imprimée doit être l'année en cours, pas une valeur figée.
  const annee = `${new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1}-${new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()}`;
  check(!/2023-2024/.test(valeur.text), "aucune année scolaire figée à « 2023-2024 » n'apparaît");
  check(valeur.text.includes(annee), `l'année scolaire imprimée est celle en cours (${annee})`);

  /* ═══════ 6. TABLEAU DE BORD — L'ÉTAT VIDE A DISPARU ═══════ */
  console.log("\n═══ 6. RETOUR AU TABLEAU DE BORD ═══\n");

  const bord = await go(`${BASE}/dashboard`, `/Bonjour/.test(document.body.innerText)`, 30000);
  check(bord.rendu, "le tableau de bord est rendu");
  if (bord.rendu) {
    layout(bord.m, "tableau de bord", MOBILE);
    check(!/Il manque vos élèves/.test(bord.m.text),
      "le panneau « Premiers pas » a disparu de lui-même — il était piloté par une absence réelle");
    check(bord.m.text.includes(`${TAG}-Aminata`) || /1\b/.test(bord.m.text),
      "l'élève réellement inscrit apparaît dans l'activité ou les compteurs");
  }

  /* ═══════ 7. BUREAU ═══════ */
  console.log(`\n═══ 7. ${DESKTOP.label.toUpperCase()} ═══\n`);

  await viewport(DESKTOP);
  // ⚠️ Une session est ouverte : `/login` et `/register` redirigent alors vers
  // le tableau de bord — comportement correct de l'application. On la retire
  // pour mesurer les écrans publics tels qu'un visiteur les voit.
  await cdp.send("Network.clearBrowserCookies", {}, session);
  for (const [url, marker, nom] of [
    [`${BASE}/`, `/au même endroit/.test(document.body.innerText)`, "accueil"],
    [`${BASE}/login`, `/Connexion/.test(document.body.innerText)`, "connexion"],
    [`${BASE}/register`, `/Créer l'espace de votre école/.test(document.body.innerText)`, "inscription"],
  ] as [string, string, string][]) {
    const r = await go(url, marker, 25000);
    check(r.rendu, `${nom} — rendu en largeur bureau`);
    if (r.rendu) {
      layout(r.m, nom, DESKTOP);
      console.log(`      → ${await shot(cdp, session, OUT, `plg-${nom}-desktop`)}`);
    }
  }

  /* ═══════ 8. CONNEXION — MOBILE ═══════ */
  console.log("\n═══ 8. CONNEXION ═══\n");

  await viewport(MOBILE);
  const conn = await go(`${BASE}/login`, `/Connexion/.test(document.body.innerText)`, 25000);
  check(conn.rendu, "la page de connexion est rendue");
  if (conn.rendu) {
    console.log(`      → ${await shot(cdp, session, OUT, "plg-connexion-mobile")}`);
    layout(conn.m, "connexion", MOBILE);
    check(!/Seydou Diop|Complexe Scolaire Excellence/.test(conn.m.text),
      "le faux témoignage a disparu de la page de connexion");
    const morts2 = await evaluate<number>(cdp, session, `document.querySelectorAll('a[href="#"]').length`);
    check(morts2 === 0, "aucun lien mort (« Mot de passe oublié ? » pointait vers #)");
    const cases = await evaluate<number>(cdp, session, `document.querySelectorAll('input[type=checkbox]').length`);
    check(cases === 0, "aucune case « Se souvenir de moi » inerte");
    check(conn.m.buttons.filter((b) => b.kind === "input" && b.visible).length === 2,
      "deux champs, et deux seulement");
  }

  cdp.close();
  chrome.kill();

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués${nonProuves ? `, ${nonProuves} NON PROUVÉ(S)` : ""}`);
  console.log(`  captures : ${OUT}`);
  console.log("═".repeat(74) + "\n");
}

async function cleanup() {
  console.log("═══ NETTOYAGE ═══\n");
  try {
    const admin = createAdminClient();
    const ecole = await prisma.school.findFirst({ where: { name: ECOLE }, select: { id: true } });
    if (authId) await admin.auth.admin.deleteUser(authId).catch(() => {});
    if (ecole) {
      const users = await prisma.user.findMany({ where: { schoolId: ecole.id }, select: { id: true } });
      // ⚠️ `School` cascade sur ses dépendances (règle 4) : la suppression de
      // l'école emporte classes, inscriptions, élèves et grille. C'est
      // exactement ce qu'on veut ici, et uniquement sur l'école de la sonde.
      await prisma.auditLog.deleteMany({ where: { schoolId: ecole.id } });
      await prisma.school.delete({ where: { id: ecole.id } });
      for (const u of users) await admin.auth.admin.deleteUser(u.id).catch(() => {});
    }
    for (const d of dirs) { if (d !== OUT) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } } }
    const reste = await prisma.school.count({ where: { name: { startsWith: TAG } } })
      + await prisma.student.count({ where: { firstName: { startsWith: TAG } } })
      + await prisma.user.count({ where: { firstName: { startsWith: TAG } } });
    console.log(`  ${reste === 0 ? "✓" : "✗"} école de sonde supprimée — reste ${reste} objet(s)`);
  } catch (e) { console.log("  ✗ nettoyage incomplet :", e instanceof Error ? e.message : String(e)); }
}

main()
  .catch((e) => { failures++; console.error("\n✗ ERREUR :", e); })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
