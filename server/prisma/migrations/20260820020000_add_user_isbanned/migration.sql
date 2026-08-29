-- AlterTable: add isBanned flag, everyone defaults to not banned
ALTER TABLE "User" ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false;
