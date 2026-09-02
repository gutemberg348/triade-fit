CREATE TABLE "CommunityPostComment" (
  "id" UUID NOT NULL,
  "postId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "parentId" UUID,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommunityPostComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityPostComment_postId_createdAt_idx"
  ON "CommunityPostComment"("postId", "createdAt");

CREATE INDEX "CommunityPostComment_parentId_createdAt_idx"
  ON "CommunityPostComment"("parentId", "createdAt");

CREATE INDEX "CommunityPostComment_userId_createdAt_idx"
  ON "CommunityPostComment"("userId", "createdAt");

ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "CommunityPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
