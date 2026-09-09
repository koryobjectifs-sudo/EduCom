import { launchChrome, CDP, sessionCookies, evaluate } from './_cdp';
import { prisma } from './_env';
import { createAdminClient } from '../src/lib/supabase/admin';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function measureSlow4GMobile() {
  console.log("==========================================================================");
  console.log("MESURE MOBILE EN CONDITIONS RÉELLES AU SÉNÉGAL (SLOW 4G + CPU MOBILE 4X)");
  console.log("Profil : 400ms RTT, 400 kbps bande passante, CPU x4 slowdown, Mobile 390x844");
  console.log("==========================================================================");

  const admin = createAdminClient();
  const schoolId = 'c5e484f1-2e4d-44f9-a403-f68e4f54bec8'; // SAINT JEAN PAUL INSTITUT (1 000 élèves)
  const password = 'Perf-Test-Password-2026!';
  const email = `perf-slow4g-${Date.now()}@educom.sn`;

  const { data: auth } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const user = await prisma.user.create({
    data: { id: auth!.user.id, email, firstName: 'Secrétaire', lastName: 'Dakar-Mobile', role: 'OWNER', schoolId }
  });

  const profile = mkdtempSync(join(tmpdir(), 'cdp-perf-slow4g-'));
  const launched = await launchChrome(9490, profile);
  const { chrome, wsUrl } = launched!;
  const cdp = await CDP.open(wsUrl);
  const target = await cdp.send<{ targetId: string }>('Target.createTarget', { url: 'about:blank' });
  const attached = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;

  await cdp.send('Page.enable', {}, session);
  await cdp.send('Runtime.enable', {}, session);
  await cdp.send('Network.enable', {}, session);

  // Émulation Mobile (iPhone 13/14 viewport)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    fitWindow: false,
  }, session);

  // Émulation CPU Mobile (x4 CPU Slowdown)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }, session);

  // Émulation Réseau Slow 4G (400ms RTT, 400 kbps down / 400 kbps up)
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8, // 50 KB/s
    uploadThroughput: (400 * 1024) / 8,   // 50 KB/s
    connectionType: 'cellular4g',
  }, session);

  try {
    const cookies = await sessionCookies(email, password);
    for (const c of cookies) {
      await cdp.send('Network.setCookie', { name: c.name, value: c.value, domain: '.vercel.app', path: '/' }, session);
      await cdp.send('Network.setCookie', { name: c.name, value: c.value, domain: 'edu-com.vercel.app', path: '/' }, session);
    }

    const VERCEL_BASE = 'https://edu-com.vercel.app';
    const routes = [
      { name: '/dashboard', url: '/dashboard' },
      { name: '/dashboard/students', url: '/dashboard/students' },
      { name: '/dashboard/classes', url: '/dashboard/classes' },
      { name: '/dashboard/payments', url: '/dashboard/payments' },
      { name: '/dashboard/grades', url: '/dashboard/grades' },
      { name: '/dashboard/students/dossiers/review', url: '/dashboard/students/dossiers/review' },
    ];

    const results: any[] = [];

    for (const r of routes) {
      console.log(`Mesure en cours sur ${r.name}...`);
      await cdp.send('Page.navigate', { url: VERCEL_BASE + r.url }, session);

      // On attend la fin du chargement sous slow 4G
      await new Promise((res) => setTimeout(res, 4000));

      const m = await evaluate<{ ttfb: number; fcp: number; lcp: number; domComplete: number; hydrationEst: number }>(
        cdp,
        session,
        `(() => {
          const nav = performance.getEntriesByType('navigation')[0] || {};
          const paints = performance.getEntriesByType('paint') || [];
          const fcpEntry = paints.find(p => p.name === 'first-contentful-paint');
          const lcps = performance.getEntriesByType('largest-contentful-paint') || [];
          const lcpEntry = lcps[lcps.length - 1];
          const ttfb = Math.round(nav.responseStart - nav.requestStart) || Math.round(nav.responseStart) || 0;
          const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0;
          const lcp = lcpEntry ? Math.round(lcpEntry.startTime) : (fcp || 0);
          const domComplete = Math.round(nav.domComplete) || 0;
          const hydrationEst = Math.max(0, Math.round(domComplete - nav.responseEnd));
          return { ttfb, fcp, lcp, domComplete, hydrationEst };
        })()`
      );

      results.push({
        Route: r.name,
        "TTFB (ms)": m.ttfb,
        "FCP (1er affichage / Squelette)": `${m.fcp} ms`,
        "LCP (Contenu principal)": `${m.lcp} ms`,
        "Conforme LCP (< 2.5s)": m.lcp <= 2500 ? "✓ OUI" : "⚠️ NON",
        "Hydratation JS": `${m.hydrationEst} ms`,
      });
    }

    console.log("\n==========================================================================");
    console.log("RÉSULTATS DU BENCHMARK SLOW 4G / MOBILE DAKAR");
    console.log("==========================================================================");
    console.table(results);

  } finally {
    cdp.close();
    chrome.kill();
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
  }
}

measureSlow4GMobile().catch(console.error);
