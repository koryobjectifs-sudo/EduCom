-- Migration de RATTRAPAGE — réconcilie l'historique de migrations avec l'état
-- réel de la base de dev, dérivé au fil de l'eau via `prisma db push` sans
-- jamais être capturé en migration versionnée (WhatsApp, présences, centre
-- documentaire élève, liens d'action, campagnes, Class.academicYear).
--
-- ⚠️ CETTE MIGRATION N'EST PAS EXÉCUTÉE SUR LA BASE DE DEV : chaque objet
-- qu'elle crée EXISTE DÉJÀ (c'est précisément la dérive qu'elle documente).
-- Elle est ajoutée à l'historique via `prisma migrate resolve --applied`,
-- pour que le PROCHAIN `migrate dev` la rejoue sur sa base fantôme et n'y
-- trouve plus aucun écart avec la base réelle.
--
-- Aucune donnée existante n'est touchée par ce fichier.

-- ═══ Nouveaux enums ═══
CREATE TYPE "WhatsAppOptInStatus" AS ENUM ('OPTED_IN', 'OPTED_OUT', 'UNKNOWN');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TYPE "WhatsAppConversationStatus" AS ENUM ('OPEN', 'WAITING', 'REQUIRES_ATTENTION', 'PAUSED', 'CLOSED');
CREATE TYPE "CampaignType" AS ENUM ('MANUAL_SCHEDULED', 'AUTOMATED_WORKFLOW');
CREATE TYPE "CampaignTrigger" AS ENUM ('NONE', 'PAYMENT_DUE', 'PAYMENT_OVERDUE', 'REPORT_CARD_PUBLISHED', 'MEETING_REMINDER');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'SENT', 'COMPLETED', 'PAUSED', 'CANCELLED', 'FAILED');
CREATE TYPE "ActionLinkStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');

-- ═══ Valeurs ajoutées à des enums existants ═══
ALTER TYPE "MessageStatus" ADD VALUE 'RECEIVED';
ALTER TYPE "StudentDocStatus" ADD VALUE 'EN_REGULARISATION';

-- ═══ Valeur retirée de DocCategory (SANTE) — Postgres n'a pas de DROP VALUE,
-- on recrée le type sans elle, comme le fait `db push` en interne. Aucune
-- ligne ne porte plus 'SANTE' (nettoyage déjà effectif en base). ═══
ALTER TYPE "DocCategory" RENAME TO "DocCategory_old";
CREATE TYPE "DocCategory" AS ENUM ('IDENTITE', 'INSCRIPTION', 'SCOLARITE', 'TRANSFERT', 'EXAMENS', 'AUTRES');
ALTER TABLE "DocumentRequirement" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "DocumentRequirement" ALTER COLUMN "category" TYPE "DocCategory" USING ("category"::text::"DocCategory");
ALTER TABLE "DocumentRequirement" ALTER COLUMN "category" SET DEFAULT 'AUTRES';
ALTER TABLE "StudentDocument" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "StudentDocument" ALTER COLUMN "category" TYPE "DocCategory" USING ("category"::text::"DocCategory");
ALTER TABLE "StudentDocument" ALTER COLUMN "category" SET DEFAULT 'AUTRES';
DROP TYPE "DocCategory_old";

-- ═══ Class — index/contrainte autour de academicYear (colonne elle-même
-- corrigée dans 20260909233000_add_class_academic_year, voir ce fichier) ═══
ALTER TABLE "Class" DROP CONSTRAINT IF EXISTS "Class_schoolId_name_key";
DROP INDEX IF EXISTS "Class_schoolId_name_key";
CREATE INDEX "Class_academicYear_idx" ON "Class"("academicYear");
CREATE INDEX "Class_schoolId_name_idx" ON "Class"("schoolId", "name");
CREATE UNIQUE INDEX "Class_schoolId_name_academicYear_key" ON "Class"("schoolId", "name", "academicYear");

-- ═══ ClassSubject.coefficient ═══
ALTER TABLE "ClassSubject" ADD COLUMN "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- ═══ DocumentRequirement — checklist enrichie ═══
ALTER TABLE "DocumentRequirement" ADD COLUMN "shortLabel" TEXT;
ALTER TABLE "DocumentRequirement" ADD COLUMN "conditional" TEXT;
ALTER TABLE "DocumentRequirement" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DocumentRequirement" ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DocumentRequirement" ADD COLUMN "order" INTEGER DEFAULT 0;
CREATE INDEX "DocumentRequirement_schoolId_active_position_idx" ON "DocumentRequirement"("schoolId", "active", "position");

-- ═══ Enrollment — index manquants ═══
CREATE INDEX "Enrollment_academicYear_idx" ON "Enrollment"("academicYear");
CREATE INDEX "Enrollment_classId_academicYear_idx" ON "Enrollment"("classId", "academicYear");

-- ═══ Evaluation — index manquant ═══
CREATE INDEX "Evaluation_schoolId_date_idx" ON "Evaluation"("schoolId", "date");

-- ═══ Grade — index manquants ═══
CREATE INDEX "Grade_classId_termId_idx" ON "Grade"("classId", "termId");
CREATE INDEX "Grade_studentId_termId_idx" ON "Grade"("studentId", "termId");

-- ═══ Invoice — index manquants ═══
CREATE INDEX "Invoice_schoolId_dueDate_idx" ON "Invoice"("schoolId", "dueDate");
CREATE INDEX "Invoice_schoolId_status_dueDate_idx" ON "Invoice"("schoolId", "status", "dueDate");
CREATE INDEX "Invoice_schoolId_status_idx" ON "Invoice"("schoolId", "status");

-- ═══ Payment — index manquant ═══
CREATE INDEX "Payment_schoolId_method_idx" ON "Payment"("schoolId", "method");

-- ═══ ReportCard — index manquants ═══
CREATE INDEX "ReportCard_schoolId_status_idx" ON "ReportCard"("schoolId", "status");
CREATE INDEX "ReportCard_schoolId_termId_idx" ON "ReportCard"("schoolId", "termId");

-- ═══ TeachingAssignment — index manquants ═══
CREATE INDEX "TeachingAssignment_schoolId_classId_idx" ON "TeachingAssignment"("schoolId", "classId");
CREATE INDEX "TeachingAssignment_schoolId_teacherId_idx" ON "TeachingAssignment"("schoolId", "teacherId");

-- ═══ Student — champs et index WhatsApp/dossier ═══
ALTER TABLE "Student" ADD COLUMN "matricule" TEXT;
ALTER TABLE "Student" ADD COLUMN "gender" TEXT;
ALTER TABLE "Student" ADD COLUMN "photoPath" TEXT;
CREATE INDEX "Student_schoolId_status_idx" ON "Student"("schoolId", "status");
CREATE INDEX "Student_schoolId_createdAt_idx" ON "Student"("schoolId", "createdAt");

-- ═══ StudentDocFolder (table entière) ═══
CREATE TABLE "StudentDocFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDocFolder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentDocFolder_schoolId_idx" ON "StudentDocFolder"("schoolId");
CREATE UNIQUE INDEX "StudentDocFolder_schoolId_name_key" ON "StudentDocFolder"("schoolId", "name");
ALTER TABLE "StudentDocFolder" ADD CONSTRAINT "StudentDocFolder_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══ StudentDocument — rattachement au classeur + rôle de dépôt ═══
ALTER TABLE "StudentDocument" ADD COLUMN "folderId" TEXT;
ALTER TABLE "StudentDocument" ADD COLUMN "uploadedByRole" TEXT;
CREATE INDEX "StudentDocument_folderId_idx" ON "StudentDocument"("folderId");
CREATE INDEX "StudentDocument_schoolId_status_idx" ON "StudentDocument"("schoolId", "status");
CREATE INDEX "StudentDocument_schoolId_studentId_requirementId_idx" ON "StudentDocument"("schoolId", "studentId", "requirementId");
CREATE INDEX "StudentDocument_schoolId_supersededAt_idx" ON "StudentDocument"("schoolId", "supersededAt");
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "StudentDocFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══ School — DPA/Wave/WhatsApp/onboarding ═══
ALTER TABLE "School" ALTER COLUMN "activeAcademicYear" DROP DEFAULT;
ALTER TABLE "School" ADD COLUMN "schoolActivated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "School" ADD COLUMN "setupProgress" JSONB;
ALTER TABLE "School" ADD COLUMN "dataProcessingAcceptedAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN "dataProcessingVersion" TEXT;
ALTER TABLE "School" ADD COLUMN "waveTermsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN "waveTermsVersion" TEXT;
ALTER TABLE "School" ADD COLUMN "waveTermsIp" TEXT;
ALTER TABLE "School" ADD COLUMN "periods" JSONB;
ALTER TABLE "School" ADD COLUMN "whatsappAccessToken" TEXT;
ALTER TABLE "School" ADD COLUMN "whatsappPhoneNumberId" TEXT;
ALTER TABLE "School" ADD COLUMN "whatsappBusinessAccountId" TEXT;
ALTER TABLE "School" ADD COLUMN "whatsappConnectionStatus" TEXT DEFAULT 'NOT_CONNECTED';
ALTER TABLE "School" ADD COLUMN "whatsappName" TEXT;
ALTER TABLE "School" ADD COLUMN "whatsappPhone" TEXT;
ALTER TABLE "School" ADD COLUMN "whatsappConnectedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "School_whatsappPhoneNumberId_key" ON "School"("whatsappPhoneNumberId");

-- ═══ User — avatar, hiérarchie manager, conditions, opt-in WhatsApp ═══
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "managerId" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsappOptIn" "WhatsAppOptInStatus" NOT NULL DEFAULT 'UNKNOWN';
CREATE INDEX "User_managerId_idx" ON "User"("managerId");
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══ Attendance (table entière) ═══
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");
CREATE INDEX "Attendance_schoolId_date_idx" ON "Attendance"("schoolId", "date");
CREATE INDEX "Attendance_classId_date_idx" ON "Attendance"("classId", "date");
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══ WhatsAppConversation (table entière) ═══
CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "waPhoneId" TEXT NOT NULL,
    "parentWaNumber" TEXT NOT NULL,
    "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedStudentId" TEXT,
    "detectedIntent" TEXT,
    "attentionLevel" TEXT,
    "pendingActionType" TEXT,
    "pendingActionData" JSONB,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppConversation_schoolId_parentWaNumber_waPhoneId_key" ON "WhatsAppConversation"("schoolId", "parentWaNumber", "waPhoneId");
CREATE INDEX "WhatsAppConversation_schoolId_idx" ON "WhatsAppConversation"("schoolId");
CREATE INDEX "WhatsAppConversation_parentId_idx" ON "WhatsAppConversation"("parentId");
CREATE INDEX "WhatsAppConversation_schoolId_status_idx" ON "WhatsAppConversation"("schoolId", "status");
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_resolvedStudentId_fkey" FOREIGN KEY ("resolvedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══ WhatsAppTemplate (table entière) ═══
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "components" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WhatsAppTemplate_schoolId_idx" ON "WhatsAppTemplate"("schoolId");
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══ CommunicationCampaign (table entière, dépend de WhatsAppTemplate) ═══
CREATE TABLE "CommunicationCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "trigger" "CampaignTrigger" NOT NULL DEFAULT 'NONE',
    "triggerConfig" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "audienceConfig" JSONB NOT NULL,
    "templateId" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunicationCampaign_schoolId_idx" ON "CommunicationCampaign"("schoolId");
CREATE INDEX "CommunicationCampaign_schoolId_status_idx" ON "CommunicationCampaign"("schoolId", "status");
ALTER TABLE "CommunicationCampaign" ADD CONSTRAINT "CommunicationCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunicationCampaign" ADD CONSTRAINT "CommunicationCampaign_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══ Message — rattachements WhatsApp/campagne (dépend des 3 tables ci-dessus) ═══
ALTER TABLE "Message" ADD COLUMN "waMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "Message" ADD COLUMN "templateId" TEXT;
ALTER TABLE "Message" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "Message" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Message_waMessageId_key" ON "Message"("waMessageId");
CREATE UNIQUE INDEX "Message_idempotencyKey_key" ON "Message"("idempotencyKey");
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CommunicationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══ ActionLink (table entière) ═══
CREATE TABLE "ActionLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "status" "ActionLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActionLink_token_key" ON "ActionLink"("token");
CREATE INDEX "ActionLink_token_idx" ON "ActionLink"("token");
CREATE INDEX "ActionLink_schoolId_idx" ON "ActionLink"("schoolId");
CREATE INDEX "ActionLink_parentId_idx" ON "ActionLink"("parentId");
ALTER TABLE "ActionLink" ADD CONSTRAINT "ActionLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionLink" ADD CONSTRAINT "ActionLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionLink" ADD CONSTRAINT "ActionLink_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
