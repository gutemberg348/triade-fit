ALTER TABLE "ProgressPhoto"
  ADD COLUMN "moduleId" UUID;

-- Preserve os registros anteriores no primeiro módulo de conteúdo em que a aluna
-- está matriculada. A coluna continua opcional para não apagar fotos órfãs/legadas.
UPDATE "ProgressPhoto" AS photo
SET "moduleId" = (
  SELECT module.id
  FROM "Module" AS module
  INNER JOIN "Program" AS program ON program.id = module."programId"
  INNER JOIN "StudentProgram" AS enrollment
    ON enrollment."programId" = program.id
    AND enrollment."studentId" = photo."studentId"
  WHERE program.type = 'CONTENT'
    AND program.status = 'PUBLISHED'
    AND module.status = 'PUBLISHED'
    AND enrollment.status = 'ACTIVE'
  ORDER BY program."sortOrder" ASC, module."sortOrder" ASC
  LIMIT 1
)
WHERE photo."moduleId" IS NULL;

CREATE INDEX "ProgressPhoto_studentId_moduleId_takenAt_idx"
  ON "ProgressPhoto"("studentId", "moduleId", "takenAt" DESC);

CREATE INDEX "ProgressPhoto_moduleId_idx"
  ON "ProgressPhoto"("moduleId");

ALTER TABLE "ProgressPhoto"
  ADD CONSTRAINT "ProgressPhoto_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "Module"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
