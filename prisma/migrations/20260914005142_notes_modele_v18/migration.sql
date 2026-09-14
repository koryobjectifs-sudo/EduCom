-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "serie" TEXT;

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "acquisitionLevel" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "inspectionAcademique" TEXT,
ADD COLUMN     "inspectionIEF" TEXT,
ADD COLUMN     "regionAcademique" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "ien" TEXT;

-- CreateTable
CREATE TABLE "GradeDomain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeSubDiscipline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "domainId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeSubDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectCoefficient" (
    "id" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "serie" TEXT,
    "subjectId" TEXT NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectCoefficient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeDomain_schoolId_idx" ON "GradeDomain"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeDomain_schoolId_name_key" ON "GradeDomain"("schoolId", "name");

-- CreateIndex
CREATE INDEX "GradeSubDiscipline_domainId_idx" ON "GradeSubDiscipline"("domainId");

-- CreateIndex
CREATE INDEX "GradeSubDiscipline_schoolId_idx" ON "GradeSubDiscipline"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeSubDiscipline_domainId_name_key" ON "GradeSubDiscipline"("domainId", "name");

-- CreateIndex
CREATE INDEX "SubjectCoefficient_schoolId_idx" ON "SubjectCoefficient"("schoolId");

-- CreateIndex
CREATE INDEX "SubjectCoefficient_schoolId_niveau_serie_idx" ON "SubjectCoefficient"("schoolId", "niveau", "serie");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectCoefficient_schoolId_niveau_serie_subjectId_key" ON "SubjectCoefficient"("schoolId", "niveau", "serie", "subjectId");

-- AddForeignKey
ALTER TABLE "GradeDomain" ADD CONSTRAINT "GradeDomain_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeSubDiscipline" ADD CONSTRAINT "GradeSubDiscipline_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "GradeDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeSubDiscipline" ADD CONSTRAINT "GradeSubDiscipline_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCoefficient" ADD CONSTRAINT "SubjectCoefficient_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCoefficient" ADD CONSTRAINT "SubjectCoefficient_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

