import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { launchChrome, CDP, sessionCookies, evaluate } from "./_cdp";
import { getDirectorDashboardSnapshot, getAcademicDashboardData, getRecentActivityFeedData } from "../src/lib/dashboard-director";
import { invoiceOverview } from "../src/lib/finance";

const LOCAL_BASE = "http://localhost:3000";
const VERCEL_BASE = "https://edu-com.vercel.app";

let queryLog: Array<{ query: string; duration: number }> = [];

// @ts-ignore
prisma.$on("query", (e: any) => {
  queryLog.push({ query: e.query, duration: e.duration });
});

async function measureSQL(fn: () => Promise<any>) {
  queryLog = [];
  const start = performance.now();
  await fn();
  const totalDuration = performance.now() - start;
  const count = queryLog.length;
  const sqlSum = queryLog.reduce((acc, q) => acc + (q.duration || 0), 0);
  return {
    queryCount: count,
    sqlSumMs: Math.round(sqlSum),
    appCodeMs: Math.round(totalDuration),
  };
}

async function measureHttp(baseUrl: string, url: string, cookieHeader: string, iterations = 3) {
  // Warmup
  try {
    await fetch(`${baseUrl}${url}`, { headers: { cookie: cookieHeader } });
  } catch {}

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const res = await fetch(`${baseUrl}${url}`, { headers: { cookie: cookieHeader } });
    await res.text();
    times.push(performance.now() - start);
  }

  return {
    avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    minMs: Math.round(Math.min(...times)),
    maxMs: Math.round(Math.max(...times)),
  };
}

async function measureClientWebVitals(
  cdp: CDP,
  session: string,
  baseUrl: string,
  url: string
) {
  // Clear and navigate
  await cdp.send("Page.navigate", { url: `${baseUrl}${url}` }, session);

  // Wait for network idle and Suspense resolution
  await new Promise((r) => setTimeout(r, 2000));

  const metrics = await evaluate<{
    ttfb: number;
    domInteractive: number;
    domComplete: number;
    fcp: number;
    lcp: number;
    hydrationEst: number;
  }>(
    cdp,
    session,
    `(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const paints = performance.getEntriesByType('paint') || [];
      const fcpEntry = paints.find(p => p.name === 'first-contentful-paint');
      
      const lcps = performance.getEntriesByType('largest-contentful-paint') || [];
      const lcpEntry = lcps[lcps.length - 1];

      const ttfb = Math.round(nav.responseStart - nav.requestStart) || Math.round(nav.responseStart) || 0;
      const domInteractive = Math.round(nav.domInteractive) || 0;
      const domComplete = Math.round(nav.domComplete) || 0;
      const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0;
      const lcp = lcpEntry ? Math.round(lcpEntry.startTime) : (fcp || 0);
      const hydrationEst = Math.max(0, Math.round(domComplete - nav.responseEnd));

      return {
        ttfb,
        domInteractive,
        domComplete,
        fcp,
        lcp,
        hydrationEst
      };
    })()`
  );

  return metrics;
}

async function measureClientTransition(
  cdp: CDP,
  session: string,
  fromUrl: string,
  targetSelector: string
) {
  await cdp.send("Page.navigate", { url: fromUrl }, session);
  await new Promise((r) => setTimeout(r, 1500));

  // Click on selector and measure time until URL changes and DOM updates
  const transitionTime = await evaluate<number>(
    cdp,
    session,
    `new Promise((resolve) => {
      const el = document.querySelector('${targetSelector}');
      if (!el) { resolve(0); return; }
      
      const start = performance.now();
      el.click();

      const checkInterval = setInterval(() => {
        const elapsed = performance.now() - start;
        // Check if page updated or 3s elapsed
        if (elapsed > 3000) {
          clearInterval(checkInterval);
          resolve(Math.round(elapsed));
        }
      }, 30);

      // Listen for pushState or DOM mutation
      const observer = new MutationObserver(() => {
        clearInterval(checkInterval);
        observer.disconnect();
        resolve(Math.round(performance.now() - start));
      });
      observer.observe(document.body, { childList: true, subtree: true });
    })`
  );

  return transitionTime;
}

async function main() {
  const admin = createAdminClient();
  const schoolId = "c5e484f1-2e4d-44f9-a403-f68e4f54bec8"; // SAINT JEAN PAUL INSTITUT (1000 élèves)
  const password = "Perf-Test-Password-2026!";
  const email = `perf-bench-${Date.now()}@educom.sn`;

  const { data: auth, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !auth.user) throw new Error(`Auth fail: ${authErr?.message}`);

  const user = await prisma.user.create({
    data: {
      id: auth.user.id,
      email,
      firstName: "Directeur",
      lastName: "Benchmark",
      role: "OWNER",
      schoolId,
    },
  });

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found");

  const profile = mkdtempSync(join(tmpdir(), "cdp-perf-"));
  const launched = await launchChrome(9480, profile);
  if (!launched) throw new Error("Chrome failed to launch");
  const { chrome, wsUrl } = launched;

  const cdp = await CDP.open(wsUrl);
  const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);

  try {
    const cookies = await sessionCookies(email, password);
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    for (const c of cookies) {
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: ".vercel.app", path: "/" }, session);
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "edu-com.vercel.app", path: "/" }, session);
    }

    console.log("==========================================================================");
    console.log("1. MESURES SQL & REQUÊTES SERVEUR (ÉCOLE RÉELLE DE 1 000 ÉLÈVES)");
    console.log("==========================================================================");

    // SQL /dashboard
    const sqlDashboard = await measureSQL(async () => {
      await getDirectorDashboardSnapshot(
        { schoolId, userId: user.id, role: user.role as any },
        { firstName: user.firstName, schoolName: school.name }
      );
    });

    // SQL /dashboard/students
    const sqlStudents = await measureSQL(async () => {
      const annee = "2026-2027";
      await Promise.all([
        prisma.student.findMany({
          where: { schoolId, enrollments: { some: { academicYear: annee } } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            status: true,
            parent: { select: { firstName: true, lastName: true, phone: true } },
            enrollments: {
              where: { academicYear: annee },
              select: { academicYear: true, classId: true, class: { select: { id: true, name: true } } },
            },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
        prisma.class.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            cycle: true,
            teacherId: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { enrollments: true } },
          },
        }),
        prisma.user.findMany({
          where: { schoolId, role: "TEACHER" },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          orderBy: { firstName: "asc" },
        }),
        prisma.enrollment.groupBy({
          by: ["academicYear"],
          where: { class: { schoolId } },
          _count: { id: true },
        }),
      ]);
    });

    // SQL /dashboard/payments
    const sqlPayments = await measureSQL(async () => {
      await invoiceOverview({ userId: user.id, schoolId, role: user.role as any });
    });

    console.log(`- /dashboard         : ${sqlDashboard.queryCount} requêtes SQL | Somme SQL = ${sqlDashboard.sqlSumMs} ms | Traitement App = ${sqlDashboard.appCodeMs} ms`);
    console.log(`- /dashboard/students: ${sqlStudents.queryCount} requêtes SQL | Somme SQL = ${sqlStudents.sqlSumMs} ms | Traitement App = ${sqlStudents.appCodeMs} ms`);
    console.log(`- /dashboard/payments: ${sqlPayments.queryCount} requêtes SQL | Somme SQL = ${sqlPayments.sqlSumMs} ms | Traitement App = ${sqlPayments.appCodeMs} ms`);

    console.log("\n==========================================================================");
    console.log("2. MESURES HTTP (TEMPS DE RÉPONSE SERVEUR / TTFB)");
    console.log("==========================================================================");

    // HTTP Local (Next.js Production Build: next start)
    const localDashHttp = await measureHttp(LOCAL_BASE, "/dashboard", cookieHeader);
    const localStudHttp = await measureHttp(LOCAL_BASE, "/dashboard/students", cookieHeader);
    const localPayHttp = await measureHttp(LOCAL_BASE, "/dashboard/payments", cookieHeader);

    // HTTP Vercel (Production fra1)
    const vercelDashHttp = await measureHttp(VERCEL_BASE, "/dashboard", cookieHeader);
    const vercelStudHttp = await measureHttp(VERCEL_BASE, "/dashboard/students", cookieHeader);
    const vercelPayHttp = await measureHttp(VERCEL_BASE, "/dashboard/payments", cookieHeader);

    console.log("LOCAL (Next.js Production Build) :");
    console.log(`  /dashboard          -> ${localDashHttp.avgMs} ms (min: ${localDashHttp.minMs}ms, max: ${localDashHttp.maxMs}ms)`);
    console.log(`  /dashboard/students -> ${localStudHttp.avgMs} ms (min: ${localStudHttp.minMs}ms, max: ${localStudHttp.maxMs}ms)`);
    console.log(`  /dashboard/payments -> ${localPayHttp.avgMs} ms (min: ${localPayHttp.minMs}ms, max: ${localPayHttp.maxMs}ms)`);

    console.log("\nVERCEL (Région fra1 - Proche de la base Supabase) :");
    console.log(`  /dashboard          -> ${vercelDashHttp.avgMs} ms (min: ${vercelDashHttp.minMs}ms, max: ${vercelDashHttp.maxMs}ms)`);
    console.log(`  /dashboard/students -> ${vercelStudHttp.avgMs} ms (min: ${vercelStudHttp.minMs}ms, max: ${vercelStudHttp.maxMs}ms)`);
    console.log(`  /dashboard/payments -> ${vercelPayHttp.avgMs} ms (min: ${vercelPayHttp.minMs}ms, max: ${vercelPayHttp.maxMs}ms)`);

    console.log("\n==========================================================================");
    console.log("3. DÉCOMPOSITION DU TEMPS PERÇU CLIENT (CHROME DEVTOOLS / WEB VITALS)");
    console.log("==========================================================================");

    const clientDash = await measureClientWebVitals(cdp, session, LOCAL_BASE, "/dashboard");
    const clientStud = await measureClientWebVitals(cdp, session, LOCAL_BASE, "/dashboard/students");
    const clientPay = await measureClientWebVitals(cdp, session, LOCAL_BASE, "/dashboard/payments");

    console.log("MÉTRIQUES CLIENT LOCAL (Chrome CDP) :");
    console.table([
      { Route: "/dashboard", TTFB: `${clientDash.ttfb} ms`, FCP: `${clientDash.fcp} ms`, LCP: `${clientDash.lcp} ms`, "Hydratation Est.": `${clientDash.hydrationEst} ms` },
      { Route: "/dashboard/students", TTFB: `${clientStud.ttfb} ms`, FCP: `${clientStud.fcp} ms`, LCP: `${clientStud.lcp} ms`, "Hydratation Est.": `${clientStud.hydrationEst} ms` },
      { Route: "/dashboard/payments", TTFB: `${clientPay.ttfb} ms`, FCP: `${clientPay.fcp} ms`, LCP: `${clientPay.lcp} ms`, "Hydratation Est.": `${clientPay.hydrationEst} ms` },
    ]);

    // Client-side link transition
    const transitionTime = await measureClientTransition(
      cdp,
      session,
      `${LOCAL_BASE}/dashboard`,
      'a[href="/dashboard/students"]'
    );
    console.log(`\nTemps de transition client (clic lien /dashboard -> /dashboard/students) : ${transitionTime} ms`);

  } finally {
    cdp.close();
    chrome.kill();
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
  }
}

main().catch(console.error);
