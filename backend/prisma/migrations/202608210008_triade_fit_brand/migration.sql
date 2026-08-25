ALTER TABLE "AppConfig" ALTER COLUMN "appName" SET DEFAULT 'Triade FIT';
ALTER TABLE "AppConfig" ALTER COLUMN "planTitle" SET DEFAULT 'Plano Triade FIT — 12 meses';

UPDATE "AppConfig"
SET
  "appName" = CASE WHEN "appName" = 'Essenza' THEN 'Triade FIT' ELSE "appName" END,
  "planTitle" = CASE WHEN "planTitle" = 'Plano Essenza — 12 meses' THEN 'Plano Triade FIT — 12 meses' ELSE "planTitle" END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'app';
