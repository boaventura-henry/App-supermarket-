ALTER TABLE "price_history"
  ADD COLUMN "productId" UUID,
  ADD COLUMN "quantity" DECIMAL(12,3);

CREATE INDEX "price_history_productId_idx" ON "price_history"("productId");

ALTER TABLE "price_history"
  ADD CONSTRAINT "price_history_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
