-- AlterTable: add reminderSent flag so we don't send the 24h reminder twice
ALTER TABLE "Registration" ADD COLUMN "reminderSent" BOOLEAN NOT NULL DEFAULT false;
