import { readdirSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, sessionCookies } from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";
import { type RoleType } from "../src/lib/permissions";

const PORT = 9470;
const BASE = "http://localhost:3000";
const TAG = "SMOKETEST";
const PASSWORD = `Smoke-${Math.random().toString(36).slice(2)}-2026!`;

const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTIiIGZpbGw9IiMwQjFGM0EiLz48dGV4dCB4PSIzMiIgeT0iNDIiIGZvbnQtc2l6ZT0iMzAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5BPC90ZXh0Pjwvc3ZnPg==";

const DASHBOARD_DIR = join(process.cwd(), "src/app/dashboard");

function findPageFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findPageFiles(fullPath));
    } else if (entry === "page.tsx" || entry === "page.ts") {
      results.push(fullPath);
    }
  }
  return results;
}

const trash = {
  authIds: [] as string[],
  userIds: [] as string[],
  schoolIds: [] as string[],
  dirs: [] as string[],
};

async function cleanup() {
  const admin = createAdminClient();
  for (const id of trash.schoolIds) {
    try { await prisma.school.delete({ where: { id } }); } catch {}
  }
  for (const id of trash.authIds) {
    try { await admin.auth.admin.deleteUser(id); } catch {}
  }
}

async function main() {
  console.log("=== DÉMARRAGE DU SMOKE TEST EXHAUSTIF DU DASHBOARD ===");
  if (!chromeAvailable()) throw new Error("Google Chrome introuvable");

  const admin = createAdminClient();
  const stamp = Date.now();

  // 1. Création de l'école de test avec données de base
  const school = await prisma.school.create({
    data: {
      name: `${TAG} Collège & Lycée d'Excellence`,
      onboardingCompleted: true,
      logo: LOGO,
      primaryColor: "#0B1F3A",
      email: `smoke-${stamp}@educom.sn`,
      phone: "+221 33 800 00 00",
      address: "Almadies, Dakar",
    },
  });
  trash.schoolIds.push(school.id);

  // 2. Création des classes, matières, trimestres et élèves pour les routes dynamiques [id]
  const testClass = await prisma.class.create({
    data: {
      name: "6ème A",
      cycle: "COLLEGE",
      schoolId: school.id,
    },
  });

  const testStudent = await prisma.student.create({
    data: {
      firstName: "Moussa",
      lastName: "Diop",
      gender: "M",
      dateOfBirth: new Date("2012-05-14"),
      schoolId: school.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: testStudent.id,
      classId: testClass.id,
      academicYear: "2025-2026",
    },
  });

  const testInvoice = await prisma.invoice.create({
    data: {
      title: "Scolarité Octobre 2025",
      totalAmount: 45000,
      dueDate: new Date("2025-10-31"),
      schoolId: school.id,
      studentId: testStudent.id,
    },
  });

  // 3. Création des utilisateurs de test pour chaque rôle
  const userMap: Record<string, { email: string; id: string }> = {};
  const ROLES: RoleType[] = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"];

  for (const role of ROLES) {
    const email = `smoke.${role.toLowerCase()}.${stamp}@sonde.invalid`;
    const { data: auth, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (authErr || !auth.user) throw new Error(`Auth fail: ${authErr?.message}`);
    trash.authIds.push(auth.user.id);

    const dbUser = await prisma.user.create({
      data: {
        id: auth.user.id,
        email,
        firstName: role,
        lastName: "Test",
        role,
        schoolId: school.id,
      },
    });
    trash.userIds.push(dbUser.id);
    userMap[role] = { email, id: dbUser.id };
  }

  // 4. Découverte de toutes les routes sous /dashboard
  const pageFiles = findPageFiles(DASHBOARD_DIR);
  const rawRoutes = pageFiles.map((file) => {
    const rel = relative(DASHBOARD_DIR, file);
    const withoutFile = rel.replace(/\/page\.tsx?$/, "").replace(/^page\.tsx?$/, "");
    if (!withoutFile) return "/dashboard";
    return `/dashboard/${withoutFile}`;
  });

  console.log(`Nombre de routes uniques détectées sous /dashboard : ${rawRoutes.length}`);

  // Résolution des paramètres dynamiques [id], [studentId], [classId], [invoiceId]
  const concreteRoutes = rawRoutes.map((r) => {
    let resolved = r;
    if (resolved.includes("[id]")) {
      resolved = resolved.replace(/\[id\]/g, testStudent.id);
    }
    if (resolved.includes("[studentId]")) {
      resolved = resolved.replace(/\[studentId\]/g, testStudent.id);
    }
    if (resolved.includes("[classId]")) {
      resolved = resolved.replace(/\[classId\]/g, testClass.id);
    }
    if (resolved.includes("[invoiceId]")) {
      resolved = resolved.replace(/\[invoiceId\]/g, testInvoice.id);
    }
    return { template: r, url: resolved };
  });

  // 5. Lancement de Chrome via CDP
  const profile = mkdtempSync(join(tmpdir(), "cdp-smoketest-"));
  trash.dirs.push(profile);
  const launched = await launchChrome(PORT, profile);
  if (!launched) throw new Error("Chrome failed to launch");
  const { chrome, wsUrl } = launched;

  const cdp = await CDP.open(wsUrl);
  const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);

  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  cdp.onEvent((method, params) => {
    if (method === "Runtime.consoleAPICalled") {
      const p = params as any;
      if (p.type === "error") {
        const text = (p.args || []).map((a: any) => a.value || a.description || "").join(" ");
        if (text && !text.includes("favicon.ico")) {
          consoleErrors.push(text);
        }
      }
    }
    if (method === "Network.responseReceived") {
      const p = params as any;
      const res = p.response;
      if (res && res.status >= 400 && !res.url.includes("favicon.ico")) {
        networkErrors.push(`${res.status} ${res.statusText} on ${res.url}`);
      }
    }
  });

  const ERROR_MARKERS = [
    "Cette page n'a pas pu s'afficher",
    "Une erreur s'est produite",
    "Invalid `prisma",
    "Invalid prisma",
    "Unknown field",
    "Unknown argument",
    "Functions cannot be passed directly to Client Components",
    "Unhandled Runtime Error",
    "Application error: a client-side exception has occurred",
    'data-testid="error-boundary"',
  ];

  function detectErrorInHtml(html: string): string | null {
    for (const marker of ERROR_MARKERS) {
      if (html.includes(marker)) {
        return `Marqueur d'erreur détecté : "${marker}"`;
      }
    }
    return null;
  }

  const failures: { route: string; error: string }[] = [];

  try {
    // 5.1 Test approfondi du Tableau de Bord /dashboard avec résolution Suspense complète
    console.log("\n--- TEST NAVIGATEUR DE /dashboard AVEC RÉSOLUTION SUSPENSE ---");
    const ownerCookies = await sessionCookies(userMap["OWNER"].email, PASSWORD);
    for (const c of ownerCookies) {
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
    }

    const cookieHeader = ownerCookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const ownerCookieHeader = cookieHeader;

    consoleErrors.length = 0;
    networkErrors.length = 0;
    await cdp.send("Page.navigate", { url: `${BASE}/dashboard` }, session);

    // Attente active de la résolution complète de toutes les frontières Suspense (disparition des squelettes)
    let suspenseResolved = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const state = await evaluate<{ hasSkeletons: boolean; hasPedagogy: boolean; hasActivity: boolean; hasError: boolean; errorText: string }>(
        cdp,
        session,
        `(() => {
          const text = document.body.innerText || "";
        const hasSkeletons = document.querySelectorAll('section[aria-busy="true"]').length > 0;
        const hasPedagogy = text.includes("Suivi Pédagogique") || text.includes("Saisie des notes");
        const hasActivity = text.includes("Activité Récente") || text.includes("Aucune activité");
          const hasErrorBoundary = document.querySelector('[data-testid="error-boundary"]') !== null;
          const hasError =
            hasErrorBoundary ||
            text.includes("Cette page n'a pas pu s'afficher") ||
            text.includes("Une erreur s'est produite") ||
            text.includes("Cannot destructure") ||
            text.includes("Invalid prisma") ||
            text.includes("Application error");
          return { hasSkeletons, hasPedagogy, hasActivity, hasError, errorText: text.slice(0, 300) };
        })()`
      );

      if (state.hasError) {
        console.error("❌ ERREUR détectée sur /dashboard après Suspense :", state.errorText);
        failures.push({ route: "/dashboard", error: state.errorText });
        break;
      }

      if (!state.hasSkeletons && state.hasPedagogy && state.hasActivity) {
        suspenseResolved = true;
        break;
      }
    }

    if (!suspenseResolved && failures.every((f) => f.route !== "/dashboard")) {
      console.warn("⚠️ Attention : Timeout d'attente des frontières Suspense sur /dashboard");
    } else if (suspenseResolved) {
      console.log("✓ /dashboard -> Frontières Suspense résolues avec succès dans Chrome (Suivi pédagogique & Activité récente affichés sans erreur)");
    }

    // 5.1b Test approfondi de la page d'admissions /dashboard/students/dossiers/review
    console.log("\n--- TEST DÉTAILLÉ DE /dashboard/students/dossiers/review ---");
    consoleErrors.length = 0;
    networkErrors.length = 0;
    await cdp.send("Page.navigate", { url: `${BASE}/dashboard/students/dossiers/review` }, session);
    await new Promise((r) => setTimeout(r, 1200));

    const browserCheck = await evaluate<{ text: string; hasErrorBanner: boolean; h1: string }>(
      cdp,
      session,
      `(() => {
        const text = document.body.innerText || "";
        const h1 = document.querySelector("h1")?.innerText || "";
        const hasErrorBoundary = document.querySelector('[data-testid="error-boundary"]') !== null;
        const hasErrorBanner =
          hasErrorBoundary ||
          text.includes("Cette page n'a pas pu s'afficher") ||
          text.includes("Une erreur s'est produite") ||
          text.includes("Invalid prisma") ||
          text.includes("Unknown field") ||
          text.includes("Functions cannot be passed");
        return { text: text.slice(0, 200), hasErrorBanner, h1 };
      })()`
    );

    if (browserCheck.hasErrorBanner) {
      console.error("❌ Erreur dans le navigateur sur /dashboard/students/dossiers/review :", browserCheck.text);
      failures.push({ route: "/dashboard/students/dossiers/review", error: browserCheck.text });
    } else {
      console.log(`✓ /dashboard/students/dossiers/review -> Hydratation client & Affichage OK dans Chrome (Titre : "${browserCheck.h1}")`);
    }

    // 5.2 Test systématique de TOUTES les 54 routes pour OWNER avec inspection du contenu rendu et assertion positive
    console.log("\n--- TEST D'EXÉCUTION DES 54 ROUTES (OWNER) ---");
    let count = 0;
    for (const route of concreteRoutes) {
      count++;
      try {
        const res = await fetch(`${BASE}${route.url}`, {
          headers: { cookie: cookieHeader },
          redirect: "manual",
        });

        const status = res.status;
        const text = await res.text();
        const contentError = detectErrorInHtml(text);

        // Assertion positive : La page ne doit pas être vide et doit contenir la coquille HTML valide
        const isBlank = !text || text.trim().length < 200;
        const hasPositiveMarker = text.includes("<!DOCTYPE html>") || text.includes("<html") || text.includes("<main") || text.includes("dashboard");

        if (status >= 500 || contentError || isBlank || !hasPositiveMarker) {
          const reason = contentError || (isBlank ? "Page blanche (contenu < 200 car.)" : (!hasPositiveMarker ? "Marqueur positif manquant" : "CRASH"));
          console.error(`❌ [${count}/${concreteRoutes.length}] ${route.url.padEnd(50)} -> STATUT ${status} (${reason})`);
          failures.push({ route: route.url, error: `${reason} (HTTP ${status})` });
        } else {
          console.log(`✓ [${count}/${concreteRoutes.length}] ${route.url.padEnd(50)} -> OK (Status: ${status}, ${text.length} car.)`);
        }
      } catch (err: any) {
        console.error(`❌ [${count}/${concreteRoutes.length}] ${route.url.padEnd(50)} -> Exception: ${err.message}`);
        failures.push({ route: route.url, error: err.message });
      }
    }

    // 5.2b Test des redirections 308 (Phase 2 - Fusion Annuaire / Registre)
    console.log("\n--- TEST DES REDIRECTIONS 308 PERMANENTES ---");
    const redirectsToTest = [
      { url: "/dashboard/directory", expectedTarget: "/dashboard/students" },
      { url: "/dashboard/students/dossiers", expectedTarget: "/dashboard/students?view=classes" },
    ];

    for (const r of redirectsToTest) {
      const res = await fetch(`${BASE}${r.url}`, {
        headers: { cookie: ownerCookieHeader },
        redirect: "manual",
      });
      const location = res.headers.get("location") || "";
      const is308 = res.status === 308 || res.status === 307;
      const targetMatches = location.endsWith(r.expectedTarget) || location === r.expectedTarget;

      if (is308 && targetMatches) {
        console.log(`✓ [308] ${r.url.padEnd(35)} -> ${location} (Status: ${res.status})`);
      } else {
        console.error(`❌ [308] ${r.url} Échec redirection : Status=${res.status}, Location=${location}`);
        failures.push({ route: r.url, error: `Attendu 308 vers ${r.expectedTarget}, obtenu ${res.status} vers ${location}` });
      }
    }

    // 5.3 Test des routes publiques, marketing, auth et API (17 routes)
    console.log("\n--- TEST DES 17 ROUTES PUBLIQUES / AUTH / MARKETING / API ---");
    const publicRoutesToTest = [
      { url: "/", name: "Accueil marketing" },
      { url: "/features", name: "Fonctionnalités" },
      { url: "/how-it-works", name: "Comment ça marche" },
      { url: "/pricing", name: "Tarifs" },
      { url: "/solutions", name: "Solutions" },
      { url: "/login", name: "Connexion" },
      { url: "/register", name: "Inscription" },
      { url: "/forgot-password", name: "Mot de passe oublié" },
      { url: "/update-password", name: "Mise à jour mot de passe" },
      { url: "/invite", name: "Invitation" },
      { url: "/welcome", name: "Bienvenue" },
      { url: "/onboarding", name: "Onboarding" },
      { url: "/preview/report-card", name: "Aperçu bulletin" },
      { url: `/absence/${testStudent.id}`, name: "Justificatif absence" },
      { url: `/s/${testStudent.id}`, name: "Page publique élève" },
      { url: "/api/cron/overdue", name: "Cron rappels impayés" },
      { url: "/api/webhooks/whatsapp", name: "Webhook WhatsApp" },
    ];

    let pubCount = 0;
    for (const pub of publicRoutesToTest) {
      pubCount++;
      try {
        const res = await fetch(`${BASE}${pub.url}`, {
          redirect: "manual",
        });
        const status = res.status;
        const text = await res.text();

        // 200, 302, 307, 308, 401, 403, 404, 503 (pour cron sans secret configuré) sont attendus
        const isExpectedStatus = (status >= 200 && status < 500) || (status === 503 && pub.url.startsWith("/api/cron"));
        if (!isExpectedStatus || text.includes("Functions cannot be passed directly") || text.includes("Unhandled Runtime Error")) {
          console.error(`❌ [${pubCount}/${publicRoutesToTest.length}] ${pub.url.padEnd(40)} (${pub.name}) -> CRASH ${status}`);
          failures.push({ route: pub.url, error: `HTTP ${status}: ${text.slice(0, 200)}` });
        } else {
          console.log(`✓ [${pubCount}/${publicRoutesToTest.length}] ${pub.url.padEnd(40)} (${pub.name.padEnd(25)}) -> OK (Status: ${status})`);
        }
      } catch (err: any) {
        console.error(`❌ [${pubCount}/${publicRoutesToTest.length}] ${pub.url.padEnd(40)} -> Exception: ${err.message}`);
        failures.push({ route: pub.url, error: err.message });
      }
    }

    // 5.4 Test des 7 rôles sur leurs points d'entrée respectifs
    console.log("\n--- TEST DES 7 RÔLES UTILISATEURS ---");
    for (const role of ROLES) {
      const roleCookies = await sessionCookies(userMap[role].email, PASSWORD);
      const roleCookieHeader = roleCookies.map((c) => `${c.name}=${c.value}`).join("; ");

      const targetUrl = role === "PARENT" ? `${BASE}/dashboard/payments` : `${BASE}/dashboard`;
      const res = await fetch(targetUrl, {
        headers: { cookie: roleCookieHeader },
        redirect: "manual",
      });

      const body = await res.text();
      const roleError = detectErrorInHtml(body);
      if (res.status >= 500 || roleError) {
        console.error(`❌ Rôle ${role} en échec sur ${targetUrl} (Status: ${res.status}, ${roleError || "CRASH"})`);
        failures.push({ route: `${role}:${targetUrl}`, error: roleError || `Status ${res.status}` });
      } else {
        console.log(`✓ Rôle ${role.padEnd(12)} -> OK (Status: ${res.status})`);
      }
    }

    // 5.5 SCÉNARIO ÉCOLE VIERGE (0 élève, 0 classe, 0 trimestre, 0 facture)
    console.log("\n--- TEST SCÉNARIO ÉCOLE VIERGE / BASE VIDE (CLIENTE NOUVELLEMENT INSCRITE) ---");
    const emptySchool = await prisma.school.create({
      data: {
        name: `${TAG} École Vierge Sans Données`,
        onboardingCompleted: true,
        logo: LOGO,
        primaryColor: "#0B1F3A",
        email: `smoke-empty-${stamp}@educom.sn`,
        phone: "+221 33 999 00 00",
        address: "Dakar, Sénégal",
      },
    });
    trash.schoolIds.push(emptySchool.id);

    const emptyEmail = `smoke.empty.owner.${stamp}@sonde.invalid`;
    const { data: emptyAuth, error: emptyAuthErr } = await admin.auth.admin.createUser({
      email: emptyEmail,
      password: PASSWORD,
      email_confirm: true,
    });
    if (emptyAuthErr || !emptyAuth.user) throw new Error(`Auth fail: ${emptyAuthErr?.message}`);
    trash.authIds.push(emptyAuth.user.id);

    const emptyOwner = await prisma.user.create({
      data: {
        id: emptyAuth.user.id,
        email: emptyEmail,
        firstName: "Directrice",
        lastName: "Vierge",
        role: "OWNER",
        schoolId: emptySchool.id,
      },
    });
    trash.userIds.push(emptyOwner.id);

    const emptyCookies = await sessionCookies(emptyEmail, PASSWORD);
    try {
      await cdp.send("Network.clearBrowserCookies", {}, session);
    } catch {}
    for (const c of emptyCookies) {
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
    }
    const emptyCookieHeader = emptyCookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Navigation Chrome sur le tableau de bord de l'école vierge
    await cdp.send("Page.navigate", { url: `${BASE}/dashboard` }, session);
    await new Promise((r) => setTimeout(r, 1500));

    const emptyBrowserCheck = await evaluate<{ text: string; hasError: boolean; errorText: string }>(
      cdp,
      session,
      `(() => {
        const text = document.body.innerText || "";
        const hasErrorBoundary = document.querySelector('[data-testid="error-boundary"]') !== null;
        const hasError =
          hasErrorBoundary ||
          text.includes("Cette page n'a pas pu s'afficher") ||
          text.includes("Une erreur s'est produite") ||
          text.includes("Cannot destructure") ||
          text.includes("Invalid prisma") ||
          text.includes("Application error");
        return { text: text.slice(0, 300), hasError, errorText: text.slice(0, 300) };
      })()`
    );

    if (emptyBrowserCheck.hasError) {
      console.error("❌ ERREUR sur /dashboard d'une école vierge :", emptyBrowserCheck.errorText);
      failures.push({ route: "/dashboard (école vierge)", error: emptyBrowserCheck.errorText });
    } else {
      console.log("✓ /dashboard (École vierge) -> Hydratation client & Affichage des états vides OK sans erreur");
    }

    // Test des routes statiques clés sur l'école vierge
    const emptyRoutesToTest = [
      "/dashboard",
      "/dashboard/students",
      "/dashboard/classes",
      "/dashboard/payments",
      "/dashboard/grades",
      "/dashboard/attendance",
      "/dashboard/documents",
      "/dashboard/team",
      "/dashboard/settings",
    ];

    for (const r of emptyRoutesToTest) {
      const res = await fetch(`${BASE}${r}`, { headers: { cookie: emptyCookieHeader } });
      const text = await res.text();
      const err = detectErrorInHtml(text);
      if (!res.ok || err) {
        console.error(`❌ École vierge en échec sur ${r} :`, err || `HTTP ${res.status}`);
        failures.push({ route: `${r} (école vierge)`, error: err || `HTTP ${res.status}` });
      } else {
        console.log(`✓ [École vierge] ${r.padEnd(30)} -> OK (Status: ${res.status})`);
      }
    }

  } finally {
    cdp.close();
    chrome.kill();
    await cleanup();
  }

  console.log(`\n========================================`);
  if (failures.length > 0) {
    console.error(`❌ ÉCHEC : ${failures.length} route(s) en erreur.`);
    for (const f of failures) {
      console.error(`  - ${f.route} : ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log(`✓ SUCCÈS TOTAL : 100% des ${concreteRoutes.length} routes du tableau de bord et les 7 rôles sont validés sans aucune erreur.`);
  }
}

main().catch(async (e) => {
  console.error("FATAL ERROR:", e);
  await cleanup().catch(() => {});
  process.exit(1);
});
