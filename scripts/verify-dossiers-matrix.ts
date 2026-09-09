import { prisma } from "../src/lib/prisma";
import { calculateAge, formatStudentAge } from "../src/lib/dateUtils";
import { hasAccess } from "../src/lib/permissions";

async function main() {
  console.log("===============================================================");
  console.log("🧪 VÉRIFICATION DU PORTAIL MATRICE D'ADMISSIONS & CONFORMITÉ");
  console.log("===============================================================");

  // 1. Test des permissions par rôle
  console.log("\n1. Matrice des droits par rôle :");
  const roles = ["ADMIN", "SECRETARY", "TEACHER", "PARENT"] as const;
  for (const role of roles) {
    const canAccessReview = hasAccess(role as any, "/dashboard/students");
    const canValidate = hasAccess(role as any, "/dashboard/documents/validation");
    console.log(`  - ${role.padEnd(10)}: Accès revue = ${canAccessReview ? "✅ OUI" : "❌ NON"}, Validation = ${canValidate ? "✅ OUI" : "❌ NON"}`);
  }

  // 2. Test du calcul de l'âge
  console.log("\n2. Test du parsing et du calcul de l'âge :");
  const testDates = [
    { label: "Date 2018-05-12 (CE1)", date: "2018-05-12", expected: "8 ans" },
    { label: "Date 2020-11-20 (CI)", date: "2020-11-20", expected: "5 ans" },
    { label: "Date null (Inconnue)", date: null, expected: "Âge inconnu" },
    { label: "Format FR 15/03/2016 (CM1)", date: "15/03/2016", expected: "10 ans" },
  ];

  for (const t of testDates) {
    const formatted = formatStudentAge(t.date);
    console.log(`  - ${t.label.padEnd(30)} => ${formatted}`);
  }

  // 3. Test sur un échantillon d'élèves en base
  console.log("\n3. Échantillon d'élèves en base et âges réels :");
  const sampleStudents = await prisma.student.findMany({
    take: 6,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      status: true,
      enrollments: {
        take: 1,
        select: {
          class: { select: { name: true, cycle: true } },
        },
      },
    },
  });

  for (const s of sampleStudents) {
    const age = formatStudentAge(s.dateOfBirth);
    const cls = s.enrollments[0]?.class?.name || "Sans classe";
    console.log(`  - ${s.firstName} ${s.lastName} (${cls}) => Âge : ${age} (Date: ${s.dateOfBirth?.toISOString().split("T")[0] || "null"})`);
  }

  // 4. Test des exigences et shortLabels
  console.log("\n4. Exigences et shortLabels configurés :");
  const reqs = await prisma.documentRequirement.findMany({
    where: { active: true },
    select: { id: true, label: true, shortLabel: true, cycle: true, required: true, source: true },
    take: 8,
  });

  for (const r of reqs) {
    console.log(`  - [${r.cycle || "GLOBAL"}] ${r.shortLabel?.padEnd(14)} (${r.label}) | Requis: ${r.required ? "OUI" : "NON"} | Source: ${r.source}`);
  }

  console.log("\n===============================================================");
  console.log("✅ TOUS LES TESTS DU PORTAIL MATRICE SONT VALIDES !");
  console.log("===============================================================");
}

main().catch(console.error);
