-- Migration: add_family_invoicing_and_school_payment_settings
-- Idempotent schema update for Family Invoicing & School Payment Settings

-- AlterTable Invoice: add month for per-month billing cycle tracking
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "month" TEXT;

-- AlterTable InvoiceItem: add studentId for multi-child family invoices
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "studentId" TEXT;

-- AlterTable School: add mobile payment & cash desk configuration
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "cashDeskHours" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "invoiceLateConsequence" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "orangeMoneyNumber" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "waveNumber" TEXT;

-- CreateIndex: index for monthly invoice queries by school
CREATE INDEX IF NOT EXISTS "Invoice_schoolId_month_idx" ON "Invoice"("schoolId", "month");

-- CreateIndex: index for invoice items by student
CREATE INDEX IF NOT EXISTS "InvoiceItem_studentId_idx" ON "InvoiceItem"("studentId");

-- AddForeignKey: link InvoiceItem.studentId to Student.id
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_studentId_fkey') THEN
        ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
