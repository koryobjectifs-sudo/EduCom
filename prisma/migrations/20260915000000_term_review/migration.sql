-- CreateTable
CREATE TABLE "TermReview" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "appreciationTitulaire" TEXT,
    "distinctionRetenue" TEXT,
    "sanctionTravail" TEXT,
    "sanctionConduite" TEXT,
    "decisionOrientation" TEXT,
    "absencesJustifiees" INTEGER,
    "absencesNonJustifiees" INTEGER,
    "observationsConseil" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermReview_classId_termId_idx" ON "TermReview"("classId", "termId");

-- CreateIndex
CREATE INDEX "TermReview_schoolId_idx" ON "TermReview"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TermReview_studentId_termId_key" ON "TermReview"("studentId", "termId");

-- AddForeignKey
ALTER TABLE "TermReview" ADD CONSTRAINT "TermReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermReview" ADD CONSTRAINT "TermReview_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermReview" ADD CONSTRAINT "TermReview_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermReview" ADD CONSTRAINT "TermReview_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

