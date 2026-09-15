/**
 * Les 5 tests de refus obligatoires du lot 18/3, plus le cas positif (sinon
 * un refus systématique passerait ces 5 tests par accident).
 *
 * Teste directement `src/lib/notes/entryPermissions.ts` — la fonction que
 * CHAQUE Server Action de saisie appelle avant d'écrire quoi que ce soit
 * (voir `elementaire/actions.ts`, `secondaire/actions.ts`). C'est le point où
 * la décision se prend réellement ; `requireActionContext()` au-dessus ne
 * fait que résoudre la session HTTP, non testable hors requête.
 *
 * Fixtures marquées `SAISIE-PERM-TAG`, nettoyées dans le `finally`.
 *
 *   npm run script -- scripts/verify-notes-saisie-permissions.ts
 */
import { prisma } from "./_env";
import {
  assertClassInSchool,
  assertCanEditSecondaireSubject,
  assertCanEditElementaireClass,
} from "../src/lib/notes/entryPermissions";

const TAG = "SAISIE-PERM-TAG";

async function main() {
  const ecoleA = await prisma.school.create({ data: { name: `${TAG} École A` }, select: { id: true } });
  const ecoleB = await prisma.school.create({ data: { name: `${TAG} École B` }, select: { id: true } });

  const matiereA = await prisma.subject.create({ data: { name: `${TAG} Maths A`, schoolId: ecoleA.id }, select: { id: true } });
  const matiereAutre = await prisma.subject.create({ data: { name: `${TAG} PC A`, schoolId: ecoleA.id }, select: { id: true } });

  const classeA = await prisma.class.create({ data: { name: `${TAG} 6e A`, schoolId: ecoleA.id, cycle: "SECONDAIRE" }, select: { id: true } });
  const classeAutre = await prisma.class.create({ data: { name: `${TAG} 6e B`, schoolId: ecoleA.id, cycle: "SECONDAIRE" }, select: { id: true } });
  const classeB = await prisma.class.create({ data: { name: `${TAG} 6e A`, schoolId: ecoleB.id, cycle: "SECONDAIRE" }, select: { id: true } });

  await prisma.classSubject.create({ data: { classId: classeA.id, subjectId: matiereA.id } });
  await prisma.classSubject.create({ data: { classId: classeA.id, subjectId: matiereAutre.id } });

  const prof = await prisma.user.create({
    data: { email: `${TAG.toLowerCase()}-prof@test.invalid`, firstName: TAG, lastName: "Prof", role: "TEACHER", schoolId: ecoleA.id, emailVerified: true },
    select: { id: true },
  });
  await prisma.teachingAssignment.create({ data: { teacherId: prof.id, classId: classeA.id, subjectId: matiereA.id, schoolId: ecoleA.id } });

  const parent = await prisma.user.create({
    data: { email: `${TAG.toLowerCase()}-parent@test.invalid`, firstName: TAG, lastName: "Parent", role: "PARENT", schoolId: ecoleA.id, emailVerified: true },
    select: { id: true },
  });
  const comptable = await prisma.user.create({
    data: { email: `${TAG.toLowerCase()}-compta@test.invalid`, firstName: TAG, lastName: "Compta", role: "ACCOUNTANT", schoolId: ecoleA.id, emailVerified: true },
    select: { id: true },
  });

  const resultats: { nom: string; attendu: "REFUSÉ" | "AUTORISÉ"; obtenu: "REFUSÉ" | "AUTORISÉ"; ok: boolean }[] = [];
  const enregistrer = (nom: string, attendu: "REFUSÉ" | "AUTORISÉ", ok: boolean) =>
    resultats.push({ nom, attendu, obtenu: ok ? attendu : (attendu === "REFUSÉ" ? "AUTORISÉ" : "REFUSÉ"), ok });

  try {
    // ① TEACHER sur une matière qui n'est pas la sienne (même classe).
    const t1 = await assertCanEditSecondaireSubject({ userId: prof.id, role: "TEACHER" }, classeA.id, matiereAutre.id);
    enregistrer("① TEACHER → matière qui n'est pas la sienne", "REFUSÉ", t1.ok === false);

    // ② TEACHER sur une classe qui n'est pas la sienne (même école, même matière).
    await prisma.classSubject.create({ data: { classId: classeAutre.id, subjectId: matiereA.id } });
    const t2 = await assertCanEditSecondaireSubject({ userId: prof.id, role: "TEACHER" }, classeAutre.id, matiereA.id);
    enregistrer("② TEACHER → classe qui n'est pas la sienne", "REFUSÉ", t2.ok === false);

    // ③ TEACHER sur une autre école (classId réel, mais hors de son établissement).
    const t3 = await assertClassInSchool(classeB.id, ecoleA.id);
    enregistrer("③ TEACHER → classe d'une autre école", "REFUSÉ", t3 === null);

    // ④ PARENT qui poste une note.
    const t4a = await assertCanEditSecondaireSubject({ userId: parent.id, role: "PARENT" }, classeA.id, matiereA.id);
    const t4b = await assertCanEditElementaireClass({ userId: parent.id, role: "PARENT" }, classeA.id);
    enregistrer("④ PARENT → poste une note (secondaire + élémentaire)", "REFUSÉ", t4a.ok === false && t4b.ok === false);

    // ⑤ ACCOUNTANT qui poste une note.
    const t5a = await assertCanEditSecondaireSubject({ userId: comptable.id, role: "ACCOUNTANT" }, classeA.id, matiereA.id);
    const t5b = await assertCanEditElementaireClass({ userId: comptable.id, role: "ACCOUNTANT" }, classeA.id);
    enregistrer("⑤ ACCOUNTANT → poste une note (secondaire + élémentaire)", "REFUSÉ", t5a.ok === false && t5b.ok === false);

    // Cas positif : le bon professeur, sur SA matière, dans SA classe.
    const positif = await assertCanEditSecondaireSubject({ userId: prof.id, role: "TEACHER" }, classeA.id, matiereA.id);
    enregistrer("✓ TEACHER → SA matière, SA classe (doit passer)", "AUTORISÉ", positif.ok === true);

    // Cas positif : OWNER/ADMIN corrigent toute matière.
    const owner = await prisma.user.create({
      data: { email: `${TAG.toLowerCase()}-owner@test.invalid`, firstName: TAG, lastName: "Owner", role: "OWNER", schoolId: ecoleA.id, emailVerified: true },
      select: { id: true },
    });
    const ownerOk = await assertCanEditSecondaireSubject({ userId: owner.id, role: "OWNER" }, classeA.id, matiereAutre.id);
    enregistrer("✓ OWNER → corrige toute matière (doit passer)", "AUTORISÉ", ownerOk.ok === true);
    await prisma.user.delete({ where: { id: owner.id } });

    console.log("\n  Test                                                          Attendu   Obtenu    Résultat");
    for (const r of resultats) {
      console.log(`  ${r.nom.padEnd(58)}  ${r.attendu.padEnd(8)}  ${r.obtenu.padEnd(8)}  ${r.ok ? "✅" : "❌"}`);
    }
    const echecs = resultats.filter((r) => !r.ok);
    console.log(`\n  ${resultats.length - echecs.length}/${resultats.length} tests conformes.`);
    if (echecs.length > 0) process.exitCode = 1;
  } finally {
    await prisma.classSubject.deleteMany({ where: { classId: { in: [classeA.id, classeAutre.id, classeB.id] } } });
    await prisma.teachingAssignment.deleteMany({ where: { schoolId: { in: [ecoleA.id, ecoleB.id] } } });
    await prisma.class.deleteMany({ where: { id: { in: [classeA.id, classeAutre.id, classeB.id] } } });
    await prisma.subject.deleteMany({ where: { id: { in: [matiereA.id, matiereAutre.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [prof.id, parent.id, comptable.id] } } });
    await prisma.school.deleteMany({ where: { id: { in: [ecoleA.id, ecoleB.id] } } });
    console.log("\n  Fixtures nettoyées.");
  }
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
