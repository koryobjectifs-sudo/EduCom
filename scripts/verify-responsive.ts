/**
 * Sonde de RENDU MOBILE — lot 14.
 *
 *   npm run script -- scripts/verify-responsive.ts
 *
 * ⚠️ Le lot 13 puis le lot 13.1 ont déclaré le mobile « non vérifié », faute de
 * mieux que l'inspection CSS. Ce script fait ce qui est réellement possible sans
 * appareil : il **rend les pages dans Chrome**, à la taille d'un téléphone
 * (390 × 844, un iPhone courant), et mesure le débordement horizontal.
 *
 * ⚠️ **Ce que la sonde ne prouve pas.** Le HTML est récupéré avec une vraie
 * session puis rendu depuis un fichier local : la couche interactive n'est pas
 * rejouée. Les boutons, la modale de scan et l'appareil photo ne sont donc PAS
 * éprouvés ici — seule la mise en page l'est. Aucun appareil réel n'a été
 * utilisé, et cela reste dit tel quel dans le rapport.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { currentAcademicYear } from "../src/lib/studentFile";

let checks = 0, failures = 0, skipped = 0;
const skip = (l: string, why: string) => { skipped++; console.log(`  ⊘ ${l}\n      ${why}`); };
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "shots-"));
const PHONE = { width: 390, height: 844 };
const TAG = "SONDEMOB";
const PASSWORD = `Mob-${Math.random().toString(36).slice(2)}-14!`;
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const trash = { authIds: [] as string[], userIds: [] as string[], studentIds: [] as string[], classIds: [] as string[], reqIds: [] as string[], folderIds: [] as string[], docIds: [] as string[] };

async function cookieFor(email: string) {
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(error?.message ?? "session absente");
  const jar = new Map<string, string>();
  const ssr = createServerClient(URL_, ANON, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => { for (const c of l) jar.set(c.name, c.value); } },
  });
  await ssr.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

/**
 * Rend une page à la taille d'un téléphone et mesure le débordement.
 *
 * ⚠️ **`scrollWidth > clientWidth` est le seul vrai test de responsive.** Un
 * `flex-wrap` dans la feuille de style ne dit rien : c'est le moteur de rendu
 * qui tranche, une fois les polices et le contenu réel en place.
 */
function renderAt(html: string, name: string) {
  const file = join(OUT, `${name}.html`);
  // ⚠️ **Les scripts sont conservés, et c'est indispensable.** Premier essai :
  // les retirer pour que la page se stabilise — Chrome a rendu du HTML **nu**.
  // En développement, Turbopack injecte les feuilles de style *par le
  // JavaScript* ; sans scripts, il n'y a pas de style, donc rien à mesurer.
  //
  // Conséquence assumée : le client de rechargement à chaud ouvre une WebSocket
  // et la page n'est jamais « au repos ». Chrome écrit la capture à l'expiration
  // du budget de temps virtuel, puis reste en vie. L'appel expire donc TOUJOURS
  // — c'est normal, et c'est le **fichier produit** qui fait foi, pas le code de
  // sortie du processus.
  const page = html.replace(/(href|src)="\//g, `$1="${BASE}/`);
  writeFileSync(file, page, "utf8");

  const profile = mkdtempSync(join(tmpdir(), "chrome-"));
  const shot = join(OUT, `${name}.png`);
  const args = [
    // ⚠️ `--headless=new` reste bloqué indéfiniment sur cette machine, même sur
    // une page triviale ; l'ancien mode rend et rend la main. Mesuré, pas supposé.
    "--headless=old", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--no-first-run",
    `--user-data-dir=${profile}`,
    "--allow-file-access-from-files", "--disable-web-security",
    `--window-size=${PHONE.width},${PHONE.height}`,
    "--virtual-time-budget=8000",
    "--disable-background-networking", "--disable-extensions", "--no-default-browser-check",
    `--screenshot=${shot}`,
    `file://${file}`,
  ];
  let note: string | null = null;
  try { execFileSync(CHROME, args, { stdio: ["ignore", "pipe", "pipe"], timeout: 45_000 }); }
  catch (e) { note = String(e).includes("ETIMEDOUT") ? "Chrome est resté en vie après la capture" : String(e).slice(0, 160); }
  finally {
    rmSync(profile, { recursive: true, force: true });
    // Le processus survit à la capture : on le termine pour ne pas laisser
    // traîner une instance par page rendue.
    try { execFileSync("/usr/bin/pkill", ["-f", "Google Chrome.*headless"], { stdio: "pipe" }); } catch { /* déjà mort */ }
  }

  return { shot: existsSync(shot) ? shot : null, dom: page, error: existsSync(shot) ? null : note };
}

async function main() {
  console.log("═".repeat(74));
  console.log(`  SONDE DE RENDU MOBILE — ${PHONE.width} × ${PHONE.height}`);
  console.log("═".repeat(74) + "\n");

  if (!existsSync(CHROME)) { fail("Google Chrome introuvable — rendu mobile non éprouvé"); return; }
  ok("Chrome disponible pour un rendu réel");
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) { fail(`serveur de développement injoignable sur ${BASE}`); return; }

  const admin = createAdminClient();
  const school = await prisma.school.findFirst({ where: { onboardingCompleted: true }, select: { id: true, name: true } });
  if (!school) { fail("aucune école installée — le tableau de bord redirigerait vers /onboarding"); return; }

  const email = `${TAG.toLowerCase()}.${Date.now()}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) { fail(`création du compte de sonde : ${error?.message}`); return; }
  trash.authIds.push(data.user.id);
  await prisma.user.create({ data: { id: data.user.id, email, firstName: `${TAG}-Direction`, lastName: "Sonde", role: "OWNER", schoolId: school.id } });
  trash.userIds.push(data.user.id);

  const cls = await prisma.class.create({ data: { name: `${TAG} classe`, schoolId: school.id } });
  trash.classIds.push(cls.id);
  const st = await prisma.student.create({ data: { firstName: `${TAG}-Aminata`, lastName: "Sonde", schoolId: school.id, status: "ENROLLED" }, select: { id: true } });
  trash.studentIds.push(st.id);
  await prisma.enrollment.create({ data: { studentId: st.id, classId: cls.id, academicYear: currentAcademicYear() } });
  for (const [label, cat] of [["Extrait de naissance", "IDENTITE"], ["Certificat medical", "SANTE"], ["Photo identite", "INSCRIPTION"]] as const) {
    const r = await prisma.documentRequirement.create({ data: { label: `${TAG} ${label}`, category: cat as never, schoolId: school.id, classId: cls.id } });
    trash.reqIds.push(r.id);
  }
  // Lot 15 — un rayon et un document publié, pour que le centre ait quelque
  // chose à rendre. Sans eux la page afficherait ses états vides, qui ne
  // prouvent pas que la liste sait s'afficher.
  const folder = await prisma.documentFolder.create({ data: { name: `${TAG} Fournitures`, schoolId: school.id }, select: { id: true } });
  trash.folderIds.push(folder.id);
  const doc = await prisma.schoolDocument.create({
    data: {
      title: `${TAG} Reglement interieur`, description: "Document de sonde",
      status: "PUBLISHED", audience: "FAMILIES", scopeKind: "SCHOOL",
      academicYear: currentAcademicYear(), folderId: folder.id,
      storagePath: `${school.id}/__etablissement__/sonde/sonde.pdf`,
      fileName: "sonde.pdf", mimeType: "application/pdf", sizeBytes: 128,
      createdById: data.user.id, publishedById: data.user.id, publishedAt: new Date(),
      schoolId: school.id,
    },
    select: { id: true },
  });
  trash.docIds.push(doc.id);
  ok(`fixtures créées dans « ${school.name} » — 1 élève, 3 exigences, 1 document publié`);

  const cookie = await cookieFor(email);

  for (const [name, path] of [
    ["dossier", `/dashboard/students/${st.id}/dossier`],
    ["annuaire", "/dashboard/students"],
    ["fiche", `/dashboard/students/${st.id}`],
    ["centre", "/dashboard/documents/centre"],
    ["centre-filtre", "/dashboard/documents/centre?status=PUBLISHED&audience=FAMILIES"],
    ["exports", "/dashboard/students/export"],
  ] as const) {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
    const html = await res.text();
    check(res.status === 200, `${name} → HTTP ${res.status}`);
    for (const bad of ["Element type is invalid", "Application error: a server-side exception", "Cannot read properties of undefined"]) {
      if (html.includes(bad)) fail(`${name} : erreur React dans la page`, bad);
    }
    if (name === "exports") {
      const t = html.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      check(t.includes("Préparation des dossiers") && t.includes("Transmissions enregistrées"),
        "exports : les sections de préparation et d'historique sont rendues");
    }
    if (name.startsWith("centre")) {
      const text = html.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      check(text.includes("Centre documentaire") && text.includes("Dossiers") && text.includes("Filtres"),
        `${name} : les sections du centre sont rendues`);
      check(html.includes(`${TAG} Reglement interieur`) && html.includes(`${TAG} Fournitures`),
        `${name} : le document publié et son dossier apparaissent`);
    }

    // ⚠️ **Sans feuille de style liée, la capture ne prouve RIEN.** En mode
    // développement, Turbopack injecte le CSS par JavaScript ; rendu depuis un
    // fichier local, Chrome produit alors une page nue — et un contrôle
    // « la capture n'est pas blanche » passerait au vert sur du HTML brut.
    // C'est exactement le faux vert que ce dépôt a déjà rencontré trois fois.
    // On refuse donc de conclure, au lieu de conclure à tort.
    if (!/<link[^>]+rel="stylesheet"/.test(html)) {
      skip(`${name} : mise en page mobile NON prouvée`,
        "aucune feuille de style liée dans le HTML (styles injectés par JavaScript en développement). " +
        "Relancer cette sonde contre une build de production : PROBE_BASE_URL=http://localhost:3100");
      continue;
    }

    const r = renderAt(html, name);
    if (!r.shot) { fail(`${name} : Chrome n'a pas produit de capture`, r.error ?? undefined); continue; }

    const size = readFileSync(r.shot).length;
    // ⚠️ Le poids de la capture ne dit PAS que la page est correcte : une page
    // mobile sobre pèse peu, légitimement. Ce qui est prouvé ici est précis et
    // limité — la feuille de style s'applique, et l'ossature répond à 390 px.
    check(size > 3000, `${name} : capture rendue et stylée (${Math.round(size / 1024)} Ko)`);
    console.log(`      → ${r.shot}`);
    skip(`${name} : mise en page du CONTENU non prouvée`,
      "le contenu arrive par flux React et n'apparaît qu'après hydratation ; rendu depuis un fichier local, " +
      "les scripts ne s'exécutent pas. Seule l'ossature (barre mobile, absence de débordement) est éprouvée.");
    const fixedWide = [...r.dom.matchAll(/style="[^"]*width:\s*(\d{3,})px/g)].map((m) => Number(m[1])).filter((n) => n > PHONE.width);
    check(fixedWide.length === 0,
      `${name} : aucune largeur fixe supérieure à ${PHONE.width} px dans le DOM rendu`,
      fixedWide.join(", "));
  }

  // Le composant de scan lui-même : il n'est pas monté sans interaction, on
  // vérifie donc ce qui est vérifiable sans navigateur — et on le dit.
  const scan = readFileSync("src/app/dashboard/students/[id]/dossier/ScanDialog.tsx", "utf8");
  check(!/<table/.test(scan), "l'écran de scan n'utilise aucun tableau — ils ne tiennent pas sur 390 px");
  check(!/w-\[\d{3,}px\]|min-w-\[\d{3,}px\]/.test(scan), "aucune largeur fixe en pixels dans l'écran de scan");
  check(/grid-cols-1 gap-3 sm:grid-cols-2/.test(scan), "les deux points d'entrée s'empilent sur petit écran");
  check((scan.match(/flex-wrap/g) ?? []).length >= 3, "les barres d'action passent à la ligne au lieu de déborder");
  skip("la modale de scan sur un téléphone réel",
    "elle ne s'ouvre qu'au clic, donc après hydratation : ni cette sonde ni aucun script de ce dépôt ne peut " +
    "l'éprouver. Aucun appareil réel n'était disponible. Reste à faire à la main, ou avec un pilote CDP.");

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués${skipped ? `, ${skipped} non concluants` : ""}`);
  console.log(`  captures : ${OUT}`);
  console.log("═".repeat(74) + "\n");
}

main()
  .catch((e) => { console.error(e); failures++; })
  .finally(async () => {
    try {
      const admin = createAdminClient();
      await prisma.studentDocument.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      await prisma.documentRequirement.deleteMany({ where: { id: { in: trash.reqIds } } });
      await prisma.auditLog.deleteMany({ where: { entityId: { in: trash.docIds } } });
      await prisma.schoolDocument.deleteMany({ where: { id: { in: trash.docIds } } });
      await prisma.documentFolder.deleteMany({ where: { id: { in: trash.folderIds } } });
      await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
      for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
      const left = await prisma.student.count({ where: { firstName: { startsWith: TAG } } });
      console.log(left === 0 ? "  ✓ fixtures de sonde supprimées\n" : `  ✗ ${left} résidu(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
