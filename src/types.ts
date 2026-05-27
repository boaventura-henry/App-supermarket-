export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  badge?: string;
  stock: number;
};

export type CartItem = Product & {
  quantity: number;
};
