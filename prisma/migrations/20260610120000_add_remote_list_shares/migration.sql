-- Remote list sharing model for Supabase Client + RLS.

CREATE TYPE "SharePermission" AS ENUM ('viewer', 'editor');

CREATE TABLE "list_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "list_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "shared_user_id" UUID NOT NULL,
    "permission" "SharePermission" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "list_shares_list_id_shared_user_id_key" ON "list_shares"("list_id", "shared_user_id");
CREATE INDEX "list_shares_owner_user_id_idx" ON "list_shares"("owner_user_id");
CREATE INDEX "list_shares_shared_user_id_idx" ON "list_shares"("shared_user_id");

ALTER TABLE "list_shares" ADD CONSTRAINT "list_shares_list_id_fkey"
FOREIGN KEY ("list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "list_shares" ADD CONSTRAINT "list_shares_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "list_shares" ADD CONSTRAINT "list_shares_shared_user_id_fkey"
FOREIGN KEY ("shared_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
