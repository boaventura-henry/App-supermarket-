import type { PriceHistory, Product } from "./types";

type ProductStatusLike = {
  isBought?: boolean;
  purchased?: boolean;
  quantity?: number | string | null;
};

export function hasPositiveQuantity(item: ProductStatusLike) {
  return Number(item.quantity) > 0;
}

export function isPurchasedItem(item: ProductStatusLike) {
  return (item.isBought === true || item.purchased === true) && hasPositiveQuantity(item);
}

export function isPendingItem(item: ProductStatusLike) {
  return item.isBought !== true && item.purchased !== true && hasPositiveQuantity(item);
}

type HistoryProductKeyItem = {
  userId: string;
  listId?: string;
  name?: string;
  productName?: string;
};

function historyProductKey(item: HistoryProductKeyItem) {
  const name = item.name ?? item.productName ?? "";
  return [item.userId, item.listId ?? "", name.trim().toLowerCase()].join("::");
}

function historyProductUserKey(item: HistoryProductKeyItem) {
  const name = item.name ?? item.productName ?? "";
  return [item.userId, name.trim().toLowerCase()].join("::");
}

export function filterPriceHistoryForPurchasedItems(priceHistory: PriceHistory[], products: Product[]) {
  const purchasedProducts = products.filter(isPurchasedItem);
  const purchasedProductIds = new Set(purchasedProducts.map((product) => product.id));
  const purchasedProductKeys = new Set(purchasedProducts.map(historyProductKey));
  const purchasedProductUserKeys = new Set(purchasedProducts.map(historyProductUserKey));

  return priceHistory.filter((history) => {
    if (history.productId) {
      return purchasedProductIds.has(history.productId);
    }

    if (history.listId) {
      return purchasedProductKeys.has(historyProductKey(history));
    }

    return purchasedProductUserKeys.has(historyProductUserKey(history));
  });
}
