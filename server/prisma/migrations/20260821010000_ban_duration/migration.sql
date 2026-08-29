-- Replace the simple isBanned flag with a bannedUntil timestamp so bans can
-- have a duration (temporary or permanent, using a far-future sentinel date).
ALTER TABLE "User" ADD COLUMN "bannedUntil" TIMESTAMP(3);

ALTER TABLE "User" DROP COLUMN "isBanned";
