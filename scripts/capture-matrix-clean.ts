import { launchChrome, CDP, sessionCookies, evaluate } from "./_cdp";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function captureAdmissions() {
  const profile = mkdtempSync(join(tmpdir(), "cdp-adm-clean-"));
  const launched = await launchChrome(9460, profile);
  if (!launched) {
    console.error("Chrome launch failed");
    process.exit(1);
  }
  const { chrome, wsUrl } = launched;
  const cdp = await CDP.open(wsUrl);
  const target = await cdp.send("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);

  const cookies = await sessionCookies("kory@educom.sn", "EduCom2026!");
  for (const c of cookies) {
    await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
  }

  const artDir = "/Users/kory/.gemini/antigravity-ide/brain/7b1dfc8a-99bb-4d52-8f76-04ee3a68f603/screenshots";

  // 1. Desktop 1440x900
  console.log("Navigating to matrix at 1440x900...");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false }, session);
  await cdp.send("Page.navigate", { url: "http://localhost:3000/dashboard/students/dossiers/review" }, session);
  
  // Wait for loading/skeletons to disappear and matrix table to appear
  for (let i = 0; i < 40; i++) {
    await new Promise((res) => setTimeout(res, 500));
    const isLoaded = await evaluate(cdp, session, `
      Boolean(document.querySelector('table') || document.querySelector('[data-testid="admissions-matrix"]') || document.body.innerText.includes('Élèves à examiner') || document.body.innerText.includes('Dossiers d\\'admission'))
    `);
    if (isLoaded) {
      console.log("Page loaded!");
      break;
    }
  }

  await new Promise((res) => setTimeout(res, 1500));

  const snap1 = await cdp.send("Page.captureScreenshot", { format: "png" }, session);
  const file1 = join(artDir, "05-admissions-matrix-1440.png");
  writeFileSync(file1, Buffer.from(snap1.data, "base64"));
  console.log("Desktop screenshot saved to:", file1);

  // 2. Mobile 390x844
  console.log("Navigating to matrix at 390x844...");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, session);
  await new Promise((res) => setTimeout(res, 1500));
  const snap2 = await cdp.send("Page.captureScreenshot", { format: "png" }, session);
  const file2 = join(artDir, "05-admissions-matrix-390.png");
  writeFileSync(file2, Buffer.from(snap2.data, "base64"));
  console.log("Mobile screenshot saved to:", file2);

  chrome.kill();
  process.exit(0);
}

captureAdmissions().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
