UPDATE "AppConfig"
SET
  "loginImageUrl" = CASE
    WHEN "loginImageUrl" IS NULL OR BTRIM("loginImageUrl") = ''
      THEN '/brand/triade-fit-login.png'
    ELSE "loginImageUrl"
  END,
  "homeBannerUrl" = CASE
    WHEN "homeBannerUrl" IS NULL OR BTRIM("homeBannerUrl") = ''
      THEN '/brand/triade-fit-home.png'
    ELSE "homeBannerUrl"
  END,
  "paymentBannerUrl" = CASE
    WHEN "paymentBannerUrl" IS NULL OR BTRIM("paymentBannerUrl") = ''
      THEN '/brand/triade-fit-balance.png'
    ELSE "paymentBannerUrl"
  END
WHERE "id" = 'app';

UPDATE "Program"
SET "coverUrl" = '/brand/triade-fit-home.png'
WHERE "coverUrl" IS NULL OR BTRIM("coverUrl") = '';

WITH ranked_modules AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "programId" ORDER BY "sortOrder", "createdAt") AS position
  FROM "Module"
  WHERE "coverUrl" IS NULL OR BTRIM("coverUrl") = ''
)
UPDATE "Module" AS module
SET "coverUrl" = CASE
  WHEN MOD(ranked_modules.position, 2) = 0 THEN '/brand/triade-fit-balance.png'
  ELSE '/brand/triade-fit-focus.png'
END
FROM ranked_modules
WHERE module."id" = ranked_modules."id";

WITH ranked_lessons AS (
  SELECT
    "id",
    "kind",
    ROW_NUMBER() OVER (PARTITION BY "moduleId" ORDER BY "sortOrder", "createdAt") AS position
  FROM "Lesson"
  WHERE "coverUrl" IS NULL OR BTRIM("coverUrl") = ''
)
UPDATE "Lesson" AS lesson
SET "coverUrl" = CASE
  WHEN ranked_lessons."kind" = 'MEDITATION' THEN '/brand/triade-fit-balance.png'
  WHEN MOD(ranked_lessons.position, 2) = 0 THEN '/brand/triade-fit-home.png'
  ELSE '/brand/triade-fit-focus.png'
END
FROM ranked_lessons
WHERE lesson."id" = ranked_lessons."id";
