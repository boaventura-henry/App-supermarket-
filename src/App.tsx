import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  Trash2,
  Truck
} from "lucide-react";
import { fallbackProducts } from "./data/fallbackProducts";
import type { CartItem, Product } from "./types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function formatPrice(value: number) {
  return currency.format(value);
}

export function App() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("delivery");

  useEffect(() => {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((payload: { products: Product[] }) => setProducts(payload.products))
      .catch(() => setProducts(fallbackProducts));
  }, []);

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((product) => product.category)))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "Todos" || product.category === category;
      const matchesQuery = product.name.toLowerCase().includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = delivery === "delivery" && subtotal > 0 && subtotal < 120 ? 9.9 : 0;
  const discount = subtotal >= 150 ? subtotal * 0.08 : 0;
  const total = subtotal + deliveryFee - discount;

  function addToCart(product: Product) {
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item
        );
      }
      return [...items, { ...product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((items) =>
      items
        .map((item) => (item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  return (
    <main className="min-h-screen bg-market-cream text-market-ink">
      <header className="border-b border-market-ink/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded bg-market-leaf text-white">
              <ShoppingBasket size={24} />
            </div>
            <div>
              <p className="text-sm text-market-ink/60">Mercado online</p>
              <h1 className="text-xl font-bold tracking-normal">Supermarket Jon</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded bg-market-lime/30 px-3 py-2 text-sm font-semibold sm:flex">
            <Truck size={18} />
            Entrega gratis acima de R$ 120
          </div>
        </div>
      </header>

      <section className="bg-[linear-gradient(120deg,#f7f3e9_0%,#ffffff_58%,#dcecc1_100%)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
          <div className="flex min-h-[320px] flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded bg-market-tomato/10 px-3 py-2 text-sm font-semibold text-market-tomato">
              <BadgePercent size={18} />
              8% off em compras acima de R$ 150
            </div>
            <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-normal sm:text-5xl">
              Compra rapida, carrinho claro e produtos frescos para hoje.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-market-ink/70">
              Uma vitrine web pronta para Netlify, com API serverless, fallback offline e checkout simulado para validar
              o fluxo de pedidos.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a className="button-primary" href="#catalogo">
                Ver catalogo <ChevronRight size={18} />
              </a>
              <a className="button-secondary" href="#checkout">
                Revisar carrinho
              </a>
            </div>
          </div>

          <aside className="grid content-end gap-3 rounded bg-white p-4 shadow-soft">
            {products.slice(0, 3).map((product) => (
              <div key={product.id} className="flex items-center gap-3 rounded border border-market-ink/10 p-3">
                <img className="h-16 w-16 rounded object-cover" src={product.image} alt={product.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{product.name}</p>
                  <p className="text-sm text-market-ink/60">{product.category}</p>
                </div>
                <strong>{formatPrice(product.price)}</strong>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <section id="catalogo" className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Catalogo</h2>
              <p className="text-market-ink/60">{filteredProducts.length} produtos disponiveis</p>
            </div>
            <label className="relative block min-w-0 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-market-ink/45" size={18} />
              <input
                className="input pl-10"
                placeholder="Buscar produto"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                className={item === category ? "chip-active" : "chip"}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <article className="overflow-hidden rounded bg-white shadow-soft" key={product.id}>
                <div className="relative aspect-[4/3] overflow-hidden bg-market-ink/5">
                  <img className="h-full w-full object-cover" src={product.image} alt={product.name} />
                  {product.badge ? <span className="badge">{product.badge}</span> : null}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold">{product.name}</h3>
                      <p className="text-sm text-market-ink/60">{product.category}</p>
                    </div>
                    <p className="shrink-0 text-right font-black text-market-leaf">{formatPrice(product.price)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-market-ink/60">
                      {product.unit} · {product.stock} em estoque
                    </span>
                    <button className="icon-button" type="button" onClick={() => addToCart(product)} aria-label="Adicionar">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside id="checkout" className="h-fit rounded bg-white p-5 shadow-soft lg:sticky lg:top-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Carrinho</h2>
            <span className="rounded bg-market-lime/30 px-3 py-1 text-sm font-semibold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} itens
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              className={delivery === "delivery" ? "toggle-active" : "toggle"}
              type="button"
              onClick={() => setDelivery("delivery")}
            >
              Entrega
            </button>
            <button
              className={delivery === "pickup" ? "toggle-active" : "toggle"}
              type="button"
              onClick={() => setDelivery("pickup")}
            >
              Retirada
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="rounded border border-dashed border-market-ink/20 p-6 text-center text-market-ink/60">
              Seu carrinho esta vazio.
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div className="rounded border border-market-ink/10 p-3" key={item.id}>
                  <div className="flex gap-3">
                    <img className="h-14 w-14 rounded object-cover" src={item.image} alt={item.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.name}</p>
                      <p className="text-sm text-market-ink/60">{formatPrice(item.price)}</p>
                    </div>
                    <button
                      className="text-market-ink/45 transition hover:text-market-tomato"
                      type="button"
                      onClick={() => updateQuantity(item.id, 0)}
                      aria-label="Remover"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center rounded border border-market-ink/10">
                      <button className="qty-button" type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                      <button className="qty-button" type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus size={16} />
                      </button>
                    </div>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 space-y-2 border-t border-market-ink/10 pt-4 text-sm">
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Entrega</span>
              <strong>{deliveryFee === 0 ? "Gratis" : formatPrice(deliveryFee)}</strong>
            </div>
            <div className="summary-row text-market-leaf">
              <span>Desconto</span>
              <strong>-{formatPrice(discount)}</strong>
            </div>
            <div className="summary-row border-t border-market-ink/10 pt-3 text-lg">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          </div>

          <button className="button-primary mt-5 w-full justify-center" type="button" disabled={cart.length === 0}>
            <Check size={18} />
            Finalizar pedido
          </button>
        </aside>
      </div>
    </main>
  );
}
