-- Rename values of EducationalCycle enum to match official Senegalese education nomenclature
ALTER TYPE "EducationalCycle" RENAME VALUE 'MATERNELLE' TO 'PRESCOLAIRE';
ALTER TYPE "EducationalCycle" RENAME VALUE 'COLLEGE' TO 'MOYEN';
ALTER TYPE "EducationalCycle" RENAME VALUE 'LYCEE' TO 'SECONDAIRE';
