-- AlterTable School for bulletin customization
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "bulletinAccentColor" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "bulletinWatermark" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "bulletinWatermarkOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.08;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "bulletinLogoPosition" TEXT NOT NULL DEFAULT 'CENTER';
