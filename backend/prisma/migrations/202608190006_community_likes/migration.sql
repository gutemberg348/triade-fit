ALTER TABLE "CommunityPost"
  DROP COLUMN "likesCount",
  DROP COLUMN "commentsCount";

CREATE TABLE "CommunityPostLike" (
  "id" UUID NOT NULL,
  "postId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityPostLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityPostLike_postId_userId_key"
  ON "CommunityPostLike"("postId", "userId");
CREATE INDEX "CommunityPostLike_userId_createdAt_idx"
  ON "CommunityPostLike"("userId", "createdAt");

ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
