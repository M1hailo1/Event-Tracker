ALTER TYPE "NotificationType" ADD VALUE 'EVENT_COMMENT';
ALTER TYPE "NotificationType" ADD VALUE 'COMMENT_REPLY';
ALTER TABLE "Notification" ADD COLUMN "groupKey" TEXT, ADD COLUMN "activityCount" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "Notification_groupKey_key" ON "Notification"("groupKey");
CREATE TYPE "CommentReportReason" AS ENUM ('HARASSMENT', 'SPAM', 'INAPPROPRIATE', 'OTHER');
CREATE TYPE "CommentReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'REMOVED');
CREATE TABLE "CommentReport" (
  "id" TEXT NOT NULL, "commentId" TEXT NOT NULL, "reporterId" TEXT NOT NULL,
  "reason" "CommentReportReason" NOT NULL, "details" TEXT, "bodySnapshot" TEXT NOT NULL,
  "status" "CommentReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3), "reviewedBy" TEXT,
  CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommentReport_commentId_reporterId_key" ON "CommentReport"("commentId", "reporterId");
CREATE INDEX "CommentReport_status_createdAt_id_idx" ON "CommentReport"("status", "createdAt", "id");
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "EventComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
