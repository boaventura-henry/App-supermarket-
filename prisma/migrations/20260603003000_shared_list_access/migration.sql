CREATE TYPE "ListAccessRole" AS ENUM ('VIEWER', 'EDITOR');

CREATE TABLE "shared_list_access" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "ListAccessRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shared_list_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shared_list_access_listId_userId_key" ON "shared_list_access"("listId", "userId");
CREATE INDEX "shared_list_access_userId_idx" ON "shared_list_access"("userId");

ALTER TABLE "shared_list_access"
  ADD CONSTRAINT "shared_list_access_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shared_list_access"
  ADD CONSTRAINT "shared_list_access_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
