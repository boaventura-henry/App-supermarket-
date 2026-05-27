export type Product = {
  id: number;
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  supermarket: string;
  isBought: boolean;
  timestamp: number;
};

export type PriceHistory = {
  productName: string;
  supermarket: string;
  price: number;
  timestamp: number;
};
