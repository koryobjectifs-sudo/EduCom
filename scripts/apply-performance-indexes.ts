import { Client } from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const indexes = [
  // 1. Student
  `CREATE INDEX IF NOT EXISTS idx_student_school_status ON "public"."Student"("schoolId", "status");`,
  `CREATE INDEX IF NOT EXISTS idx_student_school_created ON "public"."Student"("schoolId", "createdAt" DESC);`,

  // 2. Class
  `CREATE INDEX IF NOT EXISTS idx_class_school_name ON "public"."Class"("schoolId", "name");`,

  // 3. Enrollment
  `CREATE INDEX IF NOT EXISTS idx_enrollment_year ON "public"."Enrollment"("academicYear");`,
  `CREATE INDEX IF NOT EXISTS idx_enrollment_class_year ON "public"."Enrollment"("classId", "academicYear");`,

  // 4. Invoice
  `CREATE INDEX IF NOT EXISTS idx_invoice_school_status ON "public"."Invoice"("schoolId", "status");`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_school_duedate ON "public"."Invoice"("schoolId", "dueDate");`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_school_status_due ON "public"."Invoice"("schoolId", "status", "dueDate");`,

  // 5. Payment
  `CREATE INDEX IF NOT EXISTS idx_payment_school_method ON "public"."Payment"("schoolId", "method");`,
  `CREATE INDEX IF NOT EXISTS idx_payment_school_invoice ON "public"."Payment"("schoolId", "invoiceId");`,

  // 6. TeachingAssignment
  `CREATE INDEX IF NOT EXISTS idx_ta_school_teacher ON "public"."TeachingAssignment"("schoolId", "teacherId");`,
  `CREATE INDEX IF NOT EXISTS idx_ta_school_class ON "public"."TeachingAssignment"("schoolId", "classId");`,

  // 7. Evaluation
  `CREATE INDEX IF NOT EXISTS idx_eval_school_date ON "public"."Evaluation"("schoolId", "date");`,

  // 8. ReportCard
  `CREATE INDEX IF NOT EXISTS idx_rc_school_status ON "public"."ReportCard"("schoolId", "status");`,
  `CREATE INDEX IF NOT EXISTS idx_rc_school_term ON "public"."ReportCard"("schoolId", "termId");`,

  // 9. Grade
  `CREATE INDEX IF NOT EXISTS idx_grade_class_term ON "public"."Grade"("classId", "termId");`,
  `CREATE INDEX IF NOT EXISTS idx_grade_student_term ON "public"."Grade"("studentId", "termId");`,

  // 10. DocumentRequirement & StudentDocument
  `CREATE INDEX IF NOT EXISTS idx_doc_req_school_active ON "public"."DocumentRequirement"("schoolId", "active");`,
  `CREATE INDEX IF NOT EXISTS idx_std_doc_school_superseded ON "public"."StudentDocument"("schoolId", "supersededAt");`,
  `CREATE INDEX IF NOT EXISTS idx_std_doc_school_status ON "public"."StudentDocument"("schoolId", "status");`,
  `CREATE INDEX IF NOT EXISTS idx_std_doc_school_std_req ON "public"."StudentDocument"("schoolId", "studentId", "requirementId");`,
];

async function main() {
  console.log("⚡ Application sécurisée des index de performance composites...");
  const client = new Client({ connectionString });
  await client.connect();

  for (const sql of indexes) {
    const start = Date.now();
    await client.query(sql);
    console.log(`✅ [${Date.now() - start}ms] ${sql.trim()}`);
  }

  await client.end();
  console.log("🎉 Tous les index composites ont été créés avec succès !");
}

main().catch(console.error);
