-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY', 'INVITE_ONLY');

-- AlterTable: add new visibility column with default
ALTER TABLE "Event" ADD COLUMN "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';

-- Migrate existing data: events that were invite-only stay invite-only
UPDATE "Event" SET "visibility" = 'INVITE_ONLY' WHERE "isInviteOnly" = true;

-- AlterTable: drop old boolean column
ALTER TABLE "Event" DROP COLUMN "isInviteOnly";

-- CreateTable
CREATE TABLE "EventInvite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventInvite_eventId_invitedUserId_key" ON "EventInvite"("eventId", "invitedUserId");

-- AddForeignKey
ALTER TABLE "EventInvite" ADD CONSTRAINT "EventInvite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvite" ADD CONSTRAINT "EventInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
