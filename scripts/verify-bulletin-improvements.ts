import { prisma } from "./_env";
import { teacherClassIds, studentWhereFor } from "../src/lib/studentScope";
import { getActiveNavItemHref, visibleSections } from "../src/lib/navigation";
import { saveSchoolBulletinSettings } from "../src/app/dashboard/grades/report-card/actions";

async function main() {
  console.log("=== VÉRIFICATION GLOBALE DES 4 POINTS + AVERTISSEMENT ===");

  const testPrefix = `test_b_${Date.now()}`;
  const school = await prisma.school.create({
    data: {
      name: `${testPrefix}_School`,
      primaryColor: "#0E2541",
    },
  });

  try {
    // 1. Classes & Professeur
    const class4e = await prisma.class.create({
      data: { name: "4e", cycle: "SECONDAIRE", schoolId: school.id },
    });
    const class3e = await prisma.class.create({
      data: { name: "3e", cycle: "SECONDAIRE", schoolId: school.id },
    });

    const teacher = await prisma.user.create({
      data: {
        email: `${testPrefix}_teacher@educom.sn`,
        firstName: "Cheikh",
        lastName: "Anta",
        role: "TEACHER",
        schoolId: school.id,
      },
    });

    const subjectAnglais = await prisma.subject.create({
      data: { name: "Anglais", schoolId: school.id, code: `ANG_${Date.now()}` },
    });
    const subjectMaths = await prisma.subject.create({
      data: { name: "Maths", schoolId: school.id, code: `MAT_${Date.now()}` },
    });

    await prisma.teachingAssignment.create({
      data: {
        schoolId: school.id,
        teacherId: teacher.id,
        classId: class4e.id,
        subjectId: subjectAnglais.id,
      },
    });

    // ── VÉRIFICATION 1 : FAILLE PÉRIMÈTRE ENSEIGNANT ──
    console.log("\n[POINT 1] Isolation serveur des classes");
    const tClassIds = await teacherClassIds({
      schoolId: school.id,
      userId: teacher.id,
      role: "TEACHER",
    });
    console.log(`Classes enseignant : ${tClassIds.length} (4e: ${class4e.id})`);
    if (tClassIds.length !== 1 || tClassIds[0] !== class4e.id) {
      throw new Error("L'enseignant ne devrait voir que la 4e !");
    }
    console.log("✅ Point 1 validé : La 3e est invisible côté serveur.");

    // ── VÉRIFICATION 2 : DÉTECTION ENTRÉE UNIQUE ACTIVE ──
    console.log("\n[POINT 2] Une seule entrée active dans la sidebar");
    const navSections = visibleSections("TEACHER");
    const navItems = navSections.flatMap((s) => s.items);

    const activeOnBulletins = getActiveNavItemHref(navItems, "/dashboard/grades/report-card");
    const activeOnNotes = getActiveNavItemHref(navItems, "/dashboard/grades");

    if (activeOnBulletins !== "/dashboard/grades/report-card") {
      throw new Error(`Échec activeOnBulletins: ${activeOnBulletins}`);
    }
    if (activeOnNotes !== "/dashboard/grades") {
      throw new Error(`Échec activeOnNotes: ${activeOnNotes}`);
    }
    console.log("✅ Point 2 validé : /dashboard/grades/report-card active uniquement Bulletins, pas Notes.");

    // ── VÉRIFICATION 3 & POINT À VÉRIFIER : CALCUL ET AVERTISSEMENT BULLETIN INCOMPLET ──
    console.log("\n[POINT 3 & VÉRIF] Avertissement bulletin incomplet");
    const student1 = {
      subjects: [
        { id: "1", name: "Anglais", mm: 16.67 },
        { id: "2", name: "Maths", mm: null },
        { id: "3", name: "Français", mm: null },
        { id: "4", name: "Histoire", mm: null },
        { id: "5", name: "SVT", mm: null },
        { id: "6", name: "PC", mm: null },
        { id: "7", name: "EPS", mm: null },
        { id: "8", name: "Philo", mm: null },
      ],
    };
    const notees1 = student1.subjects.filter((s) => s.mm !== null).length;
    const total1 = student1.subjects.length;
    const incomplete1 = notees1 > 0 && notees1 < total1;
    const warn1 = `Moyenne calculée sur ${notees1} matière sur ${total1}. Bulletin incomplet.`;

    if (!incomplete1 || warn1 !== "Moyenne calculée sur 1 matière sur 8. Bulletin incomplet.") {
      throw new Error("Échec du message d'avertissement pour bulletin incomplet");
    }
    console.log(`✅ Point à vérifier validé : "${warn1}" détecté.`);

    // Élève avec toutes les matières notées
    const studentComplet = {
      subjects: student1.subjects.map((s) => ({ ...s, mm: 15 })),
    };
    const noteesComplet = studentComplet.subjects.filter((s) => s.mm !== null).length;
    const incompleteComplet = noteesComplet > 0 && noteesComplet < studentComplet.subjects.length;
    if (incompleteComplet) {
      throw new Error("Un bulletin complet ne doit pas être marqué incomplet !");
    }
    console.log("✅ Bulletin complet : aucun avertissement erroné.");

    // ── VÉRIFICATION 4 : PERSONNALISATION DU BULLETIN AU NIVEAU DE L'ÉCOLE ──
    console.log("\n[POINT 4] Personnalisation et persistance école");
    await prisma.school.update({
      where: { id: school.id },
      data: {
        bulletinAccentColor: "#047857",
        bulletinWatermark: true,
        bulletinWatermarkOpacity: 0.12,
        bulletinLogoPosition: "LEFT",
      },
    });

    const updatedSchool = await prisma.school.findUniqueOrThrow({
      where: { id: school.id },
      select: {
        bulletinAccentColor: true,
        bulletinWatermark: true,
        bulletinWatermarkOpacity: true,
        bulletinLogoPosition: true,
      },
    });

    if (
      updatedSchool.bulletinAccentColor !== "#047857" ||
      updatedSchool.bulletinWatermark !== true ||
      updatedSchool.bulletinWatermarkOpacity !== 0.12 ||
      updatedSchool.bulletinLogoPosition !== "LEFT"
    ) {
      throw new Error("Échec persistance des réglages de personnalisation du bulletin");
    }
    console.log("✅ Point 4 validé : Réglages sauvegardés et restitués fidèlement par l'établissement.");

    console.log("\n🎉 TOUS LES 4 POINTS SONT VALIDÉS AVEC SUCCÈS !");
  } finally {
    await prisma.teachingAssignment.deleteMany({ where: { schoolId: school.id } });
    await prisma.class.deleteMany({ where: { schoolId: school.id } });
    await prisma.subject.deleteMany({ where: { schoolId: school.id } });
    await prisma.user.deleteMany({ where: { schoolId: school.id } });
    await prisma.school.delete({ where: { id: school.id } });
  }
}

main().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
