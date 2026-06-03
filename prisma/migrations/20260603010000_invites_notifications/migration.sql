CREATE TYPE "ListInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED');

CREATE TYPE "NotificationType" AS ENUM (
  'LIST_INVITE_RECEIVED',
  'LIST_INVITE_ACCEPTED',
  'LIST_INVITE_DECLINED',
  'LIST_SHARED_ACCESS_REMOVED',
  'PRODUCT_UPDATED',
  'PRODUCT_PURCHASED'
);

CREATE TABLE "list_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listId" UUID NOT NULL,
  "invitedEmail" TEXT NOT NULL,
  "invitedUserId" UUID,
  "invitedByUserId" UUID NOT NULL,
  "role" "ListAccessRole" NOT NULL,
  "status" "ListInviteStatus" NOT NULL DEFAULT 'PENDING',
  "token" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "list_invites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "list_invites_token_key" ON "list_invites"("token");
CREATE INDEX "list_invites_listId_status_idx" ON "list_invites"("listId", "status");
CREATE INDEX "list_invites_invitedEmail_status_idx" ON "list_invites"("invitedEmail", "status");
CREATE INDEX "list_invites_invitedUserId_status_idx" ON "list_invites"("invitedUserId", "status");
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

ALTER TABLE "list_invites"
  ADD CONSTRAINT "list_invites_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "list_invites"
  ADD CONSTRAINT "list_invites_invitedUserId_fkey"
  FOREIGN KEY ("invitedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "list_invites"
  ADD CONSTRAINT "list_invites_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
