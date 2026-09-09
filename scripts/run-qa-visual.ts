import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, waitFor, shot, sessionCookies } from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";

const PORT = 9450;
const BASE = "http://localhost:3000";
const OUT = "/Users/kory/.gemini/antigravity-ide/brain/7b1dfc8a-99bb-4d52-8f76-04ee3a68f603/screenshots";
const TAG = "QAVISUEL";
const PASSWORD = `Qa-${Math.random().toString(36).slice(2)}-2026!`;

const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTIiIGZpbGw9IiMwQjFGM0EiLz48dGV4dCB4PSIzMiIgeT0iNDIiIGZvbnQtc2l6ZT0iMzAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5BPC90ZXh0Pjwvc3ZnPg==";

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900, tactile: false },
  { name: "1024x768", width: 1024, height: 768, tactile: false },
  { name: "768x1024", width: 768, height: 1024, tactile: true },
  { name: "390x844", width: 390, height: 844, tactile: true },
];

const trash = {
  authIds: [] as string[], userIds: [] as string[], schoolIds: [] as string[],
  classIds: [] as string[], studentIds: [] as string[], invoiceIds: [] as string[], dirs: [] as string[],
};

const STABLE = `(() => {
  // Must NOT have any loading skeleton / animate-pulse on the page
  const hasSkeleton = !!document.querySelector(".animate-pulse");
  if (hasSkeleton) return false;
  const n = document.querySelectorAll("button, a, td, li, h1, h2, h3, input, table, div[class*='card']").length;
  const s = (window.__st = window.__st || { n: -1, fois: 0 });
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  return s.fois >= 4 && n > 0;
})()`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`Starting Visual QA. Output dir: ${OUT}`);

  if (!chromeAvailable()) throw new Error("Google Chrome introuvable");
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) throw new Error(`App unreachable at ${BASE}`);

  const admin = createAdminClient();
  const stamp = Date.now();

  const school = await prisma.school.create({
    data: {
      name: `${TAG} Complexe Scolaire Excellence`,
      onboardingCompleted: true,
      logo: LOGO, primaryColor: "#0B1F3A",
      email: "direction@excellence.sn", phone: "+221 33 800 55 66", address: "Almadies, Dakar",
    },
    select: { id: true },
  });
  trash.schoolIds.push(school.id);

  const email = `${TAG.toLowerCase()}.${stamp}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`Admin user creation failed: ${error?.message}`);
  trash.authIds.push(data.user.id);
  await prisma.user.create({
    data: { id: data.user.id, email, firstName: "Fatou", lastName: "Ndiaye", role: "OWNER", schoolId: school.id },
  });
  trash.userIds.push(data.user.id);

  // Seed teachers & staff
  for (const [prenom, nom, role] of [
    ["Moussa", "Fall", "TEACHER"], ["Awa", "Diop", "SECRETARY"], ["Oumar", "Sow", "ACCOUNTANT"],
  ] as const) {
    const e = `${TAG.toLowerCase()}.${prenom.toLowerCase()}.${stamp}@sonde.invalid`;
    const { data: u } = await admin.auth.admin.createUser({ email: e, password: PASSWORD, email_confirm: true });
    if (!u?.user) continue;
    trash.authIds.push(u.user.id);
    await prisma.user.create({ data: { id: u.user.id, email: e, firstName: prenom, lastName: nom, role, schoolId: school.id } });
    trash.userIds.push(u.user.id);
  }

  // Seed Classes
  const classes = await prisma.class.createManyAndReturn({
    data: [
      { name: "CP A", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "CM2 B", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "3ème A", cycle: "COLLEGE", schoolId: school.id },
      { name: "Terminale S2", cycle: "LYCEE", schoolId: school.id },
    ],
    select: { id: true },
  });
  for (const c of classes) trash.classIds.push(c.id);

  // Seed Requirements
  await prisma.documentRequirement.createMany({
    data: [
      { schoolId: school.id, cycle: "ELEMENTAIRE", label: "Extrait de naissance", shortLabel: "Extrait", required: true, position: 1 },
      { schoolId: school.id, cycle: "ELEMENTAIRE", label: "Certificat de radiation", shortLabel: "Radiation", required: true, position: 2 },
      { schoolId: school.id, cycle: "ELEMENTAIRE", label: "Carnet de vaccination", shortLabel: "Vaccins", required: false, position: 3 },
      { schoolId: school.id, cycle: "COLLEGE", label: "Extrait de naissance", shortLabel: "Extrait", required: true, position: 1 },
      { schoolId: school.id, cycle: "COLLEGE", label: "Bulletins année précédente", shortLabel: "Bulletins N-1", required: true, position: 2 },
    ],
  });

  // Seed Students
  const noms: [string, string, string][] = [
    ["Babacar", "Diallo", "MALE"], ["Khady", "Cissé", "FEMALE"], ["Moustapha", "Sy", "MALE"],
    ["Ndeye", "Kane", "FEMALE"], ["Abdoulaye", "Gueye", "MALE"], ["Sokhna", "Ba", "FEMALE"],
    ["Ibrahima", "Sarr", "MALE"], ["Marietou", "Faye", "FEMALE"], ["Cheikh", "Ndoye", "MALE"],
    ["Rama", "Thiam", "FEMALE"],
  ];
  const eleves = await prisma.student.createManyAndReturn({
    data: noms.map(([p, n, g]) => ({
      firstName: p, lastName: n, gender: g, schoolId: school.id, status: "ENROLLED" as const,
      dateOfBirth: new Date(2014, 5, 15),
    })),
    select: { id: true, firstName: true, lastName: true },
  });
  for (const e of eleves) trash.studentIds.push(e.id);

  const annee = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  await prisma.enrollment.createMany({
    data: eleves.map((e, i) => ({ studentId: e.id, classId: classes[i % classes.length].id, academicYear: annee })),
  });

  // Seed Invoices
  const factures = await prisma.invoice.createManyAndReturn({
    data: eleves.map((e, i) => ({
      title: `Mensualité — ${["Octobre", "Novembre", "Décembre"][i % 3]}`,
      totalAmount: [120_000, 85_000, 150_000, 95_000][i % 4],
      status: (["PENDING", "PAID", "OVERDUE", "PENDING"] as const)[i % 4],
      dueDate: new Date(Date.now() + (i % 4 === 2 ? -10 : 15) * 86400000),
      schoolId: school.id, studentId: e.id,
    })),
    select: { id: true },
  });
  for (const f of factures) trash.invoiceIds.push(f.id);

  console.log(`Fixtures initialized: 4 classes, ${eleves.length} students, ${factures.length} invoices`);

  const cookies = await sessionCookies(email, PASSWORD);
  const profile = mkdtempSync(join(tmpdir(), "cdp-qa-"));
  trash.dirs.push(profile);
  const launched = await launchChrome(PORT, profile);
  if (!launched) throw new Error("Chrome failed to launch CDP");
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

  const premierEleve = eleves[0].id;
  const PAGES: [string, string][] = [
    ["/dashboard", "01-dashboard"],
    ["/dashboard/directory", "02-annuaire"],
    ["/dashboard/students/dossiers", "03-dossiers-admissions"],
    [`/dashboard/students/${premierEleve}`, "04-profil-eleve"],
    ["/dashboard/students/dossiers/review", "05-admissions-review"],
    ["/dashboard/classes", "06-classes"],
    ["/dashboard/communications", "07-communication"],
    ["/dashboard/documents", "08-documents"],
    ["/dashboard/payments", "09-finance-paiements"],
    ["/dashboard/grades", "10-pedagogie-notes"],
  ];

  type CheckResult = {
    page: string;
    slug: string;
    viewport: string;
    overflow: boolean;
    scrollW: number;
    clientW: number;
    smallTouchTargets: number;
    headings: string;
  };

  const results: CheckResult[] = [];

  for (const vp of VIEWPORTS) {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: vp.tactile, maxTouchPoints: 5 }, session);
    await cdp.send("Emulation.setEmitTouchEventsForMouse",
      { enabled: vp.tactile, configuration: vp.tactile ? "mobile" : "desktop" }, session);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.tactile,
    }, session);

    console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);

    for (const [path, slug] of PAGES) {
      await cdp.send("Page.navigate", { url: `${BASE}${path}` }, session);
      const stable = await waitFor(cdp, session, STABLE, 30_000);
      // Wait extra 500ms for transitions/charts to settle
      await new Promise((r) => setTimeout(r, 600));

      const metrics = await evaluate<{
        sw: number;
        cw: number;
        smallTouch: number;
        heading: string;
        bodyFontSize: string;
      }>(cdp, session, `(() => {
        window.scrollTo(0, 0);
        const sw = document.documentElement.scrollWidth;
        const cw = document.documentElement.clientWidth;
        const isMobile = window.innerWidth <= 768;
        const clickables = [...document.querySelectorAll("button, a[href], input, select")];
        let smallTouch = 0;
        if (isMobile) {
          for (const el of clickables) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const target = el.closest("label, button") || el;
              const tr = target.getBoundingClientRect();
              // touch target check
              if (tr.height < 32 && tr.width < 32) {
                smallTouch++;
              }
            }
          }
        }
        const h1 = document.querySelector("h1, h2");
        const heading = h1 ? h1.textContent?.trim().slice(0, 30) || "" : "";
        const bodyFontSize = getComputedStyle(document.body).fontSize;
        return { sw, cw, smallTouch, heading, bodyFontSize };
      })()`);

      const filename = `${slug}-${vp.name}.png`;
      await shot(cdp, session, OUT, `${slug}-${vp.name}`);

      // Capture modal on classes page
      if (slug === "06-classes") {
        try {
          const clicked = await evaluate<boolean>(cdp, session, `(() => {
            const btns = [...document.querySelectorAll("button")];
            const btn = btns.find(b => b.textContent?.includes("Nouvelle classe"));
            if (btn) { btn.click(); return true; }
            return false;
          })()`);
          if (clicked) {
            await new Promise((r) => setTimeout(r, 600));
            await shot(cdp, session, OUT, `11-modale-nouvelle-classe-${vp.name}`);
            console.log(`  ✓ [${vp.name.padEnd(8)}] 11-modale-nouvelle-classe   OK`);
            // Close modal
            await evaluate(cdp, session, `(() => {
              const closeBtn = document.querySelector("[aria-label='Fermer'], button[data-close='true'], button:has(svg.lucide-x)");
              if (closeBtn) (closeBtn as HTMLElement).click();
              const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true });
              document.dispatchEvent(escEvent);
            })()`);
            await new Promise((r) => setTimeout(r, 300));
          }
        } catch (mErr) {
          console.log(`  Modal capture notice: ${mErr}`);
        }
      }

      const hasOverflow = metrics.sw > metrics.cw + 1;
      results.push({
        page: path,
        slug,
        viewport: vp.name,
        overflow: hasOverflow,
        scrollW: metrics.sw,
        clientW: metrics.cw,
        smallTouchTargets: metrics.smallTouch,
        headings: metrics.heading,
      });

      const mark = stable ? "✓" : "✗";
      const status = hasOverflow ? `⚠️ OVERFLOW (${metrics.sw} > ${metrics.cw})` : "OK";
      console.log(`  ${mark} [${vp.name.padEnd(8)}] ${slug.padEnd(25)} ${status.padEnd(20)} h: ${metrics.heading}`);
    }
  }

  cdp.close();
  chrome.kill();

  console.log("\n=== SUMMARY OF QA VISUAL CHECKS ===");
  const overflows = results.filter((r) => r.overflow);
  console.log(`Total screens tested: ${results.length}`);
  console.log(`Overflows detected: ${overflows.length}`);
  if (overflows.length > 0) {
    for (const ov of overflows) {
      console.log(`  - ${ov.viewport} on ${ov.page} (scroll: ${ov.scrollW}, client: ${ov.clientW})`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Error during visual QA:", err);
  })
  .finally(async () => {
    console.log("\nCleaning up test data...");
    try {
      if (trash.invoiceIds.length) await prisma.invoice.deleteMany({ where: { id: { in: trash.invoiceIds } } });
      if (trash.studentIds.length) {
        await prisma.studentDocument.deleteMany({ where: { studentId: { in: trash.studentIds } } });
        await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
        await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      }
      if (trash.classIds.length) await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      if (trash.schoolIds.length) {
        await prisma.documentRequirement.deleteMany({ where: { schoolId: { in: trash.schoolIds } } });
        await prisma.user.deleteMany({ where: { schoolId: { in: trash.schoolIds } } });
        await prisma.school.deleteMany({ where: { id: { in: trash.schoolIds } } });
      }
      const admin = createAdminClient();
      for (const uid of trash.authIds) {
        await admin.auth.admin.deleteUser(uid).catch(() => null);
      }
      for (const d of trash.dirs) {
        try { require("node:fs").rmSync(d, { recursive: true, force: true }); } catch {}
      }
      console.log("Cleanup complete.");
    } catch (cleanErr) {
      console.error("Error during cleanup:", cleanErr);
    }
  });
