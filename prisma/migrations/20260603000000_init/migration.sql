CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "legacyId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "securityAnswerHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shopping_lists" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "legacyId" TEXT,
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "legacyId" TEXT,
  "userId" UUID NOT NULL,
  "listId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT '',
  "quantity" DECIMAL(12,3),
  "unitPrice" DECIMAL(12,2),
  "supermarket" TEXT NOT NULL DEFAULT '',
  "isBought" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "legacyId" TEXT,
  "userId" UUID NOT NULL,
  "listId" UUID,
  "productName" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT '',
  "price" DECIMAL(12,2) NOT NULL,
  "supermarket" TEXT NOT NULL DEFAULT '',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "passkey_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "legacyId" TEXT,
  "userId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "rawId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_legacyId_key" ON "users"("legacyId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "shopping_lists_legacyId_key" ON "shopping_lists"("legacyId");
CREATE INDEX "shopping_lists_userId_idx" ON "shopping_lists"("userId");
CREATE UNIQUE INDEX "products_legacyId_key" ON "products"("legacyId");
CREATE INDEX "products_userId_idx" ON "products"("userId");
CREATE INDEX "products_listId_isBought_sortOrder_idx" ON "products"("listId", "isBought", "sortOrder");
CREATE UNIQUE INDEX "price_history_legacyId_key" ON "price_history"("legacyId");
CREATE INDEX "price_history_userId_recordedAt_idx" ON "price_history"("userId", "recordedAt");
CREATE INDEX "price_history_listId_idx" ON "price_history"("listId");
CREATE UNIQUE INDEX "passkey_credentials_legacyId_key" ON "passkey_credentials"("legacyId");
CREATE UNIQUE INDEX "passkey_credentials_userId_rawId_key" ON "passkey_credentials"("userId", "rawId");
CREATE INDEX "passkey_credentials_userId_idx" ON "passkey_credentials"("userId");

ALTER TABLE "shopping_lists"
  ADD CONSTRAINT "shopping_lists_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_history"
  ADD CONSTRAINT "price_history_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_history"
  ADD CONSTRAINT "price_history_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "shopping_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "passkey_credentials"
  ADD CONSTRAINT "passkey_credentials_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
