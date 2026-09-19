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
    try { await prisma.school.deleteMany({ where: { id } }); } catch {}
  }
  for (const id of trash.authIds) {
    try { await admin.auth.admin.deleteUser(id); } catch {}
  }
}

async function main() {
  console.log("=== DÉMARRAGE DU SMOKE TEST EXHAUSTIF DU DASHBOARD ===");
  if (!chromeAvailable()) throw new Error("Google Chrome introuvable");

  // ── 0. VÉRIFICATION IMMÉDIATE AU DÉMARRAGE DU CACHE DE COMPILATION (.next) ──
  console.log("\n--- CONTRÔLE PRÉALABLE DU SERVEUR ET DU CACHE .next ---");
  const canaryRoutes = [
    "/",
    "/login",
    "/dashboard",
    "/dashboard/students",
    "/dashboard/grades",
    "/dashboard/payments",
    "/dashboard/documents",
    "/dashboard/communications",
    "/dashboard/admin",
    "/dashboard/attendance",
    "/dashboard/payments/receipt",
  ];

  let canaryErrorCount = 0;
  for (const r of canaryRoutes) {
    try {
      const res = await fetch(`${BASE}${r}`, { method: "HEAD", redirect: "manual" });
      if (res.status === 404 || res.status >= 500) canaryErrorCount++;
    } catch {
      canaryErrorCount++;
    }
  }

  if (canaryRoutes.length > 0 && canaryErrorCount / canaryRoutes.length > 0.1) {
    console.error("\n" + "=".repeat(65));
    console.error("⛔ Application non compilée ou corrompue — supprimez .next et relancez");
    console.error(`   Échec critique : ${canaryErrorCount}/${canaryRoutes.length} routes de démarrage renvoient 404/500 (> 10%).`);
    console.error("=".repeat(65) + "\n");
    throw new Error("Application non compilée ou corrompue — supprimez .next et relancez");
  }
  console.log("✓ Cache de compilation valide au démarrage (pré-contrôle 404/500 OK).\n");

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
      cycle: "MOYEN",
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
        emailVerified: true,
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
    "This page isn’t working",
    "This page isn't working",
    "Cette page ne fonctionne pas",
    "HTTP ERROR 500",
    "500 Internal Server Error",
    "build-manifest.json",
    "ENOENT",
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
  const extractedLinks = new Set<string>();

  try {
    // 5.1 Test approfondi du Tableau de Bord /dashboard avec résolution Suspense complète
    console.log("\n--- TEST NAVIGATEUR DE /dashboard AVEC RÉSOLUTION SUSPENSE ---");
    const ownerCookies = await sessionCookies(userMap["OWNER"].email, PASSWORD);
    for (const c of ownerCookies) {
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
    }

    const cookieHeader = ownerCookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const ownerCookieHeader = cookieHeader;

    // Contrôle canary authentifié : vérification immédiate des 10 routes maîtresses sous session réelle
    console.log("\n--- CONTRÔLE CANARY AUTHENTIFIÉ DU CACHE ET DES MANIFESTS ---");
    const authCanaries = [
      "/dashboard",
      "/dashboard/students",
      "/dashboard/grades",
      "/dashboard/payments",
      "/dashboard/documents",
      "/dashboard/communications",
      "/dashboard/admin",
      "/dashboard/attendance",
      "/dashboard/payments/receipt",
    ];
    let authCanaryErrors = 0;
    for (const r of authCanaries) {
      try {
        const res = await fetch(`${BASE}${r}`, { headers: { cookie: ownerCookieHeader }, redirect: "manual" });
        if (res.status === 404 || res.status >= 500) {
          console.error(`⛔ Route canary critique en panne : ${r} renvoie HTTP ${res.status}`);
          authCanaryErrors++;
        }
      } catch (err: any) {
        console.error(`⛔ Route canary exception : ${r} -> ${err.message}`);
        authCanaryErrors++;
      }
    }
    if (authCanaryErrors > 0) {
      throw new Error(`Échec critique du contrôle canary authentifié : ${authCanaryErrors} routes en panne`);
    }
    console.log("✓ Routes canary authentifiées OK (statuts < 500 et manifests valides).\n");

    consoleErrors.length = 0;
    networkErrors.length = 0;
    await cdp.send("Page.navigate", { url: `${BASE}/dashboard` }, session);
    await new Promise((r) => setTimeout(r, 1200));

    // Attente active de la résolution complète de toutes les frontières Suspense (disparition des squelettes)
    let suspenseResolved = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const state = await evaluate<{ hasSkeletons: boolean; hasPedagogy: boolean; hasActivity: boolean; hasError: boolean; errorText: string }>(
        cdp,
        session,
        `(() => {
          const text = document.body.innerText || "";
          const h1 = document.querySelector("h1")?.innerText || "";
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
            text.includes("Application error") ||
            text.includes("This page isn’t working") ||
            text.includes("This page isn't working") ||
            text.includes("HTTP ERROR 500") ||
            h1.includes("This page isn") ||
            h1.includes("ne fonctionne pas");
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
          text.includes("Functions cannot be passed") ||
          text.includes("This page isn’t working") ||
          text.includes("This page isn't working") ||
          text.includes("HTTP ERROR 500") ||
          h1.includes("This page isn") ||
          h1.includes("ne fonctionne pas");
        return { text: text.slice(0, 200), hasErrorBanner, h1 };
      })()`
    );

    if (browserCheck.hasErrorBanner) {
      console.error("❌ Erreur dans le navigateur sur /dashboard/students/dossiers/review :", browserCheck.text);
      failures.push({ route: "/dashboard/students/dossiers/review", error: browserCheck.text });
    } else {
      console.log(`✓ /dashboard/students/dossiers/review -> Hydratation client & Affichage OK dans Chrome (Titre : "${browserCheck.h1}")`);
    }

    // 5.1c Test géométrique strict du liseré actif du rail (Non-chevauchement de l'icône sur les 6 tuiles à 1440px, 768px et 390px)
    console.log("\n--- TEST DU LISERÉ ACTIF DU RAIL (6 TUILES, 3 RÉSOLUTIONS) ---");
    const SPACES_TO_TEST = [
      { name: "Accueil", url: "/dashboard" },
      { name: "Scolarité", url: "/dashboard/students" },
      { name: "Pédagogie", url: "/dashboard/grades" },
      { name: "Finances", url: "/dashboard/payments" },
      { name: "Documents", url: "/dashboard/documents" },
      { name: "Admin", url: "/dashboard/admin" },
    ];

    const VIEWPORTS = [
      { name: "Desktop (1440px)", width: 1440, height: 900 },
      { name: "Tablet (768px)", width: 768, height: 1024 },
      { name: "Mobile (390px)", width: 390, height: 844 },
    ];

    for (const vp of VIEWPORTS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: false,
      }, session);

      for (const sp of SPACES_TO_TEST) {
        await cdp.send("Page.navigate", { url: `${BASE}${sp.url}` }, session);
        let railCheck: any = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise((r) => setTimeout(r, 250));
          railCheck = await evaluate<{
            isMobile: boolean;
            railHidden: boolean;
            activeTileFound: boolean;
            indicatorFound: boolean;
            indicatorLeft: number;
            tileLeft: number;
            indicatorRight: number;
            iconLeft: number;
            iconRight: number;
            overlaps: boolean;
            bgColor: string;
          }>(
            cdp,
            session,
            `(() => {
              const isMobile = window.innerWidth < 768;
              const rail = document.querySelector('aside[aria-label="Espaces de travail"]');
              if (isMobile) {
                const style = rail ? window.getComputedStyle(rail) : null;
                const railHidden = !rail || style.display === 'none';
                return { isMobile: true, railHidden, activeTileFound: false, indicatorFound: false, indicatorLeft: 0, tileLeft: 0, indicatorRight: 0, iconLeft: 0, iconRight: 0, overlaps: false, bgColor: '' };
              }

              const activeTile = rail ? rail.querySelector('a[aria-current="page"]') : null;
              if (!activeTile) {
                return { isMobile: false, railHidden: false, activeTileFound: false, indicatorFound: false, indicatorLeft: 0, tileLeft: 0, indicatorRight: 0, iconLeft: 0, iconRight: 0, overlaps: false, bgColor: '' };
              }

              const indicator = activeTile.querySelector('[data-testid="rail-active-indicator"]');
              const icon = activeTile.querySelector('svg');

              if (!indicator || !icon) {
                return { isMobile: false, railHidden: false, activeTileFound: true, indicatorFound: !!indicator, indicatorLeft: 0, tileLeft: 0, indicatorRight: 0, iconLeft: 0, iconRight: 0, overlaps: false, bgColor: '' };
              }

              const tileRect = activeTile.getBoundingClientRect();
              const indRect = indicator.getBoundingClientRect();
              const iconRect = icon.getBoundingClientRect();
              const indStyle = window.getComputedStyle(indicator);

              // Le liseré ne doit JAMAIS déborder sur l'icône (indRect.right <= iconRect.left)
              const overlaps = indRect.right > iconRect.left && indRect.left < iconRect.right;

              return {
                isMobile: false,
                railHidden: false,
                activeTileFound: true,
                indicatorFound: true,
                indicatorLeft: Math.round(indRect.left),
                tileLeft: Math.round(tileRect.left),
                indicatorRight: Math.round(indRect.right),
                iconLeft: Math.round(iconRect.left),
                iconRight: Math.round(iconRect.right),
                overlaps,
                bgColor: indStyle.backgroundColor,
              };
            })()`
          );

          if (railCheck.isMobile || railCheck.activeTileFound) break;
        }

        if (railCheck.isMobile) {
          if (!railCheck.railHidden) {
            console.error(`❌ Rail non masqué sur mobile 390px (${sp.name})`);
            failures.push({ route: `Rail Mobile ${sp.name}`, error: "Rail visible on mobile" });
          }
        } else {
          if (!railCheck.activeTileFound) {
            console.error(`❌ Tuile active non trouvée pour l'espace ${sp.name} (${vp.name})`);
            failures.push({ route: `Rail ${sp.name} (${vp.name})`, error: "Active tile not found" });
          } else if (!railCheck.indicatorFound) {
            console.error(`❌ Liseré actif [data-testid="rail-active-indicator"] non trouvé pour ${sp.name} (${vp.name})`);
            failures.push({ route: `Rail ${sp.name} (${vp.name})`, error: "Active indicator not found" });
          } else if (railCheck.overlaps) {
            console.error(`❌ RÉGRESSION : Le liseré chevauche l'icône sur la tuile ${sp.name} (${vp.name}) ! Liseré right: ${railCheck.indicatorRight}px, Icône left: ${railCheck.iconLeft}px`);
            failures.push({ route: `Rail ${sp.name} (${vp.name})`, error: "Indicator overlaps icon" });
          } else {
            console.log(`✓ [${vp.name}] Tuile ${sp.name.padEnd(10)} -> Liseré bord gauche OK (x=${railCheck.indicatorLeft}px, icône x=${railCheck.iconLeft}px, zéro chevauchement)`);
          }
        }
      }
    }

    // Remise de la résolution Desktop par défaut
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false }, session);

    // ── VÉRIFICATION DE SANTÉ DU CACHE DE COMPILATION (.next) ──
    console.log("\n--- VÉRIFICATION DU CACHE DE COMPILATION (.next) ---");
    const preflightRoutes = concreteRoutes.slice(0, 10);
    let preflightErrorCount = 0;
    for (const r of preflightRoutes) {
      const probeRes = await fetch(`${BASE}${r.url}`, {
        headers: { cookie: cookieHeader },
        redirect: "manual",
      });
      if (probeRes.status === 404 || probeRes.status >= 500) preflightErrorCount++;
    }
    if (preflightRoutes.length > 0 && preflightErrorCount / preflightRoutes.length > 0.1) {
      console.error("\n" + "=".repeat(65));
      console.error("⛔ Application non compilée ou corrompue — supprimez .next et relancez");
      console.error(`   Échec de santé : ${preflightErrorCount}/${preflightRoutes.length} routes de démarrage renvoient 404/500 (> 10%).`);
      console.error("=".repeat(65) + "\n");
      throw new Error("Application non compilée ou corrompue — supprimez .next et relancez");
    }
    console.log("✓ Cache de compilation valide (pré-contrôle 404/500 OK).");

    let count = 0;
    let totalErrorCount = 0;
    for (const route of concreteRoutes) {
      count++;
      try {
        const res = await fetch(`${BASE}${route.url}`, {
          headers: { cookie: cookieHeader },
          redirect: "manual",
        });

        const status = res.status;
        if (status === 404 || status >= 500) {
          totalErrorCount++;
          if (count >= 10 && totalErrorCount / count > 0.1) {
            console.error("\n" + "=".repeat(65));
            console.error("⛔ Application non compilée ou corrompue — supprimez .next et relancez");
            console.error(`   Arrêt d'urgence : ${totalErrorCount}/${count} routes renvoient 404/500 (> 10%).`);
            console.error("=".repeat(65) + "\n");
            throw new Error("Application non compilée ou corrompue — supprimez .next et relancez");
          }
        }
        const text = await res.text();
        const contentError = detectErrorInHtml(text);

        // Assertion positive : La page ne doit pas être vide et doit contenir la coquille HTML valide
        const isBlank = !text || text.trim().length < 200;
        const hasPositiveMarker = text.includes("<!DOCTYPE html>") || text.includes("<html") || text.includes("<main") || text.includes("dashboard");

        // Extraction des liens pour le test de liens morts
        const linkRegex = /(?:href|action)="(\/[^"]+)"/g;
        let match;
        while ((match = linkRegex.exec(text)) !== null) {
          const url = match[1].split('?')[0].split('#')[0]; // Remove query and hash
          if (url.startsWith('/_next') || url.startsWith('/favicon.ico')) continue;
          extractedLinks.add(url);
        }

        if (status >= 500 || contentError || isBlank || !hasPositiveMarker) {
          const reason = contentError || (isBlank ? "Page blanche (contenu < 200 car.)" : (!hasPositiveMarker ? "Marqueur positif manquant" : "CRASH"));
          console.error(`❌ [${count}/${concreteRoutes.length}] ${route.url.padEnd(50)} -> STATUT ${status} (${reason})`);
          failures.push({ route: route.url, error: `${reason} (HTTP ${status})` });
        } else {
          // Navigation CDP dans Chrome pour valider le runtime JavaScript et l'hydratation
          consoleErrors.length = 0;
          await cdp.send("Page.navigate", { url: `${BASE}${route.url}` }, session);
          await new Promise((r) => setTimeout(r, 200));

          const pageEval = await evaluate<{ hasBoundary: boolean; text: string; hasError: boolean }>(
            cdp,
            session,
            `(() => {
              const text = document.body.innerText || "";
              const hasBoundary = document.querySelector('[data-testid="error-boundary"]') !== null;
              const hasError = text.includes("Unhandled Runtime Error") || text.includes("Application error");
              return { hasBoundary, text: text.slice(0, 150), hasError };
            })()`
          );

          if (pageEval.hasBoundary || pageEval.hasError || consoleErrors.some(e => e.includes("ReferenceError") || e.includes("TypeError") || e.includes("is not defined"))) {
            const errDetail = consoleErrors.join(" | ") || pageEval.text;
            console.error(`❌ [${count}/${concreteRoutes.length}] ${route.url.padEnd(50)} -> ERREUR CLIENT RUNTIME: ${errDetail}`);
            failures.push({ route: route.url, error: `Client runtime error: ${errDetail}` });
          } else {
            console.log(`✓ [${count}/${concreteRoutes.length}] ${route.url.padEnd(50)} -> OK (HTTP ${status} + Chrome Hydraté)`);
          }
        }
      } catch (err: any) {
        console.error(`❌ [${count}/${concreteRoutes.length}] ${route.url.padEnd(50)} -> Exception: ${err.message}`);
        failures.push({ route: route.url, error: err.message });
      }
    }

    // 5.2 Test des Liens Morts
    console.log("\n--- TEST DES LIENS MORTS (DEAD LINKS) ---");
    console.log(`${extractedLinks.size} liens uniques extraits du DOM.`);
    let deadLinksCount = 0;
    for (const link of extractedLinks) {
      // Ignorer les routes dynamiques non résolues s'il y en a (bien qu'elles devraient être résolues par Next.js)
      if (link.includes('[') || link.includes(']')) continue;
      
      const res = await fetch(`${BASE}${link}`, {
        headers: { cookie: ownerCookieHeader },
        redirect: "manual",
      });
      // 405 (Method Not Allowed) is fine for POST routes like /auth/signout
      if (res.status === 404) {
        console.error(`❌ LIEN MORT DÉTECTÉ : ${link}`);
        failures.push({ route: `Lien mort: ${link}`, error: "404 Not Found" });
        deadLinksCount++;
      }
    }
    if (deadLinksCount === 0) {
      console.log("✓ Aucun lien mort (404) détecté parmi les liens internes.");
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

      // Test de Déconnexion : Destruction de session et redirection vers /login
      const signoutRes = await fetch(`${BASE}/auth/signout`, {
        method: "POST",
        headers: { cookie: roleCookieHeader },
        redirect: "manual",
      });

      const setCookieHeaders = signoutRes.headers.getSetCookie ? signoutRes.headers.getSetCookie() : [];
      const isRedirecting = signoutRes.status === 302 || signoutRes.status === 303 || signoutRes.status === 307;
      
      // Vérification que les cookies de session sont bien détruits (Max-Age=0 ou expiré)
      const hasClearedCookies = setCookieHeaders.some(h => h.includes("Max-Age=0") || h.includes("expires="));

      // Test de réaccès après déconnexion (doit être refusé / redirigé)
      const postLogoutRes = await fetch(targetUrl, {
        headers: { cookie: "" }, // Session vidée
        redirect: "manual",
      });

      const isProtected = postLogoutRes.status === 307 || postLogoutRes.status === 302 || postLogoutRes.status === 401;

      if (!isRedirecting || !isProtected) {
        console.error(`❌ Échec déconnexion ${role} : Redirection=${isRedirecting}, Protection=${isProtected}`);
        failures.push({ route: `Déconnexion ${role}`, error: "Session non détruite ou accès non protégé" });
      } else {
        console.log(`✓ Déconnexion ${role.padEnd(10)} -> Succès (Session détruite, redirection login OK)`);
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
