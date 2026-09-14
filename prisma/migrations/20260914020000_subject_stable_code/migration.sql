-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON "Subject"("schoolId", "code");

