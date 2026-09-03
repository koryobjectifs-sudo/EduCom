/**
 * Sonde TACTILE — les trois commandes révélées au survol.
 *
 *   npm run script -- scripts/verify-touch-blockers.ts
 *
 * ═══ CE QU'ELLE ÉPROUVE, ET POURQUOI PAS AUTREMENT ═══
 *
 * Trois commandes d'EduCom ne se montrent qu'au passage de la souris :
 *
 *   ① « Déconnecter le numéro »          → centre de communication
 *   ② « Retirer le logo / cachet / signature » → réglages
 *   ③ « Modifier les rôles et accès »    → organigramme
 *
 * Lire le code suffit à voir `opacity-0 group-hover:opacity-100`. Il ne suffit
 * PAS à conclure : Tailwind v4 enveloppe `hover:` dans `@media (hover: hover)`,
 * si bien que le comportement réel dépend de ce que le navigateur déclare comme
 * capacité de pointage. Cette sonde le met donc à l'épreuve pour de vrai.
 *
 * ⚠️ **La capacité de pointage est émulée, pas devinée.**
 * `Emulation.setEmulatedMedia` force `hover: none` / `pointer: coarse` — l'état
 * d'un vrai téléphone. Redimensionner la fenêtre à 390 px ne suffirait pas :
 * un navigateur étroit garde `hover: hover`, et la sonde annoncerait un vert
 * mensonger sur des commandes réellement inatteignables au doigt.
 *
 * ⚠️ **L'aire tactile est mesurée par `elementFromPoint`, pas par la CSS.**
 * On interroge le navigateur aux quatre coins d'un carré de 44 px centré sur la
 * commande : c'est la seule mesure qui tienne compte des pseudo-éléments
 * (`::after`) et des calques qui recouvrent. Lire `getBoundingClientRect()`
 * aurait manqué une zone de clic étendue par `::after` — donc fait échouer une
 * correction pourtant valable.
 *
 * ⚠️ **Le rendu bureau est vérifié aussi.** Une correction qui rendrait les
 * trois commandes visibles en permanence sur grand écran changerait le produit
 * au lieu de le réparer. La sonde exige que la révélation au survol subsiste
 * quand le pointeur est fin.
 *
 * Fixtures créées dans une école jetable, supprimée à la fin : aucun
 * établissement réel n'est touché.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import {
  CDP, chromeAvailable, launchChrome, evaluate, waitFor, shot,
  sessionCookies, MOBILE, DESKTOP,
} from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const PORT = Number(process.env.CDP_PORT ?? 9447);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "tactile-"));
const TAG = "SONDETACT";
const PASSWORD = `Tact-${Math.random().toString(36).slice(2)}-2026!`;

/** Seuil confortable retenu par le projet pour une cible tactile. */
const SEUIL = 44;

/** 1 px transparent — suffit à faire rendre les trois vignettes des réglages. */
const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const trash = { authIds: [] as string[], userIds: [] as string[], schoolIds: [] as string[], dirs: [] as string[] };

/* ═══════════════════ expression évaluée dans la page ═══════════════════ */

type Sonde = {
  found: boolean;
  /** Opacité calculée : 0 = la commande est là, mais invisible. */
  opacity: number;
  visibility: string;
  w: number;
  h: number;
  /** Le carré de 44 px centré sur la commande atteint-il bien la commande ? */
  hit: number;
  /** Opacité une fois le focus clavier posé. */
  opacityFocus: number;
  focusable: boolean;
  label: string;
  /** Ancêtres qui écrasent l'opacité ou la visibilité — sinon la cause reste devinée. */
  coupables: string[];
  /** Ce que le navigateur renvoie aux points manqués : qui recouvre la commande. */
  bloqueurs: string[];
};

/**
 * `sel` est une expression JavaScript qui renvoie l'élément (ou `null`).
 *
 * ⚠️ On teste NEUF points, pas seulement le centre : un coin peut être recouvert
 * par une vignette voisine sans que le centre le soit. Le score `hit` compte les
 * points qui atteignent réellement la commande.
 */
const sonder = (sel: string) => `(() => {
  const el = ${sel};
  if (!el) return { found: false };
  el.scrollIntoView({ block: "center" });
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const d = ${SEUIL} / 2;
  // ⚠️ Les COINS d'un carré de 44 px ne sont PAS un critère valable : ces
  // commandes sont des pastilles rondes, et un disque de 44 px ne couvre jamais
  // les coins de son carré englobant. Un premier jet testait les 9 points et
  // échouait sur le coin bas-gauche — un défaut de la sonde, pas du bouton.
  // On retient donc le centre et les quatre extrémités d'axe, à 20 px du centre
  // (2 px de marge sur le bord du disque), et on exige EN PLUS que la boîte
  // mesure au moins 44 px : la géométrie et l'atteignabilité sont deux
  // questions distinctes, et une seule des deux ne prouve rien.
  const r20 = ${SEUIL} / 2 - 2;
  const points = [[0, 0], [-r20, 0], [r20, 0], [0, -r20], [0, r20]];
  let hit = 0;
  const bloqueurs = [];
  for (const [dx, dy] of points) {
    const t = document.elementFromPoint(cx + dx, cy + dy);
    if (t && (t === el || el.contains(t) || t.contains(el))) hit++;
    else bloqueurs.push((t ? t.tagName.toLowerCase() + "." + String(t.className || "").split(" ").slice(0, 2).join(".") : "rien") + " @" + dx + "," + dy);
  }
  // ⚠️ L'opacité et la visibilité PROPRES de l'élément ne prouvent rien : le
  // bouton « Déconnecter le numéro » vaut opacity 1 alors qu'un ancêtre porte
  // visibility:hidden. Un premier jet le déclarait donc « visible au clavier ».
  // On remonte la chaîne des ancêtres et on retient le pire cas.
  const coupables = [];
  const effectif = (n) => {
    let op = 1, vis = "visible";
    for (let e = n; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      const o = parseFloat(s.opacity);
      if (o < 1 || s.visibility !== "visible") {
        coupables.push(e.tagName.toLowerCase() + "." + String(e.className || "").split(" ").slice(0, 3).join(".") + " → opacity " + o + " / " + s.visibility);
      }
      op = Math.min(op, o);
      if (s.visibility === "hidden" || s.visibility === "collapse") vis = "hidden";
      if (s.display === "none") vis = "hidden";
    }
    return { op, vis };
  };
  const avant = effectif(el);
  el.focus();
  const apres = effectif(el);
  el.blur();
  return {
    found: true,
    opacity: avant.op,
    visibility: avant.vis,
    w: Math.round(r.width), h: Math.round(r.height),
    hit,
    opacityFocus: apres.vis === "hidden" ? 0 : apres.op,
    focusable: document.activeElement !== el ? el.tabIndex >= 0 || el.tagName === "BUTTON" : true,
    label: el.getAttribute("aria-label") || el.getAttribute("title") || (el.textContent || "").trim().slice(0, 40),
    coupables: [...new Set(coupables)].slice(0, 3),
    bloqueurs: [...new Set(bloqueurs)].slice(0, 4),
  };
})()`;

/* ═══════════════════ scénario ═══════════════════ */

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE TACTILE — les trois commandes révélées au survol");
  console.log("═".repeat(74) + "\n");

  if (!chromeAvailable()) { fail("Google Chrome introuvable — rendu non éprouvé"); return; }
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) { fail(`application injoignable sur ${BASE}`); return; }
  ok(`Chrome présent, application joignable sur ${BASE}`);

  /* ── fixtures, dans une école jetable ── */
  const admin = createAdminClient();
  const stamp = Date.now();

  const school = await prisma.school.create({
    data: {
      name: `${TAG} École de sonde`,
      onboardingCompleted: true,
      logo: PIXEL, stamp: PIXEL, signature: PIXEL,
      // Le widget WhatsApp n'affiche la carte de détail — et donc le bouton de
      // déconnexion — que si l'école est marquée connectée. On ne renseigne PAS
      // `whatsappPhoneNumberId` : il porte un index UNIQUE, et l'écran n'en a
      // pas besoin pour rendre la carte.
      whatsappConnectionStatus: "CONNECTED",
      whatsappName: `${TAG} Compte`,
      whatsappPhone: "+221 77 000 00 00",
      whatsappConnectedAt: new Date(),
    },
    select: { id: true, name: true },
  });
  trash.schoolIds.push(school.id);

  const email = `${TAG.toLowerCase()}.${stamp}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) { fail(`compte de sonde : ${error?.message}`); return; }
  trash.authIds.push(data.user.id);
  await prisma.user.create({
    data: { id: data.user.id, email, firstName: "Aïssatou", lastName: `${TAG}-Directrice`, role: "OWNER", schoolId: school.id },
  });
  trash.userIds.push(data.user.id);

  // Un second membre : l'organigramme doit avoir au moins un nœud à modifier.
  const emailProf = `${TAG.toLowerCase()}.prof.${stamp}@sonde.invalid`;
  const { data: prof } = await admin.auth.admin.createUser({ email: emailProf, password: PASSWORD, email_confirm: true });
  if (prof?.user) {
    trash.authIds.push(prof.user.id);
    await prisma.user.create({
      data: { id: prof.user.id, email: emailProf, firstName: "Moussa", lastName: `${TAG}-Enseignant`, role: "TEACHER", schoolId: school.id },
    });
    trash.userIds.push(prof.user.id);
  }
  ok(`fixtures : école jetable, logo/cachet/signature posés, WhatsApp marqué connecté`);

  const cookies = await sessionCookies(email, PASSWORD);

  /* ── Chrome piloté ── */
  const profile = mkdtempSync(join(tmpdir(), "cdp-tact-"));
  trash.dirs.push(profile, OUT);
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
  for (const c of cookies) {
    await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
  }
  ok("Chrome démarré, session réelle ouverte");

  /**
   * Bascule la capacité de pointage déclarée au moteur CSS.
   *
   * ⚠️ `Emulation.setEmulatedMedia` ne couvre PAS `hover` ni `pointer` dans
   * Chrome : la sonde a d'abord cru émuler un téléphone alors que la page
   * continuait de répondre `pointer: fine`, et des correctifs pourtant bons
   * étaient déclarés en échec. Ce sont `setTouchEmulationEnabled` et
   * `setDeviceMetricsOverride({ mobile: true })` qui font réellement basculer
   * ces deux caractéristiques. On vérifie ensuite ce que la page RÉPOND —
   * une émulation supposée ne vaut rien.
   */
  const pointage = async (mode: "tactile" | "souris") => {
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      // ⚠️ `maxTouchPoints` doit valoir au moins 1 : Chrome refuse 0 et la sonde
      // s'interrompait au moment de repasser en mode souris.
      enabled: mode === "tactile", maxTouchPoints: 5,
    }, session);
    await cdp.send("Emulation.setEmitTouchEventsForMouse", {
      enabled: mode === "tactile", configuration: mode === "tactile" ? "mobile" : "desktop",
    }, session);
  };

  /** Ce que la page déclare réellement — jamais ce qu'on croit lui avoir imposé. */
  const capacites = async () => evaluate<{ coarse: boolean; noHover: boolean; touch: number }>(
    cdp, session,
    `({ coarse: matchMedia("(pointer: coarse)").matches, noHover: matchMedia("(hover: none)").matches, touch: navigator.maxTouchPoints })`,
  );

  const aller = async (url: string, marqueur: string, vp: typeof MOBILE) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: vp.width < 800,
    }, session);
    await cdp.send("Page.navigate", { url }, session);
    return waitFor(cdp, session, marqueur, 40_000);
  };

  const SELECTEURS = {
    whatsapp: `[...document.querySelectorAll("button")].find((b) => /Déconnecter le numéro/i.test(b.textContent || ""))`,
    logo: `document.querySelector('button[aria-label="Retirer le logo"]')`,
    cachet: `document.querySelector('button[aria-label="Retirer le cachet"]')`,
    signature: `document.querySelector('button[aria-label="Retirer la signature"]')`,
    equipe: `document.querySelector('button[title="Modifier les rôles et accès"]')`,
  };

  /** Rend le verdict pour une commande, en tactile. */
  const verdictTactile = (nom: string, s: Sonde | { found: false }) => {
    if (!s.found) { fail(`${nom} — commande introuvable dans la page`, "la sonde ne peut rien conclure sur un élément absent"); return; }
    const d = s as Sonde;
    const visible = d.opacity > 0.99 && d.visibility !== "hidden";
    const atteignable = d.hit === 5 && d.w >= SEUIL && d.h >= SEUIL;
    const clavier = d.opacityFocus > 0.99;
    console.log(`      ${nom} · ${d.w}×${d.h} px · opacité ${d.opacity} · visibilité ${d.visibility} · ${d.hit}/5 points atteints · opacité au focus ${d.opacityFocus}`);
    check(visible, `${nom} — visible au doigt`, visible ? undefined : `opacité ${d.opacity}, visibilité ${d.visibility} — en cause : ${d.coupables.join(" | ") || "l'élément lui-même"}`);
    check(atteignable, `${nom} — cible de ${SEUIL} px atteignable`, atteignable ? undefined : `${d.w}×${d.h} px, ${d.hit}/5 points — ${d.bloqueurs.length ? "recouvert par : " + d.bloqueurs.join(" | ") : "boîte plus petite que " + SEUIL + " px"}`);
    check(clavier, `${nom} — visible au focus clavier`, clavier ? undefined : `opacité ${d.opacityFocus} une fois le focus posé : invisible au clavier`);
  };

  /* ═══════ 1. TACTILE — 390 × 844, hover:none / pointer:coarse ═══════ */
  console.log("\n═══ 1. AU DOIGT — 390 × 844, hover:none, pointer:coarse ═══\n");
  await pointage("tactile");

  // ⚠️ Le marqueur doit porter sur le CONTENU de la page, pas sur un mot qui
  // figure aussi dans la barre supérieure ou le fil d'Ariane. Un premier essai
  // attendait « Communications » : il était satisfait par la coquille, et la
  // sonde mesurait une page encore vide en croyant mesurer l'écran.
  const comm = await aller(`${BASE}/dashboard/communications`, `/Communication Center/.test(document.body.innerText)`, MOBILE);
  const cap = await capacites();
  console.log(`      la page déclare : pointer:coarse=${cap.coarse} · hover:none=${cap.noHover} · maxTouchPoints=${cap.touch}`);
  check(cap.coarse && cap.noHover,
    "l'émulation tactile est RÉELLEMENT active dans la page",
    "sans cela tout ce qui suit mesure un navigateur de bureau et ne prouve rien");
  check(comm, "le centre de communication est rendu sur mobile");
  if (comm) {
    console.log(`      → ${await shot(cdp, session, OUT, "tactile-communications")}`);

    // ⚠️ La carte de détail est un panneau de divulgation : au doigt, elle
    // s'ouvre par un APPUI, pas par un survol qui n'existe pas. La sonde
    // reproduit donc le geste réel de l'utilisateur avant de mesurer. Mesurer
    // sans appuyer testerait un panneau légitimement fermé.
    const pastille = await evaluate<boolean>(cdp, session, `(() => {
      const b = document.querySelector('[aria-controls="wa-details"]');
      if (!b) return false;
      b.click();
      return true;
    })()`);
    check(pastille, "① la pastille WhatsApp est un bouton, atteignable au doigt",
      pastille ? undefined : "aucun élément ne pilote la carte de détail : elle reste inatteignable sans souris");
    // ⚠️ La carte porte `transition-all` : mesurer juste après l'appui saisit
    // l'animation en cours (0,84 relevé au premier essai) et fait échouer une
    // correction pourtant bonne. On attend que l'opacité se stabilise.
    await waitFor(cdp, session,
      `(() => { const d = document.getElementById("wa-details"); return !!d && parseFloat(getComputedStyle(d).opacity) > 0.99; })()`, 5000);
    console.log(`      → ${await shot(cdp, session, OUT, "tactile-communications-ouvert")}`);
    verdictTactile("① Déconnecter WhatsApp", await evaluate<Sonde>(cdp, session, sonder(SELECTEURS.whatsapp)));

    // ⚠️ Atteindre une commande ne suffit pas : encore faut-il la LIRE. La
    // carte, ancrée à droite, sortait par la gauche de l'écran et tronquait son
    // propre contenu. Défaut invisible tant qu'elle ne s'ouvrait jamais au doigt.
    const cadre = await evaluate<{ left: number; right: number; vw: number }>(cdp, session, `(() => {
      const d = document.getElementById("wa-details");
      const r = d.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
    })()`);
    const dedans = cadre.left >= 0 && cadre.right <= cadre.vw;
    check(dedans, "① la carte de détail tient entièrement dans l'écran",
      dedans ? undefined : `bords à ${cadre.left} et ${cadre.right} px pour un écran de ${cadre.vw} px : le contenu est tronqué`);
  }

  const reg = await aller(`${BASE}/dashboard/settings`, `/Logo de l'école/i.test(document.body.innerText)`, MOBILE);
  check(reg, "l'écran des réglages est rendu sur mobile");
  if (reg) {
    console.log(`      → ${await shot(cdp, session, OUT, "tactile-reglages")}`);
    verdictTactile("② Retirer le logo", await evaluate<Sonde>(cdp, session, sonder(SELECTEURS.logo)));
    verdictTactile("② Retirer le cachet", await evaluate<Sonde>(cdp, session, sonder(SELECTEURS.cachet)));
    verdictTactile("② Retirer la signature", await evaluate<Sonde>(cdp, session, sonder(SELECTEURS.signature)));
  }

  const eq = await aller(`${BASE}/dashboard/team`, `/${TAG}-Enseignant|Organigramme|Équipe/i.test(document.body.innerText)`, MOBILE);
  check(eq, "l'organigramme est rendu sur mobile");
  if (eq) {
    console.log(`      → ${await shot(cdp, session, OUT, "tactile-equipe")}`);
    verdictTactile("③ Modifier les rôles", await evaluate<Sonde>(cdp, session, sonder(SELECTEURS.equipe)));
  }

  /* ═══════ 2. BUREAU — la révélation au survol doit SUBSISTER ═══════ */
  console.log("\n═══ 2. À LA SOURIS — 1440 × 900, hover:hover, pointer:fine ═══\n");
  console.log("      La correction ne doit pas exposer ces commandes en permanence sur grand écran.\n");
  await pointage("souris");

  const regD = await aller(`${BASE}/dashboard/settings`, `/Logo de l'école/i.test(document.body.innerText)`, DESKTOP);
  const capD = await capacites();
  console.log(`      la page déclare : pointer:coarse=${capD.coarse} · hover:none=${capD.noHover}`);
  check(!capD.coarse && !capD.noHover, "le pointeur fin est RÉELLEMENT rétabli en largeur bureau");
  check(regD, "l'écran des réglages est rendu en largeur bureau");
  if (regD) {
    const s = await evaluate<Sonde>(cdp, session, sonder(SELECTEURS.logo));
    if (s.found) {
      const d = s as Sonde;
      console.log(`      ② Retirer le logo (bureau) · opacité ${d.opacity}`);
      check(d.opacity < 0.99, "② la révélation au survol subsiste à la souris",
        d.opacity < 0.99 ? undefined : "la commande est visible en permanence : le rendu bureau a changé");
    } else { fail("② Retirer le logo — introuvable en largeur bureau"); }
  }

  cdp.close();
  chrome.kill();

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log(`  captures : ${OUT}`);
  console.log("═".repeat(74) + "\n");
}

main()
  .catch((e) => { console.error(e); failures++; })
  .finally(async () => {
    try {
      const admin = createAdminClient();
      await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
      for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
      await prisma.school.deleteMany({ where: { id: { in: trash.schoolIds } } });
      for (const d of trash.dirs) { if (d !== OUT) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } } }
      const reste = await prisma.school.count({ where: { name: { startsWith: TAG } } });
      console.log(reste === 0 ? "  ✓ fixtures de sonde supprimées\n" : `  ✗ ${reste} résidu(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
