-- Corrigé le 14/09/2026 (lot v18, correctif A) : ce fichier déclarait
-- `academicYear TEXT NOT NULL DEFAULT '2026-2027'`, mais la colonne réellement
-- posée en base (via `db push`, jamais via ce fichier — cette migration
-- n'était d'ailleurs jamais enregistrée comme appliquée) est nullable et sans
-- défaut, conforme à `Class.academicYear String?` du schéma. Corrigé ici pour
-- que ce fichier cesse de mentir sur l'état réel ; les index et la contrainte
-- unique à 3 colonnes sont posés par la migration de rattrapage
-- `20260914010000_catchup_db_push_drift`, pas ici.
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
