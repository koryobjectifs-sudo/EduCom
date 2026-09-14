-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "subDisciplineId" TEXT;

-- CreateIndex
CREATE INDEX "Grade_subDisciplineId_idx" ON "Grade"("subDisciplineId");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_subDisciplineId_fkey" FOREIGN KEY ("subDisciplineId") REFERENCES "GradeSubDiscipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

