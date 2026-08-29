CREATE TYPE "ProgramType" AS ENUM ('CONTENT', 'TRAINING');

ALTER TYPE "LessonKind" ADD VALUE IF NOT EXISTS 'CONTENT';

ALTER TABLE "Program"
ADD COLUMN "type" "ProgramType" NOT NULL DEFAULT 'CONTENT';

ALTER TABLE "Lesson"
ADD COLUMN "isIntroductory" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Program_type_status_sortOrder_idx"
ON "Program"("type", "status", "sortOrder");

CREATE INDEX "Lesson_isIntroductory_status_sortOrder_idx"
ON "Lesson"("isIntroductory", "status", "sortOrder");

-- Mantém uma boa primeira experiência após o deploy: as três primeiras aulas
-- publicadas do catálogo atual viram os destaques iniciais da Home. O admin
-- pode trocar essa seleção depois sem alterar progresso ou matrícula.
WITH ranked_lessons AS (
  SELECT
    lesson."id",
    ROW_NUMBER() OVER (
      ORDER BY program."sortOrder", module."sortOrder", lesson."sortOrder", lesson."createdAt"
    ) AS position
  FROM "Lesson" lesson
  INNER JOIN "Module" module ON module."id" = lesson."moduleId"
  INNER JOIN "Program" program ON program."id" = module."programId"
  WHERE lesson."status" = 'PUBLISHED'
    AND module."status" = 'PUBLISHED'
    AND program."status" = 'PUBLISHED'
)
UPDATE "Lesson"
SET "isIntroductory" = true
WHERE "id" IN (
  SELECT "id" FROM ranked_lessons WHERE position <= 3
);
