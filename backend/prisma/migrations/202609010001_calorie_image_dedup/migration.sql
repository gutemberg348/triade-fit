ALTER TABLE "CalorieEntry"
ADD COLUMN "imageHash" TEXT;

CREATE INDEX "CalorieEntry_studentId_imageHash_idx"
ON "CalorieEntry"("studentId", "imageHash");
