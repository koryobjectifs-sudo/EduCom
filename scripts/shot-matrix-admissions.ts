import { launchChrome, CDP, sessionCookies, shot } from "./_cdp";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OFFICIAL_REQUIREMENTS_BY_CYCLE } from "../src/lib/officialRequirements";

async function main() {
  const admin = createAdminClient();
  const stamp = Date.now();
  const password = "Password-2026!";
  const email = `shot.matrix.${stamp}@educom.sn`;

  // 1. Create school
  const school = await prisma.school.create({
    data: {
      name: "Collège & Lycée d'Excellence Dakar",
      onboardingCompleted: true,
      email: `ecole-${stamp}@educom.sn`,
      phone: "+221 33 800 00 00",
      address: "Almadies, Dakar",
    },
  });

  // 2. Create owner user
  const { data: auth, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !auth.user) throw new Error(authErr?.message);

  const user = await prisma.user.create({
    data: {
      id: auth.user.id,
      email,
      firstName: "Directeur",
      lastName: "Excellence",
      role: "OWNER",
      schoolId: school.id,
    },
  });

  // 3. Create classes across cycles
  const classCI = await prisma.class.create({ data: { name: "CI A", cycle: "ELEMENTAIRE", schoolId: school.id } });
  const classCM2 = await prisma.class.create({ data: { name: "CM2 B", cycle: "ELEMENTAIRE", schoolId: school.id } });
  const class6e = await prisma.class.create({ data: { name: "6ème A", cycle: "COLLEGE", schoolId: school.id } });

  // 4. Seed requirements for ELEMENTAIRE and COLLEGE
  for (const cycle of ["ELEMENTAIRE", "COLLEGE"] as const) {
    const reqs = OFFICIAL_REQUIREMENTS_BY_CYCLE[cycle];
    await prisma.documentRequirement.createMany({
      data: reqs.map((r, i) => ({
        schoolId: school.id,
        cycle,
        label: r.label,
        shortLabel: r.label,
        category: r.category,
        source: r.source,
        required: r.required,
        pinned: r.pinned,
        conditional: r.conditional || null,
        position: r.order || i + 1,
        active: true,
      })),
    });
  }

  // 5. Create realistic students with various document states
  const s1 = await prisma.student.create({
    data: {
      firstName: "Aminata",
      lastName: "Diallo",
      gender: "F",
      dateOfBirth: new Date("2020-04-12"), // 6 ans en CI
      status: "PENDING",
      schoolId: school.id,
    },
  });
  await prisma.enrollment.create({ data: { studentId: s1.id, classId: classCI.id, academicYear: "2025-2026" } });

  const s2 = await prisma.student.create({
    data: {
      firstName: "Moussa",
      lastName: "Ndiaye",
      gender: "M",
      dateOfBirth: new Date("2013-09-20"), // 12 ans en 6e
      status: "PENDING",
      schoolId: school.id,
    },
  });
  await prisma.enrollment.create({ data: { studentId: s2.id, classId: class6e.id, academicYear: "2025-2026" } });

  const s3 = await prisma.student.create({
    data: {
      firstName: "Fatou",
      lastName: "Sow",
      gender: "F",
      dateOfBirth: new Date("2014-02-15"), // CM2
      status: "ENROLLED",
      schoolId: school.id,
    },
  });
  await prisma.enrollment.create({ data: { studentId: s3.id, classId: classCM2.id, academicYear: "2025-2026" } });

  // Attach some documents
  const allReqs = await prisma.documentRequirement.findMany({ where: { schoolId: school.id } });
  const birthReqElem = allReqs.find((r) => r.cycle === "ELEMENTAIRE" && r.label.includes("naissance"));
  const birthReqColl = allReqs.find((r) => r.cycle === "COLLEGE" && (r.label.includes("état civil") || r.label.includes("naissance")));
  const ficheReqColl = allReqs.find((r) => r.cycle === "COLLEGE" && r.label.includes("fiche"));

  if (birthReqElem) {
    // S1 has validated birth certificate
    await prisma.studentDocument.create({
      data: {
        studentId: s1.id,
        requirementId: birthReqElem.id,
        label: birthReqElem.label,
        category: birthReqElem.category,
        storagePath: `demo/${s1.id}/birth.pdf`,
        fileName: "Extrait_Aminata_Diallo.pdf",
        mimeType: "application/pdf",
        sizeBytes: 124000,
        status: "VALIDATED",
        uploadedById: user.id,
        reviewedById: user.id,
        reviewedAt: new Date(),
        schoolId: school.id,
      },
    });
  }

  if (birthReqColl && ficheReqColl) {
    // S2 has TO_VERIFY birth doc and REJECTED fiche scolaire
    await prisma.studentDocument.create({
      data: {
        studentId: s2.id,
        requirementId: birthReqColl.id,
        label: birthReqColl.label,
        category: birthReqColl.category,
        storagePath: `demo/${s2.id}/birth.jpg`,
        fileName: "Acte_Moussa.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 450000,
        status: "TO_VERIFY",
        uploadedById: user.id,
        schoolId: school.id,
      },
    });

    await prisma.studentDocument.create({
      data: {
        studentId: s2.id,
        requirementId: ficheReqColl.id,
        label: ficheReqColl.label,
        category: ficheReqColl.category,
        storagePath: `demo/${s2.id}/fiche.pdf`,
        fileName: "Fiche_scolaire.pdf",
        mimeType: "application/pdf",
        sizeBytes: 98000,
        status: "REJECTED",
        reviewNote: "Document illisible, cachet manquant.",
        uploadedById: user.id,
        reviewedById: user.id,
        reviewedAt: new Date(),
        schoolId: school.id,
      },
    });
  }

  // 6. Launch Chrome & capture screenshots
  const port = 9520;
  const userDir = mkdtempSync(join(tmpdir(), "cdp-matrix-"));
  const launched = await launchChrome(port, userDir);
  if (!launched) throw new Error("Chrome launch failed");

  const cdp = await CDP.open(launched.wsUrl);
  const target = await cdp.send("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;

  await cdp.send("Page.enable", {}, session);
  await cdp.send("Network.enable", {}, session);

  try {
    const cookies = await sessionCookies(email, password);
    for (const c of cookies) {
      await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
    }

    const baseUrl = "http://localhost:3000/dashboard/students/dossiers/review";
    const screenshotsDir = join("/Users/kory/.gemini/antigravity-ide/brain/7b1dfc8a-99bb-4d52-8f76-04ee3a68f603", "screenshots");

    // Desktop 1440x900
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, session);
    await cdp.send("Page.navigate", { url: baseUrl }, session);
    await new Promise((r) => setTimeout(r, 2500));

    const path1440 = await shot(cdp, session, screenshotsDir, "05-admissions-matrix-1440");
    console.log("Desktop screenshot saved:", path1440);

    // Mobile 390x844
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, session);
    await cdp.send("Page.navigate", { url: baseUrl }, session);
    await new Promise((r) => setTimeout(r, 2500));

    const path390 = await shot(cdp, session, screenshotsDir, "05-admissions-matrix-390");
    console.log("Mobile screenshot saved:", path390);
  } finally {
    cdp.close();
    launched.chrome.kill();
    // Cleanup
    await prisma.school.delete({ where: { id: school.id } }).catch(() => {});
    await admin.auth.admin.deleteUser(auth.user.id).catch(() => {});
  }
}

main().catch(console.error);
