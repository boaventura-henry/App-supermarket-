import type { PriceHistory, Product } from "../types";

const now = Date.now();

export const fallbackProducts: Product[] = [
  {
    id: 1,
    name: "Arroz",
    brand: "Tipo 1",
    quantity: 2,
    unitPrice: 24.9,
    supermarket: "Supermarket Jon",
    isBought: false,
    timestamp: now - 1000 * 60 * 60 * 24
  },
  {
    id: 2,
    name: "Feijao",
    brand: "Carioca",
    quantity: 3,
    unitPrice: 8.79,
    supermarket: "Mercado Central",
    isBought: true,
    timestamp: now - 1000 * 60 * 60 * 30
  },
  {
    id: 3,
    name: "Leite integral",
    brand: "Fazenda",
    quantity: 6,
    unitPrice: 4.89,
    supermarket: "Supermarket Jon",
    isBought: false,
    timestamp: now - 1000 * 60 * 60 * 40
  },
  {
    id: 4,
    name: "Cafe",
    brand: "Tradicional",
    quantity: 2,
    unitPrice: 16.5,
    supermarket: "Atacadao Bairro",
    isBought: true,
    timestamp: now - 1000 * 60 * 60 * 55
  },
  {
    id: 5,
    name: "Tomate",
    brand: "Italiano",
    quantity: 1.5,
    unitPrice: 7.49,
    supermarket: "Hortifruti Verde",
    isBought: false,
    timestamp: now - 1000 * 60 * 60 * 62
  }
];

export const fallbackPriceHistory: PriceHistory[] = [
  { productName: "Arroz", supermarket: "Supermarket Jon", price: 26.9, timestamp: now - 1000 * 60 * 60 * 24 * 12 },
  { productName: "Arroz", supermarket: "Supermarket Jon", price: 24.9, timestamp: now - 1000 * 60 * 60 * 24 },
  { productName: "Leite integral", supermarket: "Supermarket Jon", price: 5.29, timestamp: now - 1000 * 60 * 60 * 24 * 9 },
  { productName: "Leite integral", supermarket: "Supermarket Jon", price: 4.89, timestamp: now - 1000 * 60 * 60 * 40 },
  { productName: "Cafe", supermarket: "Atacadao Bairro", price: 18.9, timestamp: now - 1000 * 60 * 60 * 24 * 15 },
  { productName: "Cafe", supermarket: "Atacadao Bairro", price: 16.5, timestamp: now - 1000 * 60 * 60 * 55 }
];
