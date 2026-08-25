UPDATE "User"
SET "name" = 'Marina Triade'
WHERE "name" = 'Marina Essenza';

UPDATE "Program"
SET
  "title" = replace("title", 'Essenza', 'Triade FIT'),
  "description" = replace("description", 'Essenza', 'Triade FIT')
WHERE "title" LIKE '%Essenza%' OR "description" LIKE '%Essenza%';

UPDATE "Module"
SET
  "title" = replace("title", 'Essenza', 'Triade FIT'),
  "description" = replace("description", 'Essenza', 'Triade FIT')
WHERE "title" LIKE '%Essenza%' OR "description" LIKE '%Essenza%';

UPDATE "Lesson"
SET
  "title" = replace("title", 'Essenza', 'Triade FIT'),
  "description" = replace("description", 'Essenza', 'Triade FIT'),
  "instructions" = replace("instructions", 'Essenza', 'Triade FIT'),
  "notes" = replace("notes", 'Essenza', 'Triade FIT')
WHERE
  "title" LIKE '%Essenza%'
  OR "description" LIKE '%Essenza%'
  OR "instructions" LIKE '%Essenza%'
  OR "notes" LIKE '%Essenza%';

UPDATE "CommunityPost"
SET
  "authorName" = replace("authorName", 'Essenza', 'Triade FIT'),
  "message" = replace("message", 'Essenza', 'Triade FIT')
WHERE "authorName" LIKE '%Essenza%' OR "message" LIKE '%Essenza%';

UPDATE "Announcement"
SET
  "title" = replace("title", 'Essenza', 'Triade FIT'),
  "message" = replace("message", 'Essenza', 'Triade FIT')
WHERE "title" LIKE '%Essenza%' OR "message" LIKE '%Essenza%';
