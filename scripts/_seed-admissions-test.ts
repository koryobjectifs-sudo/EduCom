import { prisma } from "./_env";
import { OFFICIAL_REQUIREMENTS_BY_CYCLE } from "../src/lib/officialRequirements";
import { createAdminClient } from "../src/lib/supabase/admin";

export async function seedAdmissionsTest() {
  console.log("🚀 Initialisation de l'école de test pour la matrice d'admissions...");
  const admin = createAdminClient();

  // 1. Trouver ou créer l'école
  let school = await prisma.school.findFirst({
    where: { name: "École Pilote Dakar - Admissions" },
  });

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "École Pilote Dakar - Admissions",
        activeAcademicYear: "2025-2026",
        onboardingCompleted: true,
      },
    });
  } else {
    school = await prisma.school.update({
      where: { id: school.id },
      data: {
        activeAcademicYear: "2025-2026",
        onboardingCompleted: true,
      },
    });
  }

  const schoolId = school.id;

  // 2. Utilisateur kory@educom.sn rattaché comme ADMIN
  let authUserId = "";
  const { data: userList } = await admin.auth.admin.listUsers();
  const existingAuth = userList.users.find((u) => u.email === "kory@educom.sn");

  if (!existingAuth) {
    const { data: newAuth, error: authErr } = await admin.auth.admin.createUser({
      email: "kory@educom.sn",
      password: "EduCom2026!",
      email_confirm: true,
    });
    if (authErr || !newAuth.user) throw new Error(`Auth fail: ${authErr?.message}`);
    authUserId = newAuth.user.id;
  } else {
    authUserId = existingAuth.id;
    await admin.auth.admin.updateUserById(authUserId, { password: "EduCom2026!" });
  }

  let user = await prisma.user.findUnique({
    where: { email: "kory@educom.sn" },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: authUserId,
        email: "kory@educom.sn",
        firstName: "Kory",
        lastName: "Directeur",
        role: "ADMIN",
        schoolId,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        schoolId,
        role: "ADMIN",
      },
    });
  }

  // 3. Classes de plusieurs cycles (ELEMENTAIRE et MOYEN)
  let classCE2 = await prisma.class.findFirst({
    where: { schoolId, name: "CE2 A" },
  });
  if (!classCE2) {
    classCE2 = await prisma.class.create({
      data: {
        name: "CE2 A",
        cycle: "ELEMENTAIRE",
        schoolId,
      },
    });
  }

  let class6eme = await prisma.class.findFirst({
    where: { schoolId, name: "6ème A" },
  });
  if (!class6eme) {
    class6eme = await prisma.class.create({
      data: {
        name: "6ème A",
        cycle: "MOYEN",
        schoolId,
      },
    });
  }

  // 4. Exigences DocumentRequirement
  await prisma.studentDocument.deleteMany({ where: { schoolId } });
  await prisma.documentRequirement.deleteMany({ where: { schoolId } });

  const cycles = ["ELEMENTAIRE", "MOYEN"] as const;
  const createdReqs: Record<string, any> = {};

  for (const cycle of cycles) {
    const reqDefs = OFFICIAL_REQUIREMENTS_BY_CYCLE[cycle];
    for (const r of reqDefs) {
      const created = await prisma.documentRequirement.create({
        data: {
          label: r.label,
          shortLabel: r.shortLabel,
          category: r.category,
          source: r.source,
          cycle,
          required: r.required,
          pinned: r.pinned,
          conditional: r.conditional ?? null,
          position: r.order,
          schoolId,
          active: true,
        },
      });
      createdReqs[`${cycle}|${r.shortLabel}`] = created;
    }
  }

  // 5. Créer les élèves de test
  await prisma.enrollment.deleteMany({ where: { class: { schoolId } } });
  await prisma.student.deleteMany({ where: { schoolId } });

  // Élève 1 : Fatou Ndiaye (CE2 - ELEMENTAIRE, 8 ans)
  const s1 = await prisma.student.create({
    data: {
      firstName: "Fatou",
      lastName: "Ndiaye",
      gender: "F",
      matricule: "EPDA-2025-001",
      dateOfBirth: new Date("2017-04-12"),
      schoolId,
      status: "PENDING",
      enrollments: {
        create: {
          classId: classCE2.id,
          academicYear: "2025-2026",
        },
      },
    },
  });

  // Élève 2 : Moussa Diop (6ème A - MOYEN, 11 ans)
  const s2 = await prisma.student.create({
    data: {
      firstName: "Moussa",
      lastName: "Diop",
      gender: "M",
      matricule: "EPDA-2025-002",
      dateOfBirth: new Date("2014-09-20"),
      schoolId,
      status: "PENDING",
      enrollments: {
        create: {
          classId: class6eme.id,
          academicYear: "2025-2026",
        },
      },
    },
  });

  // Élève 3 : Aminata Fall (CE2 - ELEMENTAIRE, 8 ans)
  const s3 = await prisma.student.create({
    data: {
      firstName: "Aminata",
      lastName: "Fall",
      gender: "F",
      matricule: "EPDA-2025-003",
      dateOfBirth: new Date("2017-11-03"),
      schoolId,
      status: "PENDING",
      enrollments: {
        create: {
          classId: classCE2.id,
          academicYear: "2025-2026",
        },
      },
    },
  });

  // Élève 4 : Ibrahima Sow (6ème A - MOYEN, 12 ans)
  const s4 = await prisma.student.create({
    data: {
      firstName: "Ibrahima",
      lastName: "Sow",
      gender: "M",
      matricule: "EPDA-2025-004",
      dateOfBirth: new Date("2013-05-18"),
      schoolId,
      status: "ENROLLED",
      enrollments: {
        create: {
          classId: class6eme.id,
          academicYear: "2025-2026",
        },
      },
    },
  });

  // 6. Insérer des pièces dans chacun des 6 états :
  const reqElemNaissance = createdReqs["ELEMENTAIRE|Extrait de naissance"];
  const reqElemCertif = createdReqs["ELEMENTAIRE|Certificat scolarité"] || createdReqs["ELEMENTAIRE|Certificat de scolarité"];
  const reqMoyenNaissance = createdReqs["MOYEN|Extrait de naissance"];
  const reqMoyenFiche = createdReqs["MOYEN|Fiche scolaire"];

  // Pièce 1: CONFORME (VALIDATED) pour Fatou
  if (reqElemNaissance) {
    await prisma.studentDocument.create({
      data: {
        studentId: s1.id,
        requirementId: reqElemNaissance.id,
        label: reqElemNaissance.label,
        category: reqElemNaissance.category,
        storagePath: `${schoolId}/${s1.id}/extrait_naissance_fatou.pdf`,
        fileName: "extrait_naissance_fatou.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 340,
        status: "VALIDATED",
        academicYear: "2025-2026",
        uploadedById: user.id,
        uploadedByRole: "ADMIN",
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: "Document authentique et lisible",
        schoolId,
      },
    });
  }

  // Pièce 2: FOURNI / À VERIFIER (TO_VERIFY) pour Fatou
  if (reqElemCertif) {
    await prisma.studentDocument.create({
      data: {
        studentId: s1.id,
        requirementId: reqElemCertif.id,
        label: reqElemCertif.label,
        category: reqElemCertif.category,
        storagePath: `${schoolId}/${s1.id}/certificat_scolarite_fatou.pdf`,
        fileName: "certificat_scolarite_fatou.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 180,
        status: "TO_VERIFY",
        academicYear: "2025-2026",
        uploadedById: user.id,
        uploadedByRole: "ADMIN",
        schoolId,
      },
    });
  }

  // Pièce 3: REJETÉ (REJECTED) pour Moussa
  if (reqMoyenNaissance) {
    await prisma.studentDocument.create({
      data: {
        studentId: s2.id,
        requirementId: reqMoyenNaissance.id,
        label: reqMoyenNaissance.label,
        category: reqMoyenNaissance.category,
        storagePath: `${schoolId}/${s2.id}/acte_naissance_moussa.jpg`,
        fileName: "acte_naissance_moussa.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024 * 420,
        status: "REJECTED",
        academicYear: "2025-2026",
        uploadedById: user.id,
        uploadedByRole: "ADMIN",
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: "Scan illisible — cachet officiel coupé au bas de page",
        schoolId,
      },
    });
  }

  // Pièce 4: EN ATTENTE COMPLÉMENT (EN_REGULARISATION) pour Moussa
  if (reqMoyenFiche) {
    await prisma.studentDocument.create({
      data: {
        studentId: s2.id,
        requirementId: reqMoyenFiche.id,
        label: reqMoyenFiche.label,
        category: reqMoyenFiche.category,
        storagePath: `${schoolId}/${s2.id}/fiche_scolaire_moussa.pdf`,
        fileName: "fiche_scolaire_moussa.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 512,
        status: "EN_REGULARISATION",
        academicYear: "2025-2026",
        uploadedById: user.id,
        uploadedByRole: "ADMIN",
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: "Il manque la page 2 avec les appréciations du conseil des maîtres",
        schoolId,
      },
    });
  }

  // Pièce 5: CONFORME pour Ibrahima Sow
  if (reqMoyenNaissance) {
    await prisma.studentDocument.create({
      data: {
        studentId: s4.id,
        requirementId: reqMoyenNaissance.id,
        label: reqMoyenNaissance.label,
        category: reqMoyenNaissance.category,
        storagePath: `${schoolId}/${s4.id}/acte_ibrahima.pdf`,
        fileName: "acte_ibrahima.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 250,
        status: "VALIDATED",
        academicYear: "2025-2026",
        uploadedById: user.id,
        uploadedByRole: "ADMIN",
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: "Conforme",
        schoolId,
      },
    });
  }

  console.log("✅ Seed d'admissions exécuté avec succès :");
  console.log(`- École : ${school.name} (${school.id})`);
  console.log(`- Utilisateur : ${user.email}`);
  console.log(`- Classes : CE2 A (ELEMENTAIRE), 6ème A (MOYEN)`);
  console.log(`- Élèves : 4 élèves (Fatou Ndiaye, Moussa Diop, Aminata Fall, Ibrahima Sow)`);
  console.log(`- États couverts : CONFORME, FOURNI, REJETE, EN_ATTENTE_COMPLEMENT, MANQUANT, NON_APPLICABLE`);
}

// Auto-exécution si lancé directement
if (process.argv[1]?.endsWith("_seed-admissions-test.ts")) {
  seedAdmissionsTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Erreur seed admissions :", err);
      process.exit(1);
    });
}
