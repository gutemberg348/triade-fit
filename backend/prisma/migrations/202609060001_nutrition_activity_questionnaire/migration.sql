ALTER TABLE "NutritionProfile"
  ADD COLUMN "dailyRoutine" TEXT NOT NULL DEFAULT 'LIGHTLY_ACTIVE',
  ADD COLUMN "exerciseFrequency" TEXT NOT NULL DEFAULT 'ONE_TWO',
  ADD COLUMN "exerciseDuration" TEXT,
  ADD COLUMN "exerciseIntensity" TEXT;

UPDATE "NutritionProfile"
SET
  "dailyRoutine" = CASE "activityLevel"
    WHEN 'SEDENTARY' THEN 'VERY_SEDENTARY'
    WHEN 'LIGHT' THEN 'LIGHTLY_ACTIVE'
    WHEN 'MODERATE' THEN 'MODERATELY_ACTIVE'
    WHEN 'ACTIVE' THEN 'VERY_ACTIVE'
    ELSE 'LIGHTLY_ACTIVE'
  END,
  "exerciseFrequency" = CASE "activityLevel"
    WHEN 'SEDENTARY' THEN 'NONE'
    WHEN 'LIGHT' THEN 'ONE_TWO'
    WHEN 'MODERATE' THEN 'THREE_FOUR'
    WHEN 'ACTIVE' THEN 'FIVE_SIX'
    ELSE 'ONE_TWO'
  END,
  "exerciseDuration" = CASE
    WHEN "activityLevel" = 'SEDENTARY' THEN NULL
    ELSE 'THIRTY_SIXTY'
  END,
  "exerciseIntensity" = CASE
    WHEN "activityLevel" = 'SEDENTARY' THEN NULL
    ELSE 'MODERATE'
  END;
