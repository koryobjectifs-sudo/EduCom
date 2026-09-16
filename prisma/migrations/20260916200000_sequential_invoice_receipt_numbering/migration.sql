-- CreateTable DocumentSequence
CREATE TABLE IF NOT EXISTS "DocumentSequence" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("id")
);

-- AlterTable Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;

-- AlterTable Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentSequence_schoolId_fkey') THEN
        ALTER TABLE "DocumentSequence" ADD CONSTRAINT "DocumentSequence_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex on DocumentSequence
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentSequence_schoolId_type_year_key" ON "DocumentSequence"("schoolId", "type", "year");
CREATE INDEX IF NOT EXISTS "DocumentSequence_schoolId_idx" ON "DocumentSequence"("schoolId");

-- Backfill existing invoices per school and year
WITH ranked_invoices AS (
    SELECT 
        id,
        "schoolId",
        EXTRACT(YEAR FROM "createdAt")::integer AS inv_year,
        ROW_NUMBER() OVER (PARTITION BY "schoolId", EXTRACT(YEAR FROM "createdAt")::integer ORDER BY "createdAt" ASC) as seq_num
    FROM "Invoice"
    WHERE "invoiceNumber" IS NULL
)
UPDATE "Invoice" i
SET "invoiceNumber" = 'FAC-' || r.inv_year || '-' || LPAD(r.seq_num::text, 4, '0')
FROM ranked_invoices r
WHERE i.id = r.id;

-- Seed DocumentSequence for invoices
INSERT INTO "DocumentSequence" ("id", "schoolId", "type", "year", "lastNumber", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "schoolId",
    'INVOICE',
    EXTRACT(YEAR FROM "createdAt")::integer AS inv_year,
    COUNT(*)::integer,
    NOW()
FROM "Invoice"
GROUP BY "schoolId", EXTRACT(YEAR FROM "createdAt")::integer
ON CONFLICT ("schoolId", "type", "year")
DO UPDATE SET "lastNumber" = EXCLUDED."lastNumber";

-- Backfill existing payments per school and year
WITH ranked_payments AS (
    SELECT 
        id,
        "schoolId",
        EXTRACT(YEAR FROM "createdAt")::integer AS pay_year,
        ROW_NUMBER() OVER (PARTITION BY "schoolId", EXTRACT(YEAR FROM "createdAt")::integer ORDER BY "createdAt" ASC) as seq_num
    FROM "Payment"
    WHERE "receiptNumber" IS NULL
)
UPDATE "Payment" p
SET "receiptNumber" = 'REC-' || r.pay_year || '-' || LPAD(r.seq_num::text, 4, '0')
FROM ranked_payments r
WHERE p.id = r.id;

-- Seed DocumentSequence for payments
INSERT INTO "DocumentSequence" ("id", "schoolId", "type", "year", "lastNumber", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "schoolId",
    'RECEIPT',
    EXTRACT(YEAR FROM "createdAt")::integer AS pay_year,
    COUNT(*)::integer,
    NOW()
FROM "Payment"
GROUP BY "schoolId", EXTRACT(YEAR FROM "createdAt")::integer
ON CONFLICT ("schoolId", "type", "year")
DO UPDATE SET "lastNumber" = EXCLUDED."lastNumber";

-- Create unique indexes on Invoice and Payment
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_schoolId_invoiceNumber_key" ON "Invoice"("schoolId", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_schoolId_receiptNumber_key" ON "Payment"("schoolId", "receiptNumber");
