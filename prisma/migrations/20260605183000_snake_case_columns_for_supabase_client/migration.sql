-- Rename existing Prisma-created camelCase columns to snake_case for direct Supabase Client usage.
-- These operations preserve data and do not drop tables or rows.

ALTER TABLE "profiles" RENAME COLUMN "legacyId" TO "legacy_id";
ALTER TABLE "profiles" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "profiles" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "profiles" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "shopping_lists" RENAME COLUMN "legacyId" TO "legacy_id";
ALTER TABLE "shopping_lists" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "shopping_lists" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "shopping_lists" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "shopping_lists" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "products" RENAME COLUMN "legacyId" TO "legacy_id";
ALTER TABLE "products" RENAME COLUMN "listId" TO "list_id";
ALTER TABLE "products" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "products" RENAME COLUMN "unitPrice" TO "unit_price";
ALTER TABLE "products" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE "products" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "products" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "products" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "price_history" RENAME COLUMN "legacyId" TO "legacy_id";
ALTER TABLE "price_history" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "price_history" RENAME COLUMN "listId" TO "list_id";
ALTER TABLE "price_history" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "price_history" RENAME COLUMN "productName" TO "product_name";
ALTER TABLE "price_history" RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "passkey_credentials" RENAME COLUMN "legacyId" TO "legacy_id";
ALTER TABLE "passkey_credentials" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "passkey_credentials" RENAME COLUMN "credentialId" TO "credential_id";
ALTER TABLE "passkey_credentials" RENAME COLUMN "publicKey" TO "public_key";
ALTER TABLE "passkey_credentials" RENAME COLUMN "deviceName" TO "device_name";
ALTER TABLE "passkey_credentials" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "passkey_credentials" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "passkey_credentials" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER INDEX "profiles_legacyId_key" RENAME TO "profiles_legacy_id_key";
ALTER INDEX "shopping_lists_legacyId_key" RENAME TO "shopping_lists_legacy_id_key";
ALTER INDEX "shopping_lists_userId_idx" RENAME TO "shopping_lists_user_id_idx";
ALTER INDEX "products_legacyId_key" RENAME TO "products_legacy_id_key";
ALTER INDEX "products_userId_idx" RENAME TO "products_user_id_idx";
ALTER INDEX "products_listId_purchased_sortOrder_idx" RENAME TO "products_list_id_purchased_sort_order_idx";
ALTER INDEX "price_history_legacyId_key" RENAME TO "price_history_legacy_id_key";
ALTER INDEX "price_history_userId_createdAt_idx" RENAME TO "price_history_user_id_created_at_idx";
ALTER INDEX "price_history_listId_idx" RENAME TO "price_history_list_id_idx";
ALTER INDEX "price_history_productId_idx" RENAME TO "price_history_product_id_idx";
ALTER INDEX "passkey_credentials_legacyId_key" RENAME TO "passkey_credentials_legacy_id_key";
ALTER INDEX "passkey_credentials_credentialId_key" RENAME TO "passkey_credentials_credential_id_key";
ALTER INDEX "passkey_credentials_userId_idx" RENAME TO "passkey_credentials_user_id_idx";
