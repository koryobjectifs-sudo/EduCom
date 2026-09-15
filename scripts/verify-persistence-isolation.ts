import { prisma } from "./_env";
import {
  getSecondaireContextWithActor,
  saveDevoirGradeWithActor,
} from "../src/app/dashboard/grades/secondaire/actions";
import { resoudreCoefficient } from "../src/lib/notes/coefficients";

const SENGCO_NAME = "SENG.CO";

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("   VÉRIFICATION AIGUILLAGE, COEFFICIENTS & PERSISTANCE ISOLÉE   ");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const school = await prisma.school.findFirst({
    where: { name: { contains: SENGCO_NAME } },
    select: { id: true, name: true },
  });
  if (!school) throw new Error("École SENG.CO introuvable !");
  const schoolId = school.id;

  const admin = await prisma.user.findFirst({
    where: { schoolId, role: { in: ["ADMIN", "OWNER"] } },
  });
  if (!admin) throw new Error("Admin introuvable !");

  const adminActor = {
    userId: admin.id,
    schoolId,
    role: admin.role,
  };

  // ─────────────────────────────────────────────────────────────
  // 1. VÉRIFICATION DE TERMINALE S1 (6 matières, coefs exacts, pas Espagnol)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ [1/3] Vérification des matières et coefficients de Terminale S1...");
  const s1 = await prisma.class.findFirst({
    where: { schoolId, name: "Terminale S1" },
  });
  if (!s1) throw new Error("Terminale S1 introuvable !");

  const s1Subjects = await prisma.classSubject.findMany({
    where: { classId: s1.id },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  const expectedS1: Record<string, number> = {
    MATH: 8,
    PC: 8,
    FR: 2,
    HG: 2,
    ANG: 2,
    PHIL: 2,
  };

  console.log(`  • Matières rattachées (${s1Subjects.length}) :`);
  for (const cs of s1Subjects) {
    const code = cs.subject.code ?? "SANS_CODE";
    const coef = await resoudreCoefficient(schoolId, s1.id, cs.subjectId);
    console.log(`    - ${cs.subject.name.padEnd(22)} (${code.padEnd(5)}) : coef ${coef}`);
  }

  if (s1Subjects.length !== 6) {
    throw new Error(`Terminale S1 devrait avoir 6 matières, trouvé : ${s1Subjects.length}`);
  }

  for (const cs of s1Subjects) {
    const code = cs.subject.code!;
    if (!(code in expectedS1)) {
      throw new Error(`Matière inattendue dans Terminale S1: ${cs.subject.name} (${code})`);
    }
    const coef = await resoudreCoefficient(schoolId, s1.id, cs.subjectId);
    if (coef !== expectedS1[code]) {
      throw new Error(`Coefficient incorrect pour ${code} dans S1: ${coef} au lieu de ${expectedS1[code]}`);
    }
  }

  const hasEspagnol = s1Subjects.some((cs) => cs.subject.name.toLowerCase().includes("espagnol"));
  if (hasEspagnol) throw new Error("Espagnol ne doit PAS être rattaché à Terminale S1 !");

  console.log("  ✓ Terminale S1 conforme : 6 matières (Maths 8, PC 8, FR 2, HG 2, ANG 2, PHIL 2), aucun Espagnol.");

  // ─────────────────────────────────────────────────────────────
  // 2. TEST DE PERSISTANCE & ÉTANCHÉITÉ DES COMBINAISONS
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [2/3] Test d'étanchéité des combinaisons (Maths T1 vs Français T2)...");
  const s2 = await prisma.class.findFirst({
    where: { schoolId, name: "Terminale S2" },
  });
  if (!s2) throw new Error("Terminale S2 introuvable !");

  const terms = await prisma.term.findMany({
    where: { schoolId },
    orderBy: { startDate: "asc" },
  });
  if (terms.length < 2) throw new Error("Moins de 2 trimestres trouvés pour le test !");
  const [t1, t2] = [terms[0], terms[1]];

  const mathSubj = await prisma.subject.findFirst({ where: { schoolId, code: "MATH" } });
  const frSubj = await prisma.subject.findFirst({ where: { schoolId, code: "FR" } });
  if (!mathSubj || !frSubj) throw new Error("Maths ou FR introuvable !");

  const student = await prisma.enrollment.findFirst({
    where: { classId: s2.id },
  });
  if (!student) throw new Error("Aucun élève dans Terminale S2 !");
  const sid = student.studentId;

  // A. Nettoyage de départ
  await prisma.grade.deleteMany({
    where: {
      classId: s2.id,
      studentId: sid,
      OR: [
        { subjectId: mathSubj.id, termId: t1.id },
        { subjectId: frSubj.id, termId: t2.id },
      ],
    },
  });

  // B. Saisie en Maths Trimestre 1
  console.log("  • Saisie d'un Devoir 1 (16.5/20) en Mathématiques au Trimestre 1...");
  const saveRes = await saveDevoirGradeWithActor(adminActor, {
    gradeId: null,
    studentId: sid,
    classId: s2.id,
    subjectId: mathSubj.id,
    termId: t1.id,
    value: 16.5,
  });
  if (!saveRes.ok) throw new Error(`Erreur saisie Maths T1: ${saveRes.error}`);

  // C. Lecture Maths T1
  const ctxMathT1 = await getSecondaireContextWithActor(adminActor, s2.id, mathSubj.id, t1.id);
  if (!ctxMathT1.ok) throw new Error(ctxMathT1.error);
  const ligneMathT1 = ctxMathT1.lignes.find((l) => l.studentId === sid);
  const notesMathT1 = ligneMathT1?.devoirs.map((d) => d.value) ?? [];
  console.log(`  • Notes retrouvées en Maths T1 : [${notesMathT1.join(", ")}]`);
  if (notesMathT1.length !== 1 || notesMathT1[0] !== 16.5) {
    throw new Error(`Notes Maths T1 incorrectes : attendu [16.5], eu [${notesMathT1.join(", ")}]`);
  }

  // D. Bascule sur Français Trimestre 2 -> DOIT ÊTRE TOTALEMENT VIERGE
  console.log("  • Bascule sur Français au Trimestre 2 (combinaison différente)...");
  const ctxFrT2 = await getSecondaireContextWithActor(adminActor, s2.id, frSubj.id, t2.id);
  if (!ctxFrT2.ok) throw new Error(ctxFrT2.error);
  const ligneFrT2 = ctxFrT2.lignes.find((l) => l.studentId === sid);
  const notesFrT2 = ligneFrT2?.devoirs.map((d) => d.value) ?? [];
  console.log(`  • Notes retrouvées en Français T2 : [${notesFrT2.join(", ")}]`);
  if (notesFrT2.length !== 0) {
    throw new Error(`FUITE DE DONNÉES : Français T2 devrait être VIERGE mais contient [${notesFrT2.join(", ")}]`);
  }
  console.log("  ✓ Français T2 est parfaitement VIERGE (aucune fuite entre combinaisons).");

  // E. Retour sur Maths Trimestre 1 -> DOIT ÊTRE INTÉGRALEMENT RETROUVÉ
  console.log("  • Retour sur Mathématiques au Trimestre 1...");
  const ctxMathT1Retour = await getSecondaireContextWithActor(adminActor, s2.id, mathSubj.id, t1.id);
  if (!ctxMathT1Retour.ok) throw new Error(ctxMathT1Retour.error);
  const ligneMathT1Retour = ctxMathT1Retour.lignes.find((l) => l.studentId === sid);
  const notesMathT1Retour = ligneMathT1Retour?.devoirs.map((d) => d.value) ?? [];
  console.log(`  • Notes retrouvées en Maths T1 au retour : [${notesMathT1Retour.join(", ")}]`);
  if (notesMathT1Retour.length !== 1 || notesMathT1Retour[0] !== 16.5) {
    throw new Error(`Note perdue au retour en Maths T1 : [${notesMathT1Retour.join(", ")}]`);
  }
  console.log("  ✓ Maths T1 est intégralement retrouvée.");

  // ─────────────────────────────────────────────────────────────
  // 3. VÉRIFICATION DE LA RÈGLE D'AIGUILLAGE PAR CYCLE
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [3/3] Vérification de la logique d'aiguillage par cycle...");
  const isElementaire = (c: { cycle: string; name: string }) =>
    c.cycle === "ELEMENTAIRE" ||
    c.cycle === "PRESCOLAIRE" ||
    c.cycle === "MATERNELLE" ||
    ["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
      c.name.toLowerCase().trim().startsWith(l)
    );

  const testClasses = await prisma.class.findMany({
    where: { schoolId },
    select: { name: true, cycle: true },
  });

  for (const c of testClasses) {
    const elem = isElementaire(c);
    const targetScreen = elem ? "Élémentaire (domaines)" : "Secondaire (matières/devoirs/compo)";
    console.log(`  • Classe "${c.name}" (${c.cycle}) → Aiguillée vers : ${targetScreen}`);
    if (c.name.toLowerCase().includes("terminale") && elem) {
      throw new Error(`Terminale ne doit JAMAIS être aiguillée vers l'élémentaire !`);
    }
    if (c.name.toLowerCase().startsWith("ce1") && !elem) {
      throw new Error(`CE1 doit être aiguillée vers l'élémentaire !`);
    }
  }
  console.log("  ✓ Logique d'aiguillage par cycle 100% étanche.");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("   TOUS LES TESTS DU CONTRÔLE PASSENT AVEC SUCCÈS !              ");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR :", err);
    process.exit(1);
  });
