/**
 * Sonde RUNTIME des surfaces publiques — addendum PLG (preuve sociale + tarifs).
 *
 *   npm run script -- scripts/verify-landing-runtime.ts
 *
 * Elle ouvre les CINQ pages publiques dans un vrai Chrome, à **390 × 844** puis
 * **1440 × 900**, et vérifie trois familles de choses :
 *
 *   1. la MISE EN PAGE — aucun débordement horizontal, aucun élément hors de
 *      l'écran, aucun texte tronqué, des cibles tactiles atteignables ;
 *   2. le CONTENU EXIGÉ — les deux monnaies, les trois formules, la section
 *      « Histoires d'écoles », les ancres de la barre de navigation ;
 *   3. le CONTENU INTERDIT — c'est la partie qui compte le plus. Une page qui
 *      ment passe tous les tests de mise en page. La sonde cherche donc
 *      nommément les affirmations fausses que ce dépôt a déjà publiées :
 *      statistiques inventées, preuve sociale fabriquée, envoi WhatsApp
 *      « en un clic », import Excel, RGPD, durées d'essai contradictoires.
 *
 * ⚠️ Aucune session, aucune écriture en base : ces pages sont publiques, et la
 * sonde efface les cookies avant chaque mesure pour qu'une session résiduelle
 * ne redirige pas `/login` vers le tableau de bord.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CDP, chromeAvailable, launchChrome, waitFor, measure, shot,
  MOBILE, DESKTOP, type Measure,
} from "./_cdp";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const PORT = Number(process.env.CDP_PORT ?? 9451);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "landing-"));
const dirs: string[] = [];

const PAGES = [
  { url: "/", nom: "accueil", marker: "au même endroit" },
  { url: "/features", nom: "fonctionnalités", marker: "écran par écran" },
  { url: "/solutions", nom: "pour qui", marker: "plusieurs métiers" },
  // Repère pris dans les CARTES, pas dans le titre : un titre se réécrit.
  { url: "/pricing", nom: "tarifs", marker: "F CFA" },
  { url: "/how-it-works", nom: "déroulé", marker: "premier document" },
];

/**
 * ⚠️ CHAQUE LIGNE EST UNE PHRASE QUI A RÉELLEMENT ÉTÉ PUBLIÉE ICI.
 * Ce n'est pas une liste de précautions théoriques : c'est un relevé de dettes.
 * Ne jamais en retirer une ligne parce qu'« on ne le referait pas » — c'est
 * exactement ce qu'on pensait la première fois.
 */
const INTERDITS: { motif: RegExp; pourquoi: string }[] = [
  { motif: /\b342\b|\b284\b|\b198\b|\b124\b/, pourquoi: "statistiques inventées d'AnalyticsSection" },
  { motif: /dizaines d['’]écoles/i, pourquoi: "preuve sociale fabriquée" },
  { motif: /7 jours d['’]essai/i, pourquoi: "durée d'essai contradictoire (la grille dit 14 jours)" },
  { motif: /RGPD/i, pourquoi: "le texte applicable au Sénégal est la Loi n°2008-12, pas le RGPD" },
  { motif: /Seydou Diop|Complexe Scolaire Excellence/i, pourquoi: "témoignage inventé" },
  { motif: /Amadou Diallo|Fatou Sow|Mariama/i, pourquoi: "élèves inventés de PillarsSection" },
  { motif: /\[Nom Prénom\]|\[Directeur/i, pourquoi: "marque de gabarit livrée en production" },
  // ⚠️ La négation est explicitement épargnée : la page DIT « Pas de suivi des
  // présences », et c'est précisément ce qu'on veut y lire. Sans la
  // rétro-assertion, la sonde interdisait au produit d'avouer ses limites.
  { motif: /(?<!pas de )suivi des présences|taux de présence|gestion des absences/i, pourquoi: "aucune donnée de présence au schéma" },
  { motif: /pipeline (visuel|admissions)/i, pourquoi: "le module Admissions n'existe pas" },
  { motif: /accusés? de lecture|suivi de lecture/i, pourquoi: "aucun accusé de lecture n'existe" },
  { motif: /en un clic.{0,40}(whatsapp|sms)|(whatsapp|sms).{0,40}en un clic/i, pourquoi: "aucun canal ne peut émettre (lot 17)" },
  { motif: /199\s?€|EduCom School/i, pourquoi: "ancienne grille tarifaire inventée" },
  { motif: /le plus populaire|most popular|meilleur rapport|best value/i, pourquoi: "aucune décision commerciale ne le fonde" },
  { motif: /sauvegard(é|e)es? quotidien|chiffr(é|e)es? au repos/i, pourquoi: "non vérifié (rappel.md §42)" },
];

/** Mise en page : les quatre mêmes contrôles sur chaque page et chaque taille. */
function layout(m: Measure, page: string, v: { width: number; label: string }) {
  const t = `${page} — ${v.label}`;
  check(m.scrollWidth <= m.clientWidth + 1, `${t} — aucun débordement horizontal`,
    `${m.scrollWidth} px de contenu pour ${m.clientWidth} px d'écran`);
  check(m.offenders.length === 0, `${t} — aucun élément hors de l'écran`,
    m.offenders.join(" · "));
  check(m.clipped.length === 0, `${t} — aucun texte tronqué`,
    m.clipped.map((c) => `« ${c} »`).join(" · "));
    if (m.clippedAssume.length) console.log(`      ⃟ troncature assumée (${t}) : ${m.clippedAssume.map((c) => `« ${c} »`).join(" · ")}`);
  // Une cible sous 40 px de haut se rate au doigt. On ne mesure que le mobile :
  // à la souris, 32 px suffisent.
  if (v.width < 800) {
    const petits = m.buttons.filter((b) => b.visible && b.tapH < 40);
    check(petits.length === 0, `${t} — toutes les cibles tactiles font 40 px ou plus`,
      petits.slice(0, 6).map((b) => `« ${b.text} » ${b.tapH}px`).join(" · "));
  }
}

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE RUNTIME — SURFACES PUBLIQUES (preuve sociale · tarifs · rendu)");
  console.log("═".repeat(74) + "\n");

  if (!chromeAvailable()) { fail("Google Chrome introuvable — rendu NON PROUVÉ"); return; }
  const up = await fetch(`${BASE}/`).catch(() => null);
  if (!up?.ok) { fail(`application injoignable sur ${BASE}`); return; }
  ok(`Chrome présent, application joignable sur ${BASE}`);

  const profile = mkdtempSync(join(tmpdir(), "cdp-landing-"));
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

  const viewport = (v: { width: number; height: number }) =>
    cdp.send("Emulation.setDeviceMetricsOverride",
      { width: v.width, height: v.height, deviceScaleFactor: 2, mobile: v.width < 800 }, session);

  const go = async (url: string, marker: string) => {
    // ⚠️ Une session résiduelle redirige /login et /register : on part vierge.
    await cdp.send("Network.clearBrowserCookies", {}, session);
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: `${BASE}${url}` }, session);
    await loaded;
    const rendu = await waitFor(cdp, session, `/${marker}/.test(document.body.innerText)`, 30000);
    return { rendu, m: await measure(cdp, session) };
  };

  const textes: Record<string, string> = {};

  for (const v of [MOBILE, DESKTOP]) {
    console.log(`\n═══ ${v.label.toUpperCase()} ═══\n`);
    await viewport(v);
    for (const p of PAGES) {
      const { rendu, m } = await go(p.url, p.marker);
      check(rendu, `${p.nom} — la page est rendue (${p.url})`);
      if (!rendu) continue;
      if (v.width < 800) {
        textes[p.nom] = m.text;
        console.log(`      → ${await shot(cdp, session, OUT, `landing-${p.nom}-mobile`)}`);
      }
      layout(m, p.nom, v);
    }
  }

  /* ═══════ CONTENU EXIGÉ ═══════ */
  console.log(`\n═══ TARIFS — CE QUI DOIT Y FIGURER ═══\n`);
  const tarifs = textes["tarifs"] ?? "";
  const accueil = textes["accueil"] ?? "";
  for (const [quoi, motif] of [
    ["l'essai de 14 jours", /14 jours/],
    ["Pro à 20 €", /20\s?€/],
    ["Premium à 30 €", /30\s?€/],
    ["Pro en francs CFA (13 100)", /13\s?100\s?F\s?CFA/],
    ["Premium en francs CFA (19 700)", /19\s?700\s?F\s?CFA/],
    ["la parité fixe euro / franc CFA", /655,957/],
    ["l'absence de paiement en ligne", /pas encore de paiement en ligne|aucun prélèvement automatique/i],
  ] as const) {
    check(motif.test(tarifs) && motif.test(accueil),
      `les deux pages annoncent ${quoi}`,
      `accueil:${motif.test(accueil)} · /pricing:${motif.test(tarifs)}`);
  }

  console.log(`\n═══ PREUVE SOCIALE — CE QUI DOIT Y FIGURER ═══\n`);
  check(/Histoires d['’]écoles/i.test(accueil), "la section « Histoires d'écoles » est présente sur l'accueil");
  check(/pas encore de témoignages|préférons cette section vide/i.test(accueil),
    "elle dit explicitement qu'il n'y a pas encore de témoignages");
  check(/accord écrit/i.test(accueil), "elle annonce la règle de publication des futurs témoignages");
  check(/ne fait pas encore/i.test(accueil), "l'accueil énonce ce que le produit NE fait PAS");

  /* ═══════ CONTENU INTERDIT ═══════ */
  console.log(`\n═══ CE QUI NE DOIT PLUS APPARAÎTRE NULLE PART ═══\n`);
  let trouves = 0;
  for (const { motif, pourquoi } of INTERDITS) {
    const pages = Object.entries(textes).filter(([, t]) => motif.test(t)).map(([n]) => n);
    if (pages.length) { trouves++; fail(`« ${motif.source} » — ${pourquoi}`, `trouvé sur : ${pages.join(", ")}`); }
  }
  if (!trouves) ok(`aucun des ${INTERDITS.length} contenus interdits n'apparaît sur les 5 pages`);

  /* ═══════ LIENS ═══════ */
  console.log(`\n═══ LIENS ET ANCRES ═══\n`);
  await viewport(DESKTOP);
  await go("/", "au même endroit");
  const liens = await cdp.send<{ result: { value: { morts: string[]; ancresManquantes: string[] } } }>(
    "Runtime.evaluate",
    {
      returnByValue: true,
      expression: `(() => {
        const a = [...document.querySelectorAll('a[href]')];
        const morts = a.filter((x) => { const h = x.getAttribute('href'); return !h || h === '#' || h === ''; })
          .map((x) => (x.textContent || '').trim().slice(0, 30));
        const ancres = a.map((x) => x.getAttribute('href')).filter((h) => h && h.includes('#'))
          .map((h) => h.split('#')[1]).filter(Boolean);
        const ancresManquantes = [...new Set(ancres)].filter((id) => !document.getElementById(id));
        return { morts, ancresManquantes };
      })()`,
    },
    session,
  );
  const { morts, ancresManquantes } = liens.result.value;
  check(morts.length === 0, "aucun lien mort (href=\"#\") sur l'accueil", morts.join(" · "));
  check(ancresManquantes.length === 0,
    "chaque ancre de la barre de navigation existe réellement sur la page",
    ancresManquantes.map((a) => `#${a}`).join(" · "));

  /* ═══════ COMPOSANTS DORMANTS ═══════ */
  //
  // ⚠️ Contrôle STATIQUE, et c'est volontaire. Neuf composants de la page
  // d'accueil ont été retirés parce qu'ils affirmaient des choses fausses —
  // statistiques inventées, envoi WhatsApp « en un clic », suivi des absences,
  // témoignages fabriqués. Ils restent au dépôt pour leur mise en page. Rien
  // n'empêche techniquement de les réimporter, et une sonde de rendu ne le
  // verrait que si la page était visitée : ce contrôle-ci lit les fichiers.
  console.log(`\n═══ COMPOSANTS DORMANTS ═══\n`);
  const DORMANTS = [
    "AnalyticsSection", "CTASection", "ChaosToControl", "CommunicationSection",
    "FeatureGrid", "ParentExperience", "PillarsSection", "Testimonials", "TestimonialsSection",
  ];
  const fichiers: string[] = [];
  (function parcours(dir: string) {
    for (const e of readdirSync(dir)) {
      const chemin = `${dir}/${e}`;
      if (statSync(chemin).isDirectory()) parcours(chemin);
      else if (chemin.endsWith(".tsx")) fichiers.push(chemin);
    }
  })("src");
  const reveilles = DORMANTS.filter((d) =>
    fichiers.some((f) => !f.endsWith(`landing/${d}.tsx`) && new RegExp(`landing/${d}["'\`]`).test(readFileSync(f, "utf8"))));
  check(reveilles.length === 0,
    `aucun des ${DORMANTS.length} composants dormants n'est réimporté par une page`,
    reveilles.join(" · "));
  const nonMarques = DORMANTS.filter((d) => !readFileSync(`src/components/landing/${d}.tsx`, "utf8").includes("COMPOSANT DORMANT"));
  check(nonMarques.length === 0,
    "chaque composant dormant porte l'avertissement qui dit ce qu'il affirme de faux",
    nonMarques.join(" · "));

  /* ═══════ MARQUE ═══════ */
  console.log(`\n═══ MARQUE ═══\n`);
  const logos = await cdp.send<{ result: { value: { total: number; charges: number } } }>(
    "Runtime.evaluate",
    {
      returnByValue: true,
      expression: `(() => {
        const imgs = [...document.querySelectorAll('img[src*="/brand/"]')];
        return { total: imgs.length, charges: imgs.filter((i) => i.complete && i.naturalWidth > 0).length };
      })()`,
    },
    session,
  );
  const { total, charges } = logos.result.value;
  check(total > 0, "le logotype de marque est présent sur l'accueil", `${total} image(s) /brand/`);
  check(total > 0 && charges === total, "chaque logotype se charge réellement (pas d'image cassée)",
    `${charges}/${total} chargé(s)`);

  cdp.close();
  chrome.kill();
}

main()
  .catch((e) => { fail(`la sonde s'est interrompue : ${e instanceof Error ? e.message : String(e)}`); })
  .finally(() => {
    console.log(`\n${"═".repeat(74)}`);
    console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoué(s)`);
    console.log("═".repeat(74));
    for (const d of dirs) { if (!process.env.SHOT_DIR) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } } }
    process.exit(failures ? 1 : 0);
  });
