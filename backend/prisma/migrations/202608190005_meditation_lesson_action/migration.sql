ALTER TABLE "Lesson"
  ADD COLUMN "showMeditationButton" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Lesson"
SET "showMeditationButton" = true
WHERE "kind" = 'MEDITATION';
