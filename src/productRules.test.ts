import { describe, expect, it } from "vitest";

import { filterPriceHistoryForPurchasedItems, hasPositiveQuantity, isPendingItem, isPurchasedItem } from "./productRules";
import type { PriceHistory, Product } from "./types";

const baseProduct: Product = {
  id: "product-a",
  userId: "user-a",
  listId: "list-a",
  name: "Arroz",
  brand: "",
  quantity: null,
  unitPrice: 10,
  supermarket: "Mercado",
  timestamp: 1,
  isBought: false,
  sortOrder: 0
};

const baseHistory: PriceHistory = {
  id: "history-a",
  userId: "user-a",
  listId: "list-a",
  productId: "product-a",
  productName: "Arroz",
  brand: "",
  quantity: 1,
  price: 10,
  supermarket: "Mercado",
  timestamp: 1
};

describe("productRules", () => {
  it("exige quantidade positiva para considerar item comprado", () => {
    expect(isPurchasedItem({ isBought: true, quantity: 0 })).toBe(false);
    expect(isPurchasedItem({ isBought: true, quantity: 2 })).toBe(true);
    expect(isPurchasedItem({ isBought: false, quantity: 100 })).toBe(false);
  });

  it("exige quantidade positiva para considerar item pendente", () => {
    expect(isPendingItem({ isBought: false, quantity: 0 })).toBe(false);
    expect(isPendingItem({ isBought: false, quantity: 3 })).toBe(true);
    expect(isPendingItem({ isBought: true, quantity: 3 })).toBe(false);
  });

  it("normaliza quantidade invalida como nao positiva", () => {
    expect(hasPositiveQuantity({ quantity: null })).toBe(false);
    expect(hasPositiveQuantity({ quantity: "" })).toBe(false);
    expect(hasPositiveQuantity({ quantity: "abc" })).toBe(false);
  });

  it("mantem no historico apenas produtos efetivamente comprados", () => {
    const products = [
      { ...baseProduct, id: "product-a", isBought: true, quantity: 0 },
      { ...baseProduct, id: "product-b", name: "Feijao", isBought: true, quantity: 2 }
    ];
    const history = [
      baseHistory,
      { ...baseHistory, id: "history-b", productId: "product-b", productName: "Feijao" }
    ];

    expect(filterPriceHistoryForPurchasedItems(history, products)).toEqual([history[1]]);
  });
});
