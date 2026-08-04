-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "JournalVisibility" AS ENUM ('PRIVATE', 'SELECTED_USERS', 'PLANET_MEMBERS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PlanetRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "AiJobState" AS ENUM ('QUEUED', 'FETCHING_SOURCE', 'PREPROCESSING', 'SUMMARIZING', 'CLASSIFYING', 'SAVING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('WAITING', 'STARTING', 'ROLLING', 'QUESTION', 'VOTING', 'RESULT', 'FINISHED');

-- CreateEnum
CREATE TYPE "PointSource" AS ENUM ('POST_CREATE', 'COMMENT_CREATE', 'REACTION_GIVE', 'GAME_WIN', 'GAME_PARTICIPATE', 'AI_LOG_CREATE', 'GOAL_COMPLETE', 'DAILY_LOGIN', 'MODERATION_PENALTY');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('ORIGINAL', 'JOURNAL_SHARE', 'GOAL_UPDATE');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'INSIGHTFUL', 'SUPPORTIVE', 'FUNNY');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT', 'USER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "avatarConfig" JSONB,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planet_memberships" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlanetRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "planet_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planet_rules" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planet_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "ownerId" TEXT NOT NULL,
    "planetId" TEXT,
    "folderId" TEXT,
    "visibility" "JournalVisibility" NOT NULL DEFAULT 'PRIVATE',
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_versions" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_tags" (
    "journalId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "journal_tags_pkey" PRIMARY KEY ("journalId","tagId")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "parentId" TEXT,
    "planetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_permissions" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "grantedToUserId" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "planetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'ORIGINAL',
    "journalId" TEXT,
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "state" "AiJobState" NOT NULL DEFAULT 'QUEUED',
    "sourceUrl" TEXT,
    "manualTranscript" TEXT,
    "promptVersion" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "modelName" TEXT,
    "tokenUsage" INTEGER,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_job_steps" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "state" "AiJobState" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "ai_job_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_outputs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "category" TEXT,
    "actionItems" JSONB,
    "journalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "phase" "GamePhase" NOT NULL DEFAULT 'WAITING',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "maxRounds" INTEGER NOT NULL DEFAULT 3,
    "currentTurn" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_votes" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "PointSource" NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influence_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "contentScore" DOUBLE PRECISION NOT NULL,
    "engagementScore" DOUBLE PRECISION NOT NULL,
    "consistencyScore" DOUBLE PRECISION NOT NULL,
    "gameScore" DOUBLE PRECISION NOT NULL,
    "penaltyScore" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "influence_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_point_caps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_point_caps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "originalFilename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "blocks_blockerId_idx" ON "blocks"("blockerId");

-- CreateIndex
CREATE INDEX "blocks_blockedId_idx" ON "blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blockerId_blockedId_key" ON "blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "planets_slug_key" ON "planets"("slug");

-- CreateIndex
CREATE INDEX "planets_slug_idx" ON "planets"("slug");

-- CreateIndex
CREATE INDEX "planet_memberships_planetId_idx" ON "planet_memberships"("planetId");

-- CreateIndex
CREATE INDEX "planet_memberships_userId_idx" ON "planet_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "planet_memberships_planetId_userId_key" ON "planet_memberships"("planetId", "userId");

-- CreateIndex
CREATE INDEX "planet_rules_planetId_idx" ON "planet_rules"("planetId");

-- CreateIndex
CREATE UNIQUE INDEX "planet_rules_planetId_key_key" ON "planet_rules"("planetId", "key");

-- CreateIndex
CREATE INDEX "journals_ownerId_createdAt_idx" ON "journals"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "journals_ownerId_visibility_idx" ON "journals"("ownerId", "visibility");

-- CreateIndex
CREATE INDEX "journals_planetId_idx" ON "journals"("planetId");

-- CreateIndex
CREATE INDEX "journals_deletedAt_idx" ON "journals"("deletedAt");

-- CreateIndex
CREATE INDEX "journal_versions_journalId_idx" ON "journal_versions"("journalId");

-- CreateIndex
CREATE INDEX "tags_ownerId_idx" ON "tags"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_ownerId_name_key" ON "tags"("ownerId", "name");

-- CreateIndex
CREATE INDEX "folders_ownerId_idx" ON "folders"("ownerId");

-- CreateIndex
CREATE INDEX "folders_parentId_idx" ON "folders"("parentId");

-- CreateIndex
CREATE INDEX "share_permissions_journalId_idx" ON "share_permissions"("journalId");

-- CreateIndex
CREATE INDEX "share_permissions_grantedToUserId_idx" ON "share_permissions"("grantedToUserId");

-- CreateIndex
CREATE INDEX "goals_ownerId_idx" ON "goals"("ownerId");

-- CreateIndex
CREATE INDEX "posts_planetId_createdAt_idx" ON "posts"("planetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_deletedAt_idx" ON "posts"("deletedAt");

-- CreateIndex
CREATE INDEX "comments_postId_idx" ON "comments"("postId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "comments_deletedAt_idx" ON "comments"("deletedAt");

-- CreateIndex
CREATE INDEX "reactions_postId_idx" ON "reactions"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_postId_key" ON "reactions"("userId", "postId");

-- CreateIndex
CREATE INDEX "saved_posts_userId_idx" ON "saved_posts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_posts_userId_postId_key" ON "saved_posts"("userId", "postId");

-- CreateIndex
CREATE INDEX "reports_targetType_targetId_idx" ON "reports"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_reporterId_idx" ON "reports"("reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_jobs_idempotencyKey_key" ON "ai_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ai_jobs_ownerId_state_idx" ON "ai_jobs"("ownerId", "state");

-- CreateIndex
CREATE INDEX "ai_jobs_idempotencyKey_idx" ON "ai_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ai_job_steps_jobId_idx" ON "ai_job_steps"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_outputs_jobId_key" ON "ai_outputs"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_outputs_journalId_key" ON "ai_outputs"("journalId");

-- CreateIndex
CREATE INDEX "ai_outputs_jobId_idx" ON "ai_outputs"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_roomId_key" ON "game_sessions"("roomId");

-- CreateIndex
CREATE INDEX "game_sessions_roomId_idx" ON "game_sessions"("roomId");

-- CreateIndex
CREATE INDEX "game_participants_sessionId_idx" ON "game_participants"("sessionId");

-- CreateIndex
CREATE INDEX "game_participants_userId_idx" ON "game_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_participants_sessionId_userId_key" ON "game_participants"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "game_questions_sessionId_idx" ON "game_questions"("sessionId");

-- CreateIndex
CREATE INDEX "game_votes_questionId_idx" ON "game_votes"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "game_votes_questionId_voterId_key" ON "game_votes"("questionId", "voterId");

-- CreateIndex
CREATE INDEX "game_events_sessionId_idx" ON "game_events"("sessionId");

-- CreateIndex
CREATE INDEX "point_transactions_userId_createdAt_idx" ON "point_transactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "influence_scores_userId_key" ON "influence_scores"("userId");

-- CreateIndex
CREATE INDEX "influence_scores_score_idx" ON "influence_scores"("score" DESC);

-- CreateIndex
CREATE INDEX "daily_point_caps_userId_idx" ON "daily_point_caps"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_point_caps_userId_date_key" ON "daily_point_caps"("userId", "date");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "media_ownerId_idx" ON "media"("ownerId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planet_memberships" ADD CONSTRAINT "planet_memberships_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planet_memberships" ADD CONSTRAINT "planet_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planet_rules" ADD CONSTRAINT "planet_rules_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planet_rules" ADD CONSTRAINT "planet_rules_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_versions" ADD CONSTRAINT "journal_versions_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_versions" ADD CONSTRAINT "journal_versions_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_tags" ADD CONSTRAINT "journal_tags_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_tags" ADD CONSTRAINT "journal_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_permissions" ADD CONSTRAINT "share_permissions_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_permissions" ADD CONSTRAINT "share_permissions_grantedToUserId_fkey" FOREIGN KEY ("grantedToUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_permissions" ADD CONSTRAINT "share_permissions_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "report_post_fk" FOREIGN KEY ("targetId") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "report_comment_fk" FOREIGN KEY ("targetId") REFERENCES "comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_job_steps" ADD CONSTRAINT "ai_job_steps_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_votes" ADD CONSTRAINT "game_votes_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "game_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_votes" ADD CONSTRAINT "game_votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_votes" ADD CONSTRAINT "game_votes_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influence_scores" ADD CONSTRAINT "influence_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_point_caps" ADD CONSTRAINT "daily_point_caps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
