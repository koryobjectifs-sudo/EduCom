import { launchChrome, CDP, sessionCookies, evaluate } from './_cdp';
import { prisma } from './_env';
import { createAdminClient } from '../src/lib/supabase/admin';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function measureVercelClient() {
  const admin = createAdminClient();
  const schoolId = 'c5e484f1-2e4d-44f9-a403-f68e4f54bec8';
  const password = 'Perf-Test-Password-2026!';
  const email = `perf-bench-v-${Date.now()}@educom.sn`;

  const { data: auth } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const user = await prisma.user.create({
    data: { id: auth!.user.id, email, firstName: 'Directeur', lastName: 'Vercel', role: 'OWNER', schoolId }
  });

  const profile = mkdtempSync(join(tmpdir(), 'cdp-perf-vercel-'));
  const launched = await launchChrome(9488, profile);
  const { chrome, wsUrl } = launched!;
  const cdp = await CDP.open(wsUrl);
  const target = await cdp.send<{ targetId: string }>('Target.createTarget', { url: 'about:blank' });
  const attached = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;
  await cdp.send('Page.enable', {}, session);
  await cdp.send('Runtime.enable', {}, session);
  await cdp.send('Network.enable', {}, session);

  try {
    const cookies = await sessionCookies(email, password);
    for (const c of cookies) {
      await cdp.send('Network.setCookie', { name: c.name, value: c.value, domain: '.vercel.app', path: '/' }, session);
      await cdp.send('Network.setCookie', { name: c.name, value: c.value, domain: 'edu-com.vercel.app', path: '/' }, session);
    }

    const VERCEL_BASE = 'https://edu-com.vercel.app';
    const routes = ['/dashboard', '/dashboard/students', '/dashboard/payments'];
    const results: any[] = [];

    for (const r of routes) {
      await cdp.send('Page.navigate', { url: VERCEL_BASE + r }, session);
      await new Promise((res) => setTimeout(res, 2500));
      const m = await evaluate<{ ttfb: number; fcp: number; lcp: number; hydrationEst: number }>(cdp, session, `(() => {
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const paints = performance.getEntriesByType('paint') || [];
        const fcpEntry = paints.find(p => p.name === 'first-contentful-paint');
        const lcps = performance.getEntriesByType('largest-contentful-paint') || [];
        const lcpEntry = lcps[lcps.length - 1];
        const ttfb = Math.round(nav.responseStart - nav.requestStart) || Math.round(nav.responseStart) || 0;
        const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0;
        const lcp = lcpEntry ? Math.round(lcpEntry.startTime) : (fcp || 0);
        const hydrationEst = Math.max(0, Math.round(nav.domComplete - nav.responseEnd));
        return { ttfb, fcp, lcp, hydrationEst };
      })()`);
      results.push({ Route: r, TTFB: m.ttfb + ' ms', FCP: m.fcp + ' ms', LCP: m.lcp + ' ms', 'Hydratation Est.': m.hydrationEst + ' ms' });
    }

    // Client-side link transition
    await cdp.send('Page.navigate', { url: VERCEL_BASE + '/dashboard' }, session);
    await new Promise((res) => setTimeout(res, 2000));
    const trans = await evaluate<number>(cdp, session, `new Promise((resolve) => {
      const el = document.querySelector('a[href="/dashboard/students"]');
      if (!el) { resolve(0); return; }
      const start = performance.now();
      el.click();
      const obs = new MutationObserver(() => {
        obs.disconnect();
        resolve(Math.round(performance.now() - start));
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => resolve(Math.round(performance.now() - start)), 2500);
    })`);

    console.log('=== VERCEL (fra1) WEB VITALS VIA CHROME ===');
    console.table(results);
    console.log('Temps de transition client Vercel (clic /dashboard -> /dashboard/students) : ' + trans + ' ms');
  } finally {
    cdp.close();
    chrome.kill();
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
  }
}

measureVercelClient().catch(console.error);
