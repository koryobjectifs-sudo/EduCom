-- Migration: Add RequirementSource enum, source column, and unique constraint on DocumentRequirement

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RequirementSource" AS ENUM ('OFFICIEL', 'ETABLISSEMENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "DocumentRequirement" ADD COLUMN IF NOT EXISTS "source" "RequirementSource" NOT NULL DEFAULT 'OFFICIEL';

-- Nettoyage des doublons éventuels avant création de la contrainte d'unicité (conserve la ligne la plus ancienne)
DELETE FROM "DocumentRequirement"
WHERE id NOT IN (
  SELECT DISTINCT ON ("schoolId", "cycle", "label") id
  FROM "DocumentRequirement"
  ORDER BY "schoolId", "cycle", "label", "createdAt" ASC, id ASC
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentRequirement_schoolId_cycle_label_key" ON "DocumentRequirement"("schoolId", "cycle", "label");
