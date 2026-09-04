CREATE TABLE "NutritionProfile" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "biologicalSex" TEXT NOT NULL,
  "ageYears" INTEGER NOT NULL,
  "weightKg" DECIMAL(6,2) NOT NULL,
  "heightCm" DECIMAL(5,2) NOT NULL,
  "activityLevel" TEXT NOT NULL,
  "basalCalories" INTEGER NOT NULL,
  "dailyCalorieTarget" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NutritionProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NutritionProfile_studentId_key"
  ON "NutritionProfile"("studentId");

ALTER TABLE "NutritionProfile"
  ADD CONSTRAINT "NutritionProfile_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
