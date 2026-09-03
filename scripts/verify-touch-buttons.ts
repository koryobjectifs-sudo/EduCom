/**
 * Sonde TACTILE — la primitive `Button` (phase 2).
 *
 *   npm run script -- scripts/verify-touch-buttons.ts
 *
 * ═══ CE QU'ELLE ÉPROUVE ═══
 *
 * `Button` dessine 32 / 40 / 48 px selon la taille, et `sm` (32 px) couvre 126
 * des 183 boutons du produit. La phase 2 ajoute un plancher de 44 px appliqué
 * au seul pointeur grossier. Trois questions, et une seule d'entre elles ne
 * suffirait pas :
 *
 *   ① Au doigt, tous les boutons de la primitive atteignent-ils 44 px ?
 *   ② Le rendu BUREAU est-il resté à 32 / 40 / 48 ? Un plancher qui déborderait
 *      sur la souris détruirait la densité du poste de travail.
 *   ③ L'agrandissement provoque-t-il un débordement horizontal ? C'est le risque
 *      réel : une ligne d'actions qui tenait à 32 px peut ne plus tenir à 44.
 *
 * ⚠️ Les boutons de la primitive sont reconnus par la classe
 * `pointer-coarse:min-h-11` qu'elle pose elle-même. C'est le seul marqueur
 * fiable : chercher `<button>` attraperait aussi les 238 boutons écrits à la
 * main, qui relèvent de la phase 3 et fausseraient le verdict. Ils sont comptés
 * à part, à titre indicatif.
 *
 * ⚠️ L'émulation tactile est VÉRIFIÉE dans la page (`matchMedia`) avant toute
 * conclusion : `Emulation.setEmulatedMedia` ne couvre ni `hover` ni `pointer`,
 * et la sonde de la phase 1 a mesuré trois fois un navigateur de bureau en
 * croyant mesurer un téléphone.
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

const PORT = Number(process.env.CDP_PORT ?? 9448);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "boutons-"));
const TAG = "SONDEBTN";
const PASSWORD = `Btn-${Math.random().toString(36).slice(2)}-2026!`;
const SEUIL = 44;

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const trash = {
  authIds: [] as string[], userIds: [] as string[], schoolIds: [] as string[],
  classIds: [] as string[], studentIds: [] as string[], dirs: [] as string[],
};

/** Écrans retenus : ceux qui rendent le plus de boutons de la primitive. */
// ⚠️ DEUX marqueurs successifs se sont révélés menteurs :
//   1. « un titre est présent » — le titre arrive dans le HTML du serveur, donc
//      avant tout rendu interactif ;
//   2. « plus de 2 boutons » — la coquille (barre supérieure) en fournit déjà
//      trois à elle seule, sur TOUS les écrans. La sonde mesurait 1 bouton par
//      page, toujours le même, et l'aurait déclaré conforme.
// On attend donc que le nombre de boutons se STABILISE : c'est le seul signal
// qui ne dépend ni du gabarit ni du contenu propre à chaque écran.
const HYDRATE = `(() => {
  const n = document.querySelectorAll("button").length;
  const s = (window.__stab = window.__stab || { n: -1, fois: 0 });
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  // Seuil à 1 bouton et non 4 : sur un écran à l'état vide, la page complète peut
  // n'exposer qu'un ou deux boutons. Exiger davantage faisait expirer l'attente
  // sur l'accueil et la liste d'élèves, qui étaient alors déclarés « non
  // éprouvés » alors qu'ils s'affichaient parfaitement.
  return s.fois >= 5 && n > 0;
})()`;

const ECRANS: { chemin: string; marqueur: string; nom: string }[] = [
  { chemin: "/dashboard", marqueur: HYDRATE, nom: "accueil" },
  { chemin: "/dashboard/settings", marqueur: HYDRATE, nom: "reglages" },
  { chemin: "/dashboard/students", marqueur: HYDRATE, nom: "eleves" },
  { chemin: "/dashboard/classes", marqueur: HYDRATE, nom: "classes" },
  { chemin: "/dashboard/documents/centre", marqueur: HYDRATE, nom: "documents" },
  { chemin: "/dashboard/payments", marqueur: HYDRATE, nom: "finance" },
  { chemin: "/dashboard/team", marqueur: HYDRATE, nom: "equipe" },
  // ⚠️ Écrans ajoutés en phase 3 : ce sont eux qui concentrent les `<button>`
  // écrits à la main (générateurs de documents, saisie, boîte de réception).
  // Les sept premiers écrans n'en montraient que quatre distincts — un
  // échantillon trop étroit pour prétendre couvrir 238 occurrences.
  { chemin: "/dashboard/grades", marqueur: HYDRATE, nom: "notes" },
  { chemin: "/dashboard/communications/inbox", marqueur: HYDRATE, nom: "inbox" },
  { chemin: "/dashboard/documents/drafts", marqueur: HYDRATE, nom: "brouillons" },
  { chemin: "/dashboard/documents/validation", marqueur: HYDRATE, nom: "validation" },
  { chemin: "/dashboard/payments/new", marqueur: HYDRATE, nom: "encaissement" },
  { chemin: "/dashboard/documents/certificate", marqueur: HYDRATE, nom: "certificat" },
  { chemin: "/dashboard/students/import", marqueur: HYDRATE, nom: "import" },
];

/** En dessous, l'échantillon ne dit rien du produit : la sonde refuse de conclure. */
const ECHANTILLON_MINIMAL = 20;

type Releve = {
  /** Boutons de la primitive, visibles, avec leur géométrie. */
  primitifs: { w: number; h: number; carre: boolean; label: string }[];
  /** `<button>` hors primitive, sous le seuil — indicatif, relève de la phase 3. */
  brutsSousSeuil: number;
  brutsTotal: number;
  brutsDetail: { w: number; h: number; label: string; cls: string }[];
  scrollWidth: number;
  clientWidth: number;
};

const RELEVE = `(() => {
  window.scrollTo(0, 0);
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    for (let p = e; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0) return false;
    }
    return true;
  };
  // ⚠️ Reconnaître la primitive par sa CLASSE ne marche plus : la phase 3 a posé
  // la classe de plancher tactile sur des boutons bruts, qui étaient alors
  // comptés comme primitifs — et leurs hauteurs bureau légitimes (24, 34, 36 px)
  // faisaient croire à une perte de densité. L'attribut ne peut pas dériver.
  const prim = [...document.querySelectorAll('button[data-ui="button"]')].filter(visible);
  const tous = [...document.querySelectorAll("button")].filter(visible);
  const bruts = tous.filter((b) => b.getAttribute("data-ui") !== "button");
  return {
    primitifs: prim.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        w: Math.round(r.width), h: Math.round(r.height),
        // Un bouton "icône seule" est carré : on le reconnaît à sa forme, pas à
        // une classe, car la primitive n'en pose aucune de distinctive.
        carre: Math.abs(r.width - r.height) < 6,
        label: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 28),
      };
    }),
    brutsSousSeuil: bruts.filter((b) => b.getBoundingClientRect().height < ${SEUIL} - 0.5).length,
    brutsTotal: bruts.length,
    // Identité des boutons bruts sous le seuil — sans elle, on chercherait à
    // l'aveugle dans 238 occurrences réparties sur 55 fichiers.
    brutsDetail: bruts
      .filter((b) => { const r = b.getBoundingClientRect(); return r.height < ${SEUIL} - 0.5 || r.width < ${SEUIL} - 0.5; })
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          w: Math.round(r.width), h: Math.round(r.height),
          label: (b.getAttribute("aria-label") || b.getAttribute("title") || b.textContent || "").trim().slice(0, 34),
          cls: String(b.className || "").split(" ").slice(0, 5).join(" "),
        };
      }),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
})()`;

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE TACTILE — primitive Button (phase 2)");
  console.log("═".repeat(74) + "\n");

  if (!chromeAvailable()) { fail("Google Chrome introuvable — rendu non éprouvé"); return; }
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) { fail(`application injoignable sur ${BASE}`); return; }

  const admin = createAdminClient();
  const stamp = Date.now();
  const school = await prisma.school.create({
    data: { name: `${TAG} École de sonde`, onboardingCompleted: true, logo: PIXEL, stamp: PIXEL, signature: PIXEL },
    select: { id: true },
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

  // ⚠️ Une école vide ne rend presque aucun bouton : les écrans tombent sur
  // leur état vide. Le premier tour n'a mesuré que 11 boutons sur les 183 du
  // produit — un échantillon dont on ne peut rien conclure. On pose donc de
  // quoi peupler les listes, là où les actions compactes se concentrent.
  const cls = await prisma.class.create({
    data: { name: `${TAG} CM2`, cycle: "ELEMENTAIRE", schoolId: school.id }, select: { id: true },
  });
  trash.classIds.push(cls.id);
  const eleves = await prisma.student.createManyAndReturn({
    data: ["Aminata", "Ousmane", "Fatoumata", "Cheikh"].map((n) => ({
      firstName: `${TAG}-${n}`, lastName: "Ndiaye", schoolId: school.id, status: "ENROLLED" as const,
    })),
    select: { id: true },
  });
  for (const e of eleves) trash.studentIds.push(e.id);
  // ⚠️ Un élève sans inscription n'apparaît dans aucune liste : les écrans
  // seraient restés à leur état vide malgré les fixtures.
  const annee = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  await prisma.enrollment.createMany({
    data: eleves.map((e) => ({ studentId: e.id, classId: cls.id, academicYear: annee })),
  });
  ok(`fixtures : école jetable, 1 classe, ${eleves.length} élèves inscrits`);

  const cookies = await sessionCookies(email, PASSWORD);
  const profile = mkdtempSync(join(tmpdir(), "cdp-btn-"));
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

  const pointage = async (mode: "tactile" | "souris") => {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: mode === "tactile", maxTouchPoints: 5 }, session);
    await cdp.send("Emulation.setEmitTouchEventsForMouse",
      { enabled: mode === "tactile", configuration: mode === "tactile" ? "mobile" : "desktop" }, session);
  };
  const capacites = async () => evaluate<{ coarse: boolean; noHover: boolean }>(cdp, session,
    `({ coarse: matchMedia("(pointer: coarse)").matches, noHover: matchMedia("(hover: none)").matches })`);

  const aller = async (chemin: string, marqueur: string, vp: typeof MOBILE) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: vp.width < 800,
    }, session);
    await cdp.send("Page.navigate", { url: `${BASE}${chemin}` }, session);
    return waitFor(cdp, session, marqueur, 40_000);
  };

  /* ═══════ 1. AU DOIGT ═══════ */
  console.log("\n═══ 1. AU DOIGT — 390 × 844 ═══\n");
  await pointage("tactile");
  await aller(ECRANS[0].chemin, ECRANS[0].marqueur, MOBILE);
  const cap = await capacites();
  check(cap.coarse && cap.noHover, "l'émulation tactile est RÉELLEMENT active",
    "sans cela tout ce qui suit mesure un navigateur de bureau");

  let totalPrim = 0, sousSeuil = 0, brutsSous = 0, brutsTot = 0;
  const debordements: string[] = [];
  const fautifs: string[] = [];

  for (const e of ECRANS) {
    const rendu = await aller(e.chemin, e.marqueur, MOBILE);
    if (!rendu) { fail(`${e.nom} — écran non rendu, non éprouvé`); continue; }
    const r = await evaluate<Releve>(cdp, session, RELEVE);
    const petits = r.primitifs.filter((b) => b.h < SEUIL - 0.5 || (b.carre && b.w < SEUIL - 0.5));
    totalPrim += r.primitifs.length;
    sousSeuil += petits.length;
    brutsSous += r.brutsSousSeuil;
    brutsTot += r.brutsTotal;
    for (const p of petits) fautifs.push(`${e.nom} · « ${p.label} » ${p.w}×${p.h}`);
    const deborde = r.scrollWidth > r.clientWidth + 1;
    if (deborde) debordements.push(`${e.nom} (${r.scrollWidth} > ${r.clientWidth})`);
    console.log(`      ${e.nom.padEnd(11)} ${String(r.primitifs.length).padStart(3)} boutons primitifs · ${petits.length} sous le seuil · ${r.brutsTotal} bruts (${r.brutsSousSeuil} sous le seuil) · largeur ${r.scrollWidth}/${r.clientWidth}`);
    if (process.env.DETAIL_BRUTS === "1") {
      for (const b of r.brutsDetail) {
        console.log(`         · brut ${String(b.w).padStart(3)}×${String(b.h).padStart(3)}  « ${b.label || "(sans libellé)"} »  [${b.cls}]`);
      }
    }
    if (e.nom === "reglages" || e.nom === "documents") {
      console.log(`      → ${await shot(cdp, session, OUT, `boutons-${e.nom}-mobile`)}`);
    }
  }

  check(totalPrim >= ECHANTILLON_MINIMAL,
    `échantillon suffisant au doigt : ${totalPrim} boutons de la primitive mesurés`,
    `seulement ${totalPrim} boutons mesurés (minimum ${ECHANTILLON_MINIMAL}) : un vert sur si peu ne prouverait rien`);
  check(sousSeuil === 0, `les ${totalPrim} boutons de la primitive atteignent ${SEUIL} px au doigt`,
    fautifs.slice(0, 6).join("\n      "));
  check(debordements.length === 0, "aucun débordement horizontal introduit sur mobile",
    debordements.join(" | "));
  console.log(`\n      (phase 3, indicatif : ${brutsSous} boutons bruts sur ${brutsTot} restent sous ${SEUIL} px)`);

  /* ═══════ 1 bis. LES CONTRÔLES MODIFIÉS RÉPONDENT-ILS ENCORE ? ═══════ */
  //
  // ⚠️ Mesurer une géométrie ne prouve pas qu'un bouton MARCHE. Les onglets de
  // Finance portent role="tab" / aria-selected : on en actionne un pour de vrai
  // et on vérifie que la sélection se déplace. C'est le seul contrôle modifié
  // dont l'état est observable sans écrire en base.
  console.log("\n═══ 1 bis. FONCTIONNEMENT APRÈS MODIFICATION ═══\n");
  const surFinance = await aller("/dashboard/payments", HYDRATE, MOBILE);
  if (!surFinance) { fail("écran Finance non rendu — fonctionnement non éprouvé"); }
  else {
    const avant = await evaluate<string[]>(cdp, session,
      `[...document.querySelectorAll('[role="tab"]')].map((t) => t.getAttribute("aria-selected"))`);
    const clique = await evaluate<boolean>(cdp, session, `(() => {
      const t = [...document.querySelectorAll('[role="tab"]')];
      const cible = t.find((x) => x.getAttribute("aria-selected") !== "true");
      if (!cible) return false;
      cible.click();
      return true;
    })()`);
    check(clique, "un onglet Finance non sélectionné a pu être actionné");
    const apres = await evaluate<string[]>(cdp, session,
      `[...document.querySelectorAll('[role="tab"]')].map((t) => t.getAttribute("aria-selected"))`);
    console.log(`      aria-selected : ${avant.join(", ")} → ${apres.join(", ")}`);
    check(avant.join() !== apres.join(),
      "la sélection s'est déplacée : l'onglet modifié fonctionne toujours",
      "aria-selected inchangé après le clic — la modification a cassé le contrôle");
  }

  /* ═══════ 2. À LA SOURIS — la densité bureau doit être intacte ═══════ */
  console.log("\n═══ 2. À LA SOURIS — 1440 × 900 ═══\n");
  await pointage("souris");
  await aller(ECRANS[1].chemin, ECRANS[1].marqueur, DESKTOP);
  const capD = await capacites();
  check(!capD.coarse && !capD.noHover, "le pointeur fin est RÉELLEMENT rétabli");

  const hauteurs = new Set<number>();
  let nbBureau = 0;
  for (const e of ECRANS) {
    const rendu = await aller(e.chemin, e.marqueur, DESKTOP);
    if (!rendu) { fail(`${e.nom} — écran non rendu en bureau, non éprouvé`); continue; }
    const r = await evaluate<Releve>(cdp, session, RELEVE);
    nbBureau += r.primitifs.length;
    for (const b of r.primitifs) hauteurs.add(b.h);
  }
  // ⚠️ Sans ce contrôle, une passe bureau qui ne rend AUCUN bouton passe au
  // vert : l'ensemble des hauteurs inattendues est alors vide. C'est
  // exactement ce qui s'est produit au premier tour.
  //
  // Le critère n'est PAS un simple comptage. Le bureau rend légitimement moins
  // de boutons que le mobile — certains n'existent que dans la coquille
  // mobile — et un seuil numérique ne dirait rien de ce qu'on cherche à
  // prouver. Ce qui compte, c'est que **les trois tailles** aient été
  // observées : si 32, 40 et 48 px sont toutes présentes, aucune classe de
  // taille n'a été altérée par le plancher tactile.
  const troisTailles = [32, 40, 48].filter((a) => [...hauteurs].some((h) => Math.abs(h - a) <= 1));
  check(nbBureau >= 10 && troisTailles.length === 3,
    `échantillon bureau probant : ${nbBureau} boutons, les trois tailles observées`,
    `${nbBureau} boutons mesurés, tailles vues : ${troisTailles.join(", ") || "aucune"} — il en manque pour conclure`);

  // ⚠️ 1 px de tolérance : une mise en page fractionnaire arrondit un `h-8` à
  // 33 px. Exiger l'égalité stricte ferait échouer un rendu parfaitement intact.
  const attendues = [32, 40, 48];
  const inattendues = [...hauteurs]
    .filter((h) => !attendues.some((a) => Math.abs(h - a) <= 1))
    .sort((a, b) => a - b);
  console.log(`      hauteurs observées en bureau : ${[...hauteurs].sort((a, b) => a - b).join(", ")} px`);
  check(inattendues.length === 0,
    "le rendu bureau garde exactement les hauteurs 32 / 40 / 48 px",
    `hauteurs inattendues : ${inattendues.join(", ")} px — la densité du poste de travail a changé`);

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
      await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
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
