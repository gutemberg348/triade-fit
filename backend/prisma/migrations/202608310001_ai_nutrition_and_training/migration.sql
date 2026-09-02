CREATE TABLE "CalorieEntry" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "photoUrl" TEXT NOT NULL,
  "foodName" TEXT NOT NULL,
  "portionDescription" TEXT,
  "calories" INTEGER NOT NULL,
  "proteinGrams" DECIMAL(7,1),
  "carbohydrateGrams" DECIMAL(7,1),
  "fatGrams" DECIMAL(7,1),
  "confidence" TEXT,
  "analysis" TEXT,
  "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalorieEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingAiMessage" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "imageUrl" TEXT,
  "videoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingAiMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalorieEntry_studentId_consumedAt_idx"
ON "CalorieEntry"("studentId", "consumedAt" DESC);

CREATE INDEX "TrainingAiMessage_studentId_createdAt_idx"
ON "TrainingAiMessage"("studentId", "createdAt" DESC);

ALTER TABLE "CalorieEntry" ADD CONSTRAINT "CalorieEntry_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrainingAiMessage" ADD CONSTRAINT "TrainingAiMessage_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
