/**
 * Mise à jour de la base pour la Communauté (26 sept. 2026 : canaux, puis
 * messages entre collègues et sondages),
 * SANS ligne de commande : Kory teste uniquement via localhost.
 *
 * Équivalent exact de ce que `prisma db push` créerait pour les ajouts du
 * 26 sept. (mêmes noms de contraintes et d'index que Prisma → aucune dérive au
 * prochain `db push`). AJOUTS SEULEMENT, rejouable sans effet : rien n'est
 * supprimé ni modifié dans les données existantes (règle 4 d'AGENTS.md
 * sans objet). RLS activé comme sur les autres tables (zéro policy = refus
 * total pour les clés publiques ; Prisma passe par `postgres`).
 */
export const SQL_CANAUX_COMMUNAUTE: string[] = [
  `CREATE TABLE IF NOT EXISTS "CommunityChannel" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'PARENTS',
    "membersCanPost" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityChannel_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CommunityChannel_schoolId_name_key" ON "CommunityChannel"("schoolId", "name")`,
  `CREATE INDEX IF NOT EXISTS "CommunityChannel_schoolId_archivedAt_idx" ON "CommunityChannel"("schoolId", "archivedAt")`,

  `CREATE TABLE IF NOT EXISTS "CommunityChannelMember" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityChannelMember_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CommunityChannelMember_channelId_userId_key" ON "CommunityChannelMember"("channelId", "userId")`,
  `CREATE INDEX IF NOT EXISTS "CommunityChannelMember_userId_idx" ON "CommunityChannelMember"("userId")`,

  `CREATE TABLE IF NOT EXISTS "CommunitySpaceRead" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "espace" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunitySpaceRead_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CommunitySpaceRead_userId_espace_key" ON "CommunitySpaceRead"("userId", "espace")`,
  `CREATE INDEX IF NOT EXISTS "CommunitySpaceRead_schoolId_userId_idx" ON "CommunitySpaceRead"("schoolId", "userId")`,

  `ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "channelId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "CommunityPost_channelId_createdAt_idx" ON "CommunityPost"("channelId", "createdAt")`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityChannel_schoolId_fkey') THEN
      ALTER TABLE "CommunityChannel" ADD CONSTRAINT "CommunityChannel_schoolId_fkey"
        FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityChannelMember_channelId_fkey') THEN
      ALTER TABLE "CommunityChannelMember" ADD CONSTRAINT "CommunityChannelMember_channelId_fkey"
        FOREIGN KEY ("channelId") REFERENCES "CommunityChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityPost_channelId_fkey') THEN
      ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_channelId_fkey"
        FOREIGN KEY ("channelId") REFERENCES "CommunityChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,

  // ── Audience « @ » des canaux ──
  `ALTER TABLE "CommunityChannel" ADD COLUMN IF NOT EXISTS "audience" JSONB`,

  // ── Messages entre collègues (conversation « EQUIPE ») ──
  `ALTER TABLE "CommunityConversation" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'FAMILLE'`,
  `ALTER TABLE "CommunityConversation" ADD COLUMN IF NOT EXISTS "userAId" TEXT`,
  `ALTER TABLE "CommunityConversation" ADD COLUMN IF NOT EXISTS "userBId" TEXT`,
  `ALTER TABLE "CommunityConversation" ALTER COLUMN "parentId" DROP NOT NULL`,
  `ALTER TABLE "CommunityConversation" ALTER COLUMN "studentId" DROP NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CommunityConversation_schoolId_userAId_userBId_key" ON "CommunityConversation"("schoolId", "userAId", "userBId")`,

  // ── Sondages ──
  `CREATE TABLE IF NOT EXISTS "CommunityPoll" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityPoll_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CommunityPoll_postId_key" ON "CommunityPoll"("postId")`,
  `CREATE TABLE IF NOT EXISTS "CommunityPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CommunityPollOption_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CommunityPollOption_pollId_idx" ON "CommunityPollOption"("pollId")`,
  `CREATE TABLE IF NOT EXISTS "CommunityPollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityPollVote_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CommunityPollVote_pollId_optionId_userId_key" ON "CommunityPollVote"("pollId", "optionId", "userId")`,
  `CREATE INDEX IF NOT EXISTS "CommunityPollVote_pollId_userId_idx" ON "CommunityPollVote"("pollId", "userId")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityPoll_postId_fkey') THEN
      ALTER TABLE "CommunityPoll" ADD CONSTRAINT "CommunityPoll_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityPollOption_pollId_fkey') THEN
      ALTER TABLE "CommunityPollOption" ADD CONSTRAINT "CommunityPollOption_pollId_fkey"
        FOREIGN KEY ("pollId") REFERENCES "CommunityPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityPollVote_pollId_fkey') THEN
      ALTER TABLE "CommunityPollVote" ADD CONSTRAINT "CommunityPollVote_pollId_fkey"
        FOREIGN KEY ("pollId") REFERENCES "CommunityPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityPollVote_optionId_fkey') THEN
      ALTER TABLE "CommunityPollVote" ADD CONSTRAINT "CommunityPollVote_optionId_fkey"
        FOREIGN KEY ("optionId") REFERENCES "CommunityPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,

  // ── Formulaires ──
  `CREATE TABLE IF NOT EXISTS "CommunityForm" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "audience" JSONB,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityForm_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CommunityForm_schoolId_createdAt_idx" ON "CommunityForm"("schoolId", "createdAt")`,
  `CREATE TABLE IF NOT EXISTS "CommunityFormRecipient" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CommunityFormRecipient_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "CommunityFormRecipient" ADD COLUMN IF NOT EXISTS "seenAt" TIMESTAMP(3)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CommunityFormRecipient_formId_userId_key" ON "CommunityFormRecipient"("formId", "userId")`,
  `CREATE INDEX IF NOT EXISTS "CommunityFormRecipient_userId_idx" ON "CommunityFormRecipient"("userId")`,
  `CREATE TABLE IF NOT EXISTS "CommunityFormResponse" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityFormResponse_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CommunityFormResponse_formId_userId_key" ON "CommunityFormResponse"("formId", "userId")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityForm_schoolId_fkey') THEN
      ALTER TABLE "CommunityForm" ADD CONSTRAINT "CommunityForm_schoolId_fkey"
        FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityFormRecipient_formId_fkey') THEN
      ALTER TABLE "CommunityFormRecipient" ADD CONSTRAINT "CommunityFormRecipient_formId_fkey"
        FOREIGN KEY ("formId") REFERENCES "CommunityForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityFormResponse_formId_fkey') THEN
      ALTER TABLE "CommunityFormResponse" ADD CONSTRAINT "CommunityFormResponse_formId_fkey"
        FOREIGN KEY ("formId") REFERENCES "CommunityForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,

  // ── Distribution des bulletins aux familles ──
  `CREATE TABLE IF NOT EXISTS "BulletinDistribution" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "publishAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BulletinDistribution_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BulletinDistribution_termId_classId_key" ON "BulletinDistribution"("termId", "classId")`,
  `CREATE INDEX IF NOT EXISTS "BulletinDistribution_schoolId_publishAt_idx" ON "BulletinDistribution"("schoolId", "publishAt")`,
  `ALTER TABLE "BulletinDistribution" ENABLE ROW LEVEL SECURITY`,

  // ── Sondages : annonce des résultats (26 sept. 2026) ──
  `ALTER TABLE "CommunityPoll" ADD COLUMN IF NOT EXISTS "resultsNotifiedAt" TIMESTAMP(3)`,

  // ── Modifier / programmer un message (26 sept. 2026) ──
  `ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3)`,
  `ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3)`,
  `ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "announcedAt" TIMESTAMP(3)`,
  `ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "pendingMentions" JSONB`,
  `ALTER TABLE "CommunityMessage" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3)`,
  `ALTER TABLE "CommunityMessage" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3)`,
  `ALTER TABLE "CommunityMessage" ADD COLUMN IF NOT EXISTS "announcedAt" TIMESTAMP(3)`,

  // ── Bilan de la semaine (26 sept. 2026) ──
  `CREATE TABLE IF NOT EXISTS "WeeklyReview" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "levels" JSONB NOT NULL DEFAULT '{}',
    "lessonsNotLearned" BOOLEAN NOT NULL DEFAULT false,
    "homeworkNotDone" BOOLEAN NOT NULL DEFAULT false,
    "verdict" TEXT,
    "comment" TEXT,
    "authorId" TEXT NOT NULL,
    "snapshot" JSONB,
    "sentAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyReview_studentId_weekStart_key" ON "WeeklyReview"("studentId", "weekStart")`,
  `CREATE INDEX IF NOT EXISTS "WeeklyReview_schoolId_classId_weekStart_idx" ON "WeeklyReview"("schoolId", "classId", "weekStart")`,
  `ALTER TABLE "WeeklyReview" ENABLE ROW LEVEL SECURITY`,
  `CREATE TABLE IF NOT EXISTS "WeeklyReviewSetting" (
    "schoolId" TEXT NOT NULL,
    "actions" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeeklyReviewSetting_pkey" PRIMARY KEY ("schoolId")
  )`,
  `ALTER TABLE "WeeklyReviewSetting" ENABLE ROW LEVEL SECURITY`,

  `CREATE TABLE IF NOT EXISTS "StudentObservation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "gradeLabel" TEXT,
    "gradeValue" DOUBLE PRECISION,
    "gradeMax" DOUBLE PRECISION,
    "action" TEXT,
    "comment" TEXT,
    "authorId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentObservation_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "StudentObservation_schoolId_classId_date_idx" ON "StudentObservation"("schoolId", "classId", "date")`,
  `CREATE INDEX IF NOT EXISTS "StudentObservation_studentId_date_idx" ON "StudentObservation"("studentId", "date")`,
  `ALTER TABLE "StudentObservation" ENABLE ROW LEVEL SECURITY`,

  `ALTER TABLE "CommunityChannel" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommunityChannelMember" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommunitySpaceRead" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommunityPoll" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommunityPollOption" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommunityPollVote" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommunityForm" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommunityFormRecipient" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommunityFormResponse" ENABLE ROW LEVEL SECURITY`,
];
