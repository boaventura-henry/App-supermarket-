import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Clock3,
  History,
  Plus,
  Search,
  ShoppingBasket,
  Store,
  TrendingDown
} from "lucide-react";
import { fallbackPriceHistory, fallbackProducts } from "./data/fallbackData";
import type { PriceHistory, Product } from "./types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short"
});

function money(value: number) {
  return currency.format(value);
}

function quantity(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(".", ",");
}

export function App() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>(fallbackPriceHistory);
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState("Todos");
  const [status, setStatus] = useState("Todos");

  useEffect(() => {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((payload: { products: Product[]; priceHistory: PriceHistory[] }) => {
        setProducts(payload.products);
        setPriceHistory(payload.priceHistory);
      })
      .catch(() => {
        setProducts(fallbackProducts);
        setPriceHistory(fallbackPriceHistory);
      });
  }, []);

  const markets = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((product) => product.supermarket)))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery =
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery);
      const matchesMarket = market === "Todos" || product.supermarket === market;
      const matchesStatus =
        status === "Todos" ||
        (status === "Comprados" && product.isBought) ||
        (status === "Pendentes" && !product.isBought);
      return matchesQuery && matchesMarket && matchesStatus;
    });
  }, [market, products, query, status]);

  const total = filteredProducts.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0);
  const boughtTotal = filteredProducts
    .filter((product) => product.isBought)
    .reduce((sum, product) => sum + product.quantity * product.unitPrice, 0);
  const pendingCount = products.filter((product) => !product.isBought).length;
  const marketCount = new Set(products.map((product) => product.supermarket)).size;
  const latestSavings = priceHistory.reduce((sum, item, index, list) => {
    const previous = list.find(
      (history) => history.productName === item.productName && history.timestamp < item.timestamp
    );
    if (!previous) {
      return sum;
    }
    return item.price < previous.price ? sum + (previous.price - item.price) : sum;
  }, 0);

  return (
    <main className="min-h-screen bg-supermarket-paper text-supermarket-ink">
      <header className="border-b border-supermarket-ink/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded bg-supermarket-leaf text-white">
              <ShoppingBasket size={24} />
            </div>
            <div>
              <p className="text-sm text-supermarket-ink/60">Lista de compras web</p>
              <h1 className="text-xl font-black">App Supermarket</h1>
            </div>
          </div>
          <a className="button-secondary hidden sm:inline-flex" href="#lista">
            <Plus size={18} />
            Nova compra
          </a>
        </div>
      </header>

      <section className="bg-[linear-gradient(120deg,#f7f4ec_0%,#ffffff_58%,#d8f3dc_100%)]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:px-8">
          <div className="flex min-h-[300px] flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded bg-supermarket-mint px-3 py-2 text-sm font-bold text-supermarket-leaf">
              <TrendingDown size={18} />
              Historico de precos e controle por mercado
            </div>
            <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
              Sua lista Android agora tambem roda como web app na Netlify.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-supermarket-ink/70">
              Mantem os conceitos do app Kotlin: produtos, marcas, quantidade, preco unitario, mercado, itens comprados,
              dashboard e historico.
            </p>
          </div>

          <div className="grid gap-3 self-end">
            <Metric icon={<BarChart3 size={20} />} label="Total filtrado" value={money(total)} />
            <Metric icon={<CheckCircle2 size={20} />} label="Ja comprado" value={money(boughtTotal)} />
            <Metric icon={<Store size={20} />} label="Mercados" value={marketCount.toString()} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <section id="lista" className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">Lista de compras</h2>
              <p className="text-supermarket-ink/60">
                {filteredProducts.length} itens encontrados, {pendingCount} pendentes no total.
              </p>
            </div>
            <label className="relative block min-w-0 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supermarket-ink/45" size={18} />
              <input
                className="input pl-10"
                placeholder="Buscar produto ou marca"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <select className="input" value={market} onChange={(event) => setMarket(event.target.value)}>
              {markets.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>Todos</option>
              <option>Comprados</option>
              <option>Pendentes</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const subtotal = product.quantity * product.unitPrice;
              return (
                <article className="rounded bg-white p-4 shadow-soft" key={product.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <button
                      className={product.isBought ? "status-bought" : "status-pending"}
                      type="button"
                      aria-label={product.isBought ? "Comprado" : "Pendente"}
                    >
                      {product.isBought ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{product.name}</h3>
                        <span className="rounded bg-supermarket-mint px-2 py-1 text-xs font-bold text-supermarket-leaf">
                          {product.brand}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-supermarket-ink/60">
                        <span>{quantity(product.quantity)} un.</span>
                        <span>x {money(product.unitPrice)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Store size={15} />
                          {product.supermarket}
                        </span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm text-supermarket-ink/50">Subtotal</p>
                      <strong className="text-xl text-supermarket-leaf">{money(subtotal)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="text-supermarket-leaf" size={22} />
              <h2 className="text-xl font-black">Dashboard</h2>
            </div>
            <div className="space-y-3">
              <Summary label="Itens na lista" value={products.length.toString()} />
              <Summary label="Itens pendentes" value={pendingCount.toString()} />
              <Summary label="Economia recente" value={money(latestSavings)} />
              <Summary label="Total comprado" value={money(boughtTotal)} />
            </div>
          </section>

          <section className="rounded bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <History className="text-supermarket-leaf" size={22} />
              <h2 className="text-xl font-black">Historico</h2>
            </div>
            <div className="space-y-3">
              {priceHistory
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5)
                .map((item) => (
                  <div className="rounded border border-supermarket-ink/10 p-3" key={`${item.productName}-${item.timestamp}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{item.productName}</p>
                        <p className="text-sm text-supermarket-ink/60">{item.supermarket}</p>
                      </div>
                      <strong>{money(item.price)}</strong>
                    </div>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-supermarket-ink/50">
                      <Clock3 size={13} />
                      {dateFormatter.format(item.timestamp)}
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded bg-white p-4 shadow-soft">
      <div className="mb-2 flex items-center gap-2 text-supermarket-leaf">{icon}</div>
      <p className="text-sm text-supermarket-ink/60">{label}</p>
      <strong className="text-2xl font-black">{value}</strong>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-supermarket-ink/10 pb-2 last:border-b-0 last:pb-0">
      <span className="text-supermarket-ink/60">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
