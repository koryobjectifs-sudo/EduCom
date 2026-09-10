-- Rename values of EducationalCycle enum to match official Senegalese education nomenclature
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    JOIN pg_namespace n ON t.typnamespace = n.oid 
    WHERE e.enumlabel = 'MATERNELLE' 
      AND t.typname = 'EducationalCycle' 
      AND n.nspname = current_schema()
  ) THEN
    ALTER TYPE "EducationalCycle" RENAME VALUE 'MATERNELLE' TO 'PRESCOLAIRE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    JOIN pg_namespace n ON t.typnamespace = n.oid 
    WHERE e.enumlabel = 'COLLEGE' 
      AND t.typname = 'EducationalCycle' 
      AND n.nspname = current_schema()
  ) THEN
    ALTER TYPE "EducationalCycle" RENAME VALUE 'COLLEGE' TO 'MOYEN';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    JOIN pg_namespace n ON t.typnamespace = n.oid 
    WHERE e.enumlabel = 'LYCEE' 
      AND t.typname = 'EducationalCycle' 
      AND n.nspname = current_schema()
  ) THEN
    ALTER TYPE "EducationalCycle" RENAME VALUE 'LYCEE' TO 'SECONDAIRE';
  END IF;
END $$;
