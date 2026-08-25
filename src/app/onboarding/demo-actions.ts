"use server";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { revalidatePath } from "next/cache";

const DEMO_MARKER = "\u200B";

export async function injectDemoData() {
  const { schoolId } = await requireSchoolContext();
  
  // Create 3 demo classes
  const classes = await Promise.all([
    prisma.class.create({ data: { name: `[DÉMO] 6ème A${DEMO_MARKER}`, cycle: "COLLEGE", schoolId } }),
    prisma.class.create({ data: { name: `[DÉMO] 5ème B${DEMO_MARKER}`, cycle: "COLLEGE", schoolId } }),
    prisma.class.create({ data: { name: `[DÉMO] 4ème C${DEMO_MARKER}`, cycle: "COLLEGE", schoolId } })
  ]);
  
  // Create demo subjects
  const subjects = await Promise.all([
    prisma.subject.create({ data: { name: `[DÉMO] Mathématiques${DEMO_MARKER}`, schoolId } }),
    prisma.subject.create({ data: { name: `[DÉMO] Français${DEMO_MARKER}`, schoolId } }),
    prisma.subject.create({ data: { name: `[DÉMO] Anglais${DEMO_MARKER}`, schoolId } })
  ]);
  
  // Link subjects to classes
  for (const c of classes) {
    for (const s of subjects) {
      await prisma.classSubject.create({ data: { classId: c.id, subjectId: s.id, coefficient: 2 } });
    }
  }

  // Create demo term
  const term = await prisma.term.create({
    data: { name: `[DÉMO] 1er Trimestre${DEMO_MARKER}`, schoolId, startDate: new Date("2026-09-01"), endDate: new Date("2026-12-20") }
  });
  
  const evalQuiz = await prisma.evaluation.create({
    data: { name: `[DÉMO] Contrôle 1${DEMO_MARKER}`, type: "QUIZ", termId: term.id, schoolId, date: new Date("2026-10-15") }
  });
  
  const evalExam = await prisma.evaluation.create({
    data: { name: `[DÉMO] Composition${DEMO_MARKER}`, type: "EXAM", termId: term.id, schoolId, date: new Date("2026-12-10") }
  });

  // Create 5 students per class and grades
  const firstNames = ["Fatou", "Mamadou", "Awa", "Ibrahima", "Aminata"];
  const lastNames = ["Diallo", "Ndiaye", "Diop", "Fall", "Sarr"];
  
  for (const c of classes) {
    for (let i = 0; i < 5; i++) {
      const student = await prisma.student.create({
        data: {
          firstName: firstNames[i],
          lastName: lastNames[i],
          matricule: `DEMO-${c.name.split(" ")[1]}-${i}${DEMO_MARKER}`,
          schoolId,
          status: "ENROLLED"
        }
      });
      
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId: c.id,
          academicYear: "2026-2027"
        }
      });
      
      // Add grades
      for (const s of subjects) {
        await prisma.grade.create({
          data: {
            value: 12 + (i % 5),
            max: 20,
            coefficient: 2,
            studentId: student.id,
            subjectId: s.id,
            evaluationId: evalQuiz.id,
            termId: term.id,
            classId: c.id,
            teacherId: null
          }
        });
        await prisma.grade.create({
          data: {
            value: 10 + (i % 7),
            max: 20,
            coefficient: 2,
            studentId: student.id,
            subjectId: s.id,
            evaluationId: evalExam.id,
            termId: term.id,
            classId: c.id,
            teacherId: null
          }
        });
      }
    }
  }
  
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeDemoData() {
  const { schoolId } = await requireSchoolContext();
  
  // First delete grades to avoid FK issues with evaluation if we delete evaluation first. (actually Prisma handles cascading for grades, but just in case)
  // Delete students securely
  await prisma.student.deleteMany({ 
    where: { 
      schoolId, 
      matricule: { endsWith: DEMO_MARKER } 
    } 
  });
  
  // Delete evaluations first
  await prisma.evaluation.deleteMany({
    where: {
      schoolId,
      name: { endsWith: DEMO_MARKER } 
    }
  });

  // Delete terms
  await prisma.term.deleteMany({
    where: {
      schoolId,
      name: { endsWith: DEMO_MARKER }
    }
  });

  // Delete subjects
  await prisma.subject.deleteMany({
    where: {
      schoolId,
      name: { endsWith: DEMO_MARKER }
    }
  });

  // Delete classes
  await prisma.class.deleteMany({
    where: {
      schoolId,
      name: { endsWith: DEMO_MARKER }
    }
  });
  
  revalidatePath("/dashboard");
  return { success: true };
}
