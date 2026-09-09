-- Rename values of EducationalCycle enum to match official Senegalese education nomenclature
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MATERNELLE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EducationalCycle')) THEN
    ALTER TYPE "EducationalCycle" RENAME VALUE 'MATERNELLE' TO 'PRESCOLAIRE';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COLLEGE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EducationalCycle')) THEN
    ALTER TYPE "EducationalCycle" RENAME VALUE 'COLLEGE' TO 'MOYEN';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LYCEE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EducationalCycle')) THEN
    ALTER TYPE "EducationalCycle" RENAME VALUE 'LYCEE' TO 'SECONDAIRE';
  END IF;
END $$;
