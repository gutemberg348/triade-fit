CREATE TYPE "LessonKind" AS ENUM ('WORKOUT', 'MEDITATION');

ALTER TABLE "Lesson"
  ADD COLUMN "kind" "LessonKind" NOT NULL DEFAULT 'WORKOUT',
  ADD COLUMN "difficulty" TEXT,
  ADD COLUMN "calories" INTEGER;

CREATE TABLE "CommunityPost" (
  "id" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorAvatarUrl" TEXT,
  "message" TEXT NOT NULL,
  "imageUrl" TEXT,
  "likesCount" INTEGER NOT NULL DEFAULT 0,
  "commentsCount" INTEGER NOT NULL DEFAULT 0,
  "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityPost_status_publishedAt_idx" ON "CommunityPost"("status", "publishedAt" DESC);
CREATE INDEX "CommunityPost_createdById_idx" ON "CommunityPost"("createdById");

ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
