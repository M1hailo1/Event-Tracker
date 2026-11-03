ALTER TYPE "NotificationType" ADD VALUE 'EVENT_JOINED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_RATING_PROMPT';

-- Persist the rollout boundary so restarts never trigger prompts for historical events.
ALTER TABLE "Event" ADD COLUMN "ratingPromptAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Registration" ADD COLUMN "ratingPromptSent" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Registration" AS registration
SET "ratingPromptSent" = true
FROM "Event" AS event
WHERE registration."eventId" = event."id"
  AND COALESCE(event."endDate", event."date") <= event."ratingPromptAfter";
