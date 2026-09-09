-- AlterTable
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "activeAcademicYear" TEXT DEFAULT '2026-2027';

-- Update existing schools that don't have an active academic year
UPDATE "School" SET "activeAcademicYear" = '2026-2027' WHERE "activeAcademicYear" IS NULL;
