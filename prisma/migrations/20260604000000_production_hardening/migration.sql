-- Production hardening: audit trail and query indexes.
CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "listId" UUID,
  "metadata" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_listId_createdAt_idx" ON "audit_logs"("listId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

CREATE INDEX "price_history_productName_idx" ON "price_history"("productName");
CREATE INDEX "price_history_supermarket_idx" ON "price_history"("supermarket");
CREATE INDEX "price_history_recordedAt_idx" ON "price_history"("recordedAt");
CREATE INDEX "shared_list_access_listId_idx" ON "shared_list_access"("listId");
CREATE INDEX "list_invites_status_idx" ON "list_invites"("status");
CREATE UNIQUE INDEX "list_invites_pending_email_unique"
  ON "list_invites"("listId", lower("invitedEmail"))
  WHERE "status" = 'PENDING';
CREATE INDEX "products_isBought_idx" ON "products"("isBought");
CREATE INDEX "products_sortOrder_idx" ON "products"("sortOrder");
