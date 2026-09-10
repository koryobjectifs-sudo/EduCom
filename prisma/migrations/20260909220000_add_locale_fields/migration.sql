-- Add locale to User and documentLocale to School
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'User' AND column_name = 'language') THEN
    ALTER TABLE "User" RENAME COLUMN "language" TO "locale";
  ELSE
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'fr';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'School' AND column_name = 'documentLanguage') THEN
    ALTER TABLE "School" RENAME COLUMN "documentLanguage" TO "documentLocale";
  ELSE
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "documentLocale" TEXT NOT NULL DEFAULT 'fr';
  END IF;
END $$;
