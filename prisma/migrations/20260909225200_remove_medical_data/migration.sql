/*
  Remove medicalNotes from Student
  Clean description fields in SchoolDocument and DocumentRequirement
*/

ALTER TABLE "Student" DROP COLUMN IF EXISTS "medicalNotes";

UPDATE "SchoolDocument"
SET "description" = REPLACE(
    REPLACE(
        REPLACE(
            COALESCE("description", ''), 
            ' et DONNÉES MÉDICALES', ''
        ),
        ' et DONNEES MEDICALES', ''
    ),
    'DONNÉES MÉDICALES', ''
)
WHERE "description" ILIKE '%MÉDICALES%' OR "description" ILIKE '%MEDICALES%';

UPDATE "DocumentRequirement"
SET "label" = REPLACE(
    REPLACE(
        REPLACE(
            COALESCE("label", ''), 
            ' et DONNÉES MÉDICALES', ''
        ),
        ' et DONNEES MEDICALES', ''
    ),
    'DONNÉES MÉDICALES', ''
)
WHERE "label" ILIKE '%MÉDICALES%' OR "label" ILIKE '%MEDICALES%';
