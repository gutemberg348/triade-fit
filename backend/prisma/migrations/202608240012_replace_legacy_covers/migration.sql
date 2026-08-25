UPDATE "Program"
SET "coverUrl" = '/brand/triade-fit-home.png'
WHERE "coverUrl" LIKE '%/essenza-cover.png';

WITH ranked_modules AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "programId" ORDER BY "sortOrder", "createdAt") AS position
  FROM "Module"
  WHERE "coverUrl" LIKE '%/essenza-cover.png'
)
UPDATE "Module" AS module
SET "coverUrl" = CASE
  WHEN MOD(ranked_modules.position, 2) = 0 THEN '/brand/triade-fit-balance.png'
  ELSE '/brand/triade-fit-focus.png'
END
FROM ranked_modules
WHERE module."id" = ranked_modules."id";

UPDATE "Lesson"
SET "calories" = CASE "title"
  WHEN 'Boas-vindas à sua jornada' THEN 35
  WHEN 'Mobilidade essencial' THEN 65
  WHEN 'Ativação e respiração' THEN 45
  WHEN 'Pernas: base e controle' THEN 280
  WHEN 'Glúteos em foco' THEN 240
  WHEN 'Core funcional' THEN 160
  WHEN 'Full body Triade FIT' THEN 390
  WHEN 'Recuperação consciente' THEN 70
  ELSE "calories"
END
WHERE "kind" = 'WORKOUT' AND "calories" IS NULL;
