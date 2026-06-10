-- Ensure direct Supabase Client inserts can omit UUID primary keys.
-- Supabase Postgres provides gen_random_uuid() through pgcrypto.

ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "shopping_lists" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "products" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "price_history" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "passkey_credentials" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
