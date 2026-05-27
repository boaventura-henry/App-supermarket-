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

const products: Product[] = [
  {
    id: "banana-prata",
    name: "Banana prata",
    category: "Hortifruti",
    price: 5.99,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=900&q=80",
    badge: "Oferta",
    stock: 42
  },
  {
    id: "tomate-italiano",
    name: "Tomate italiano",
    category: "Hortifruti",
    price: 7.49,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
    stock: 30
  },
  {
    id: "arroz-tipo-1",
    name: "Arroz tipo 1",
    category: "Mercearia",
    price: 24.9,
    unit: "5 kg",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
    badge: "Mais vendido",
    stock: 64
  },
  {
    id: "leite-integral",
    name: "Leite integral",
    category: "Laticinios",
    price: 4.79,
    unit: "1 L",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80",
    stock: 80
  },
  {
    id: "pao-frances",
    name: "Pao frances",
    category: "Padaria",
    price: 0.89,
    unit: "un",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
    stock: 120
  },
  {
    id: "cafe-tradicional",
    name: "Cafe tradicional",
    category: "Bebidas",
    price: 16.5,
    unit: "500 g",
    image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80",
    badge: "Novo",
    stock: 25
  }
];

export default async function handler() {
  return new Response(JSON.stringify({ products }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60"
    }
  });
}
