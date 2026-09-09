-- AlterTable
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing demo classes identified by zero-width space
UPDATE "Class" SET "isDemo" = true WHERE "name" LIKE '%\u200B' OR "name" LIKE '%​';
