import { launchChrome, CDP, sessionCookies, shot, evaluate } from "./_cdp";
import { prisma } from "./_env";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main() {
  const school = await prisma.school.findFirst({ where: { name: "École Pilote Dakar - Admissions" } });
  const user = await prisma.user.findUnique({ where: { email: "kory@educom.sn" } });

  if (!school || !user) {
    console.error("Missing test school or user in DB");
    process.exit(1);
  }

  console.log(`Using school: ${school.name} (${school.id})`);
  console.log(`Using user: ${user.email} (${user.id})`);

  const port = 9530;
  const userDir = mkdtempSync(join(tmpdir(), "cdp-matrix-shots-"));
  const launched = await launchChrome(port, userDir);
  if (!launched) throw new Error("Chrome launch failed");

  const cdp = await CDP.open(launched.wsUrl);
  const target = await cdp.send("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;

  await cdp.send("Page.enable", {}, session);
  await cdp.send("Network.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);

  try {
    const cookies = await sessionCookies("kory@educom.sn", "EduCom2026!");
    for (const c of cookies) {
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
    }

    // Set dev test cookies as well to guarantee no redirection
    await cdp.send("Network.setCookie", { name: "dev_test_school_id", value: school.id, domain: "localhost", path: "/" }, session);
    await cdp.send("Network.setCookie", { name: "dev_test_user_id", value: user.id, domain: "localhost", path: "/" }, session);

    const baseUrl = "http://localhost:3000/dashboard/students/dossiers/review";
    const screenshotsDir = "/Users/kory/.gemini/antigravity-ide/brain/7b1dfc8a-99bb-4d52-8f76-04ee3a68f603/screenshots";

    // 1. Desktop 1440x900 - Matrice globale
    console.log("Navigating to 1440x900 (Matrice)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false }, session);
    await cdp.send("Page.navigate", { url: baseUrl }, session);
    await new Promise((r) => setTimeout(r, 4000));
    
    const path1440 = await shot(cdp, session, screenshotsDir, "05-admissions-matrix-1440");
    console.log("Desktop matrix shot saved:", path1440);

    // 2. Desktop 1440x900 - Poste de travail secrétaire (Tiroir ouvert + motif de refus)
    console.log("Opening Drawer on 1440x900...");
    await evaluate(cdp, session, `
      (() => {
        const btn = document.querySelector("button[title*='validée'], button[title*='Conforme'], button[title*='Cliquer pour contrôler']");
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1500));

    await evaluate(cdp, session, `
      (() => {
        const rejectBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Non conforme"));
        if (rejectBtn) rejectBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 800));

    const pathDrawer1440 = await shot(cdp, session, screenshotsDir, "06-poste-travail-secretaire-1440");
    console.log("Desktop secretary workstation shot saved:", pathDrawer1440);

    // 3. Mobile 390x844 - Matrice mobile
    console.log("Navigating to 390x844 (Matrice mobile)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, session);
    await cdp.send("Page.navigate", { url: baseUrl }, session);
    await new Promise((r) => setTimeout(r, 3000));

    const path390 = await shot(cdp, session, screenshotsDir, "05-admissions-matrix-390");
    console.log("Mobile matrix shot saved:", path390);

    // 4. Mobile 390x844 - Poste de travail mobile (Tiroir ouvert + motif de refus)
    console.log("Opening Drawer on 390x844...");
    await evaluate(cdp, session, `
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Contrôler le dossier"));
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1200));

    await evaluate(cdp, session, `
      (() => {
        const rejectBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Non conforme"));
        if (rejectBtn) rejectBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 800));

    const pathDrawer390 = await shot(cdp, session, screenshotsDir, "06-poste-travail-secretaire-390");
    console.log("Mobile secretary workstation shot saved:", pathDrawer390);

  } finally {
    cdp.close();
    launched.chrome.kill();
  }
}

main().catch((err) => {
  console.error("Error in main:", err);
  process.exit(1);
});
