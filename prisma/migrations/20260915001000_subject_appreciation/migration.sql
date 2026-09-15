-- CreateTable
CREATE TABLE "SubjectAppreciation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectAppreciation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubjectAppreciation_schoolId_idx" ON "SubjectAppreciation"("schoolId");

-- CreateIndex
CREATE INDEX "SubjectAppreciation_subjectId_termId_idx" ON "SubjectAppreciation"("subjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectAppreciation_studentId_subjectId_termId_key" ON "SubjectAppreciation"("studentId", "subjectId", "termId");

-- AddForeignKey
ALTER TABLE "SubjectAppreciation" ADD CONSTRAINT "SubjectAppreciation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAppreciation" ADD CONSTRAINT "SubjectAppreciation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAppreciation" ADD CONSTRAINT "SubjectAppreciation_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAppreciation" ADD CONSTRAINT "SubjectAppreciation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

