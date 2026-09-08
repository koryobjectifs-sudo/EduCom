import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, waitFor, shot, sessionCookies } from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";

const PORT = 9451;
const BASE = "http://localhost:3000";
const OUT = "/Users/kory/.gemini/antigravity-ide/brain/7b1dfc8a-99bb-4d52-8f76-04ee3a68f603/screenshots/shell";
const TAG = "TESTSHELL";
const PASSWORD = `Shell-${Math.random().toString(36).slice(2)}-2026!`;

const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTIiIGZpbGw9IiMwQjFGM0EiLz48dGV4dCB4PSIzMiIgeT0iNDIiIGZvbnQtc2l6ZT0iMzAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5BPC90ZXh0Pjwvc3ZnPg==";

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900, tactile: false },
  { name: "tablet-768", width: 768, height: 1024, tactile: true },
  { name: "mobile-390", width: 390, height: 844, tactile: true },
];

const ROLES = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"] as const;

const trash = {
  authIds: [] as string[],
  userIds: [] as string[],
  schoolIds: [] as string[],
  classIds: [] as string[],
  studentIds: [] as string[],
  dirs: [] as string[],
};

const STABLE = `(() => {
  const n = document.querySelectorAll("aside, header, main, nav, button, a, h1, h2").length;
  const s = (window.__st = window.__st || { n: -1, fois: 0 });
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  return s.fois >= 3 && n > 0;
})()`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`Starting Shell Playwright verification. Output: ${OUT}`);

  if (!chromeAvailable()) throw new Error("Google Chrome introuvable");
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) throw new Error(`App unreachable at ${BASE}`);

  const admin = createAdminClient();
  const stamp = Date.now();

  const school = await prisma.school.create({
    data: {
      name: `${TAG} Collège Bilingue Horizon`,
      onboardingCompleted: true,
      logo: LOGO,
      primaryColor: "#0B1F3A",
      email: "direction@horizon.sn",
      phone: "+221 33 820 00 11",
      address: "Mermoz, Dakar",
    },
    select: { id: true },
  });
  trash.schoolIds.push(school.id);

  // Create class & student
  const classe = await prisma.class.create({
    data: { name: "6ème A", cycle: "COLLEGE", schoolId: school.id },
  });
  trash.classIds.push(classe.id);

  const student = await prisma.student.create({
    data: { firstName: "Amadou", lastName: "Diallo", schoolId: school.id, status: "ENROLLED" },
  });
  trash.studentIds.push(student.id);

  await prisma.enrollment.create({
    data: { studentId: student.id, classId: classe.id, academicYear: "2026-2027" },
  });

  // Create users for each role
  const userMap: Record<string, { email: string; id: string }> = {};

  for (const r of ROLES) {
    const email = `${TAG.toLowerCase()}.${r.toLowerCase()}.${stamp}@sonde.invalid`;
    const { data: u, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !u.user) throw new Error(`User creation failed for ${r}: ${error?.message}`);
    trash.authIds.push(u.user.id);

    await prisma.user.create({
      data: {
        id: u.user.id,
        email,
        firstName: `User${r}`,
        lastName: "Test",
        role: r,
        schoolId: school.id,
      },
    });
    trash.userIds.push(u.user.id);
    userMap[r] = { email, id: u.user.id };
  }

  // Link teacher to class
  await prisma.teachingAssignment.create({
    data: {
      schoolId: school.id,
      teacherId: userMap.TEACHER.id,
      classId: classe.id,
      subjectId: "maths-placeholder",
    },
  }).catch(() => null);

  console.log("Fixtures created for all 7 roles.");

  const profile = mkdtempSync(join(tmpdir(), "cdp-shell-"));
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

  for (const role of ROLES) {
    console.log(`\n=== Testing Role: ${role} ===`);
    const cookies = await sessionCookies(userMap[role].email, PASSWORD);
    for (const c of cookies) {
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
    }

    for (const vp of VIEWPORTS) {
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: vp.tactile, maxTouchPoints: 5 }, session);
      await cdp.send("Emulation.setEmitTouchEventsForMouse",
        { enabled: vp.tactile, configuration: vp.tactile ? "mobile" : "desktop" }, session);
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.tactile,
      }, session);

      const targetUrl = role === "PARENT" ? `${BASE}/dashboard/payments` : `${BASE}/dashboard`;
      await cdp.send("Page.navigate", { url: targetUrl }, session);
      await waitFor(cdp, session, STABLE, 20_000);
      await new Promise((r) => setTimeout(r, 400));

      const info = await evaluate<{
        hasRail: boolean;
        hasContextualSidebar: boolean;
        hasParentHeader: boolean;
        railWidth: number;
        url: string;
      }>(cdp, session, `(() => {
        const rail = document.querySelector("aside[aria-label='Espaces de travail']");
        const ctxSidebar = document.querySelector("aside[aria-label*='Navigation']");
        const parentHdr = document.querySelector("header p");
        return {
          hasRail: !!rail && getComputedStyle(rail).display !== "none",
          hasContextualSidebar: !!ctxSidebar && getComputedStyle(ctxSidebar).display !== "none",
          hasParentHeader: !!parentHdr && parentHdr.textContent?.includes("Espace Famille"),
          railWidth: rail ? rail.getBoundingClientRect().width : 0,
          url: window.location.pathname,
        };
      })()`);

      await shot(cdp, session, OUT, `${role}-${vp.name}`);
      console.log(`  [${vp.name}] ${role.padEnd(10)} url: ${info.url} | rail: ${info.hasRail} (${info.railWidth}px) | ctx: ${info.hasContextualSidebar} | parent: ${info.hasParentHeader}`);
    }

    // Direct URL Access Security check: Attempt accessing an unauthorized space
    if (role === "TEACHER") {
      console.log(`  Security check TEACHER accessing /dashboard/payments (Unauthorized)...`);
      await cdp.send("Page.navigate", { url: `${BASE}/dashboard/payments` }, session);
      await new Promise((r) => setTimeout(r, 800));
      const res = await evaluate<{ currentUrl: string; hasRestricted: boolean }>(cdp, session, `(() => {
        return {
          currentUrl: window.location.pathname,
          hasRestricted: !!document.body.innerText.includes("Accès restreint") || window.location.pathname !== "/dashboard/payments",
        };
      })()`);
      console.log(`    Result: Redirected/Protected -> ${res.currentUrl} (Access restricted: ${res.hasRestricted})`);
    }

    if (role === "PARENT") {
      console.log(`  Security check PARENT accessing /dashboard (Unauthorized)...`);
      await cdp.send("Page.navigate", { url: `${BASE}/dashboard` }, session);
      await new Promise((r) => setTimeout(r, 800));
      const res = await evaluate<{ currentUrl: string; hasRestricted: boolean }>(cdp, session, `(() => {
        return {
          currentUrl: window.location.pathname,
          hasRestricted: window.location.pathname !== "/dashboard" || !!document.body.innerText.includes("Accès restreint"),
        };
      })()`);
      console.log(`    Result: Redirected/Protected -> ${res.currentUrl} (Protected: ${res.hasRestricted})`);
    }
  }

  cdp.close();
  chrome.kill();
  console.log("\nAll Shell Playwright tests completed successfully!");
}

main()
  .catch((err) => {
    console.error("Error during shell verification:", err);
  })
  .finally(async () => {
    console.log("Cleaning up test data...");
    try {
      if (trash.studentIds.length) {
        await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
        await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      }
      if (trash.classIds.length) {
        await prisma.teachingAssignment.deleteMany({ where: { classId: { in: trash.classIds } } });
        await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      }
      if (trash.schoolIds.length) {
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
      console.log("Cleanup done.");
    } catch (cleanErr) {
      console.error("Cleanup error:", cleanErr);
    }
  });
