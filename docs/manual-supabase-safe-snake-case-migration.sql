-- Safe manual snake_case migration for Supabase SQL Editor.
-- Use this file instead of the original Prisma snake_case migration when the
-- database may already be partially migrated.
--
-- This script is idempotent for manual execution:
-- - renames a column only when the old camelCase column exists;
-- - skips the rename when the new snake_case column already exists;
-- - applies defaults only when the target column exists;
-- - renames indexes only when the old index exists and the new one does not.
--
-- It does not use DROP TABLE, DROP COLUMN, TRUNCATE, DELETE or destructive data operations.

DO $$
BEGIN
  -- profiles
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'legacyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'legacy_id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN "legacyId" TO legacy_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN "createdAt" TO created_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN "updatedAt" TO updated_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- shopping_lists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'legacyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'legacy_id'
  ) THEN
    ALTER TABLE public.shopping_lists RENAME COLUMN "legacyId" TO legacy_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'userId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.shopping_lists RENAME COLUMN "userId" TO user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.shopping_lists RENAME COLUMN "createdAt" TO created_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.shopping_lists RENAME COLUMN "updatedAt" TO updated_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shopping_lists' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.shopping_lists ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- products
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'legacyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'legacy_id'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN "legacyId" TO legacy_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'listId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'list_id'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN "listId" TO list_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'userId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN "userId" TO user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'unitPrice'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN "unitPrice" TO unit_price;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sortOrder'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN "sortOrder" TO sort_order;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN "createdAt" TO created_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN "updatedAt" TO updated_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- price_history
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'legacyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'legacy_id'
  ) THEN
    ALTER TABLE public.price_history RENAME COLUMN "legacyId" TO legacy_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'userId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.price_history RENAME COLUMN "userId" TO user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'listId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'list_id'
  ) THEN
    ALTER TABLE public.price_history RENAME COLUMN "listId" TO list_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'productId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE public.price_history RENAME COLUMN "productId" TO product_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'productName'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'product_name'
  ) THEN
    ALTER TABLE public.price_history RENAME COLUMN "productName" TO product_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_history' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.price_history RENAME COLUMN "createdAt" TO created_at;
  END IF;

  -- passkey_credentials
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'legacyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'legacy_id'
  ) THEN
    ALTER TABLE public.passkey_credentials RENAME COLUMN "legacyId" TO legacy_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'userId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.passkey_credentials RENAME COLUMN "userId" TO user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'credentialId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'credential_id'
  ) THEN
    ALTER TABLE public.passkey_credentials RENAME COLUMN "credentialId" TO credential_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'publicKey'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'public_key'
  ) THEN
    ALTER TABLE public.passkey_credentials RENAME COLUMN "publicKey" TO public_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'deviceName'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'device_name'
  ) THEN
    ALTER TABLE public.passkey_credentials RENAME COLUMN "deviceName" TO device_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.passkey_credentials RENAME COLUMN "createdAt" TO created_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.passkey_credentials RENAME COLUMN "updatedAt" TO updated_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.passkey_credentials ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

DO $$
BEGIN
  -- indexes
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'profiles_legacyId_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'profiles_legacy_id_key') THEN
    ALTER INDEX public."profiles_legacyId_key" RENAME TO profiles_legacy_id_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'shopping_lists_legacyId_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'shopping_lists_legacy_id_key') THEN
    ALTER INDEX public."shopping_lists_legacyId_key" RENAME TO shopping_lists_legacy_id_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'shopping_lists_userId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'shopping_lists_user_id_idx') THEN
    ALTER INDEX public."shopping_lists_userId_idx" RENAME TO shopping_lists_user_id_idx;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'products_legacyId_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'products_legacy_id_key') THEN
    ALTER INDEX public."products_legacyId_key" RENAME TO products_legacy_id_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'products_userId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'products_user_id_idx') THEN
    ALTER INDEX public."products_userId_idx" RENAME TO products_user_id_idx;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'products_listId_purchased_sortOrder_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'products_list_id_purchased_sort_order_idx') THEN
    ALTER INDEX public."products_listId_purchased_sortOrder_idx" RENAME TO products_list_id_purchased_sort_order_idx;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'price_history_legacyId_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'price_history_legacy_id_key') THEN
    ALTER INDEX public."price_history_legacyId_key" RENAME TO price_history_legacy_id_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'price_history_userId_createdAt_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'price_history_user_id_created_at_idx') THEN
    ALTER INDEX public."price_history_userId_createdAt_idx" RENAME TO price_history_user_id_created_at_idx;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'price_history_listId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'price_history_list_id_idx') THEN
    ALTER INDEX public."price_history_listId_idx" RENAME TO price_history_list_id_idx;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'price_history_productId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'price_history_product_id_idx') THEN
    ALTER INDEX public."price_history_productId_idx" RENAME TO price_history_product_id_idx;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'passkey_credentials_legacyId_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'passkey_credentials_legacy_id_key') THEN
    ALTER INDEX public."passkey_credentials_legacyId_key" RENAME TO passkey_credentials_legacy_id_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'passkey_credentials_credentialId_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'passkey_credentials_credential_id_key') THEN
    ALTER INDEX public."passkey_credentials_credentialId_key" RENAME TO passkey_credentials_credential_id_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'passkey_credentials_userId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'passkey_credentials_user_id_idx') THEN
    ALTER INDEX public."passkey_credentials_userId_idx" RENAME TO passkey_credentials_user_id_idx;
  END IF;
END $$;
