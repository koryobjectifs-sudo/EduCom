-- Drop the non-unique index if it exists (Prisma generates this automatically, though Prisma 5 sometimes just keeps both if explicit)
DROP INDEX IF EXISTS "Class_schoolId_name_idx";

-- Create unique index
CREATE UNIQUE INDEX "Class_schoolId_name_key" ON "Class"("schoolId", "name");
