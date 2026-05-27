import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Edit3,
  Eye,
  EyeOff,
  History,
  LogOut,
  Plus,
  Save,
  Search,
  ShoppingBasket,
  Store,
  Trash2,
  UserPlus
} from "lucide-react";
import {
  createId,
  getUserData,
  hashText,
  loadDatabase,
  normalizeEmail,
  saveDatabase,
  sortByNewest
} from "./storage";
import type { AppDatabase, PriceHistory, Product, User, View } from "./types";

type AuthMode = "login" | "register" | "recover";

type ProductForm = {
  name: string;
  brand: string;
  quantity: string;
  unitPrice: string;
  supermarket: string;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit"
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const emptyProductForm: ProductForm = {
  name: "",
  brand: "",
  quantity: "1",
  unitPrice: "",
  supermarket: ""
};

function money(value: number) {
  return currency.format(value);
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Number(normalized);
}

function quantity(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(".", ",");
}

export function App() {
  const [database, setDatabase] = useState<AppDatabase>(() => loadDatabase());
  const [view, setView] = useState<View>("list");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    saveDatabase(database);
  }, [database]);

  const currentUser = useMemo(
    () => database.users.find((user) => user.uid === database.activeUserId) ?? null,
    [database.activeUserId, database.users]
  );

  const userData = useMemo(() => {
    if (!currentUser) {
      return { products: [], priceHistory: [] };
    }
    return getUserData(database, currentUser.uid);
  }, [currentUser, database]);

  function updateDatabase(updater: (database: AppDatabase) => AppDatabase) {
    setDatabase((current) => updater(current));
  }

  async function handleLogin(email: string, password: string) {
    setAuthError("");
    setAuthMessage("");
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await hashText(password);
    const user = database.users.find((item) => item.email === normalizedEmail);
    if (!user || user.passwordHash !== passwordHash) {
      setAuthError("E-mail ou senha invalidos.");
      return;
    }
    updateDatabase((current) => ({ ...current, activeUserId: user.uid }));
    setView("list");
  }

  async function handleRegister(name: string, email: string, password: string, securityAnswer: string) {
    setAuthError("");
    setAuthMessage("");
    const normalizedEmail = normalizeEmail(email);
    if (!name.trim() || !normalizedEmail || password.length < 6 || !securityAnswer.trim()) {
      setAuthError("Preencha nome, e-mail, senha com 6+ caracteres e resposta de seguranca.");
      return;
    }
    if (database.users.some((user) => user.email === normalizedEmail)) {
      setAuthError("Ja existe uma conta com esse e-mail.");
      return;
    }

    const user: User = {
      uid: createId("usr"),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await hashText(password),
      securityAnswerHash: await hashText(securityAnswer),
      createdAt: Date.now()
    };

    updateDatabase((current) => ({ ...current, users: [...current.users, user], activeUserId: user.uid }));
    setView("list");
  }

  async function handleRecover(email: string, securityAnswer: string, newPassword: string) {
    setAuthError("");
    setAuthMessage("");
    const normalizedEmail = normalizeEmail(email);
    const answerHash = await hashText(securityAnswer);
    const user = database.users.find((item) => item.email === normalizedEmail);
    if (!user || user.securityAnswerHash !== answerHash) {
      setAuthError("Dados de recuperacao invalidos.");
      return;
    }
    if (newPassword.length < 6) {
      setAuthError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    const passwordHash = await hashText(newPassword);
    updateDatabase((current) => ({
      ...current,
      users: current.users.map((item) => (item.uid === user.uid ? { ...item, passwordHash } : item))
    }));
    setAuthMessage("Senha atualizada. Entre com a nova senha.");
    setAuthMode("login");
  }

  function logout() {
    updateDatabase((current) => ({ ...current, activeUserId: null }));
    setView("list");
    setSelectedProductId(null);
  }

  function saveProduct(form: ProductForm) {
    if (!currentUser) {
      return;
    }

    const name = form.name.trim();
    const brand = form.brand.trim();
    const quantityValue = Number(form.quantity.replace(",", "."));
    const unitPrice = parseMoney(form.unitPrice);
    const supermarket = form.supermarket.trim() || "Nao informado";

    if (!name || !brand || !Number.isFinite(quantityValue) || quantityValue <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("Preencha produto, marca, quantidade e valor unitario corretamente.");
    }

    const timestamp = Date.now();
    const history: PriceHistory = {
      id: createId("hist"),
      userId: currentUser.uid,
      productName: name,
      brand,
      price: unitPrice,
      supermarket,
      timestamp
    };

    updateDatabase((current) => {
      const existing = selectedProductId
        ? current.products.find((product) => product.id === selectedProductId && product.userId === currentUser.uid)
        : null;

      const product: Product = {
        id: existing?.id ?? createId("prd"),
        userId: currentUser.uid,
        name,
        brand,
        quantity: quantityValue,
        unitPrice,
        supermarket,
        timestamp: existing?.timestamp ?? timestamp,
        isBought: existing?.isBought ?? false
      };

      const products = existing
        ? current.products.map((item) => (item.id === existing.id ? product : item))
        : [...current.products, product];

      return {
        ...current,
        products,
        priceHistory: [...current.priceHistory, history]
      };
    });

    setSelectedProductId(null);
    setView("list");
  }

  function deleteProduct(productId: string) {
    if (!currentUser) {
      return;
    }
    updateDatabase((current) => ({
      ...current,
      products: current.products.filter((product) => !(product.id === productId && product.userId === currentUser.uid))
    }));
    setSelectedProductId(null);
    setView("list");
  }

  function toggleBought(productId: string) {
    if (!currentUser) {
      return;
    }
    updateDatabase((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId && product.userId === currentUser.uid
          ? { ...product, isBought: !product.isBought }
          : product
      )
    }));
  }

  if (!currentUser) {
    return (
      <AuthScreen
        mode={authMode}
        error={authError}
        message={authMessage}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setAuthError("");
          setAuthMessage("");
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onRecover={handleRecover}
      />
    );
  }

  const selectedProduct = selectedProductId
    ? userData.products.find((product) => product.id === selectedProductId) ?? null
    : null;

  return (
    <main className="min-h-screen bg-supermarket-paper text-supermarket-ink">
      <header className="sticky top-0 z-20 border-b border-supermarket-ink/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded bg-supermarket-leaf text-white">
              <ShoppingBasket size={24} />
            </div>
            <div>
              <p className="text-sm text-supermarket-ink/60">{currentUser.name}</p>
              <h1 className="text-xl font-black">App Supermarket</h1>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            <NavButton active={view === "list"} onClick={() => setView("list")}>
              Lista
            </NavButton>
            <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")}>
              Dashboard
            </NavButton>
            <NavButton active={view === "history"} onClick={() => setView("history")}>
              Historico
            </NavButton>
            <button className="button-secondary" type="button" onClick={logout}>
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        </div>
      </header>

      {view === "list" ? (
        <ShoppingList
          products={userData.products}
          onAdd={() => {
            setSelectedProductId(null);
            setView("form");
          }}
          onEdit={(productId) => {
            setSelectedProductId(productId);
            setView("form");
          }}
          onToggleBought={toggleBought}
        />
      ) : null}

      {view === "form" ? (
        <ProductEditor
          product={selectedProduct}
          onCancel={() => {
            setSelectedProductId(null);
            setView("list");
          }}
          onDelete={deleteProduct}
          onSave={saveProduct}
        />
      ) : null}

      {view === "dashboard" ? <Dashboard products={userData.products} priceHistory={userData.priceHistory} /> : null}

      {view === "history" ? <HistoryView priceHistory={userData.priceHistory} /> : null}
    </main>
  );
}

function AuthScreen({
  mode,
  error,
  message,
  onModeChange,
  onLogin,
  onRegister,
  onRecover
}: {
  mode: AuthMode;
  error: string;
  message: string;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string, securityAnswer: string) => Promise<void>;
  onRecover: (email: string, securityAnswer: string, newPassword: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "login") {
      await onLogin(email, password);
    }
    if (mode === "register") {
      await onRegister(name, email, password, securityAnswer);
    }
    if (mode === "recover") {
      await onRecover(email, securityAnswer, password);
    }
  }

  return (
    <main className="grid min-h-screen bg-supermarket-paper px-4 py-8 text-supermarket-ink sm:place-items-center">
      <section className="grid w-full max-w-5xl overflow-hidden rounded bg-white shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-supermarket-leaf p-8 text-white">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded bg-white/15">
            <ShoppingBasket size={26} />
          </div>
          <h1 className="text-4xl font-black leading-tight">App Supermarket</h1>
          <div className="mt-8 grid gap-3 text-sm text-white/85">
            <MetricLine value="Multiusuario" />
            <MetricLine value="Checklist por conta" />
            <MetricLine value="Historico e dashboard" />
          </div>
        </div>

        <form className="p-6 sm:p-8" onSubmit={submit}>
          <div className="mb-6">
            <p className="text-sm font-bold uppercase text-supermarket-leaf">
              {mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar senha"}
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {mode === "login" ? "Acesse sua lista" : mode === "register" ? "Nova conta" : "Atualizar acesso"}
            </h2>
          </div>

          <div className="grid gap-4">
            {mode === "register" ? (
              <label className="field">
                <span>Nome</span>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            ) : null}

            <label className="field">
              <span>E-mail</span>
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            <label className="field">
              <span>{mode === "recover" ? "Nova senha" : "Senha"}</span>
              <div className="password-field">
                <input
                  className="input pr-12"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>

            {mode !== "login" ? (
              <label className="field">
                <span>Resposta de seguranca</span>
                <input className="input" value={securityAnswer} onChange={(event) => setSecurityAnswer(event.target.value)} />
              </label>
            ) : null}
          </div>

          {error ? <p className="mt-4 rounded bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
          {message ? <p className="mt-4 rounded bg-supermarket-mint p-3 text-sm font-bold text-supermarket-leaf">{message}</p> : null}

          <button className="button-primary mt-6 w-full justify-center" type="submit">
            {mode === "register" ? <UserPlus size={18} /> : <Save size={18} />}
            {mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Salvar senha"}
          </button>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="link-button" type="button" onClick={() => onModeChange("login")}>
              Login
            </button>
            <button className="link-button" type="button" onClick={() => onModeChange("register")}>
              Criar conta
            </button>
            <button className="link-button" type="button" onClick={() => onModeChange("recover")}>
              Esqueci minha senha
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function ShoppingList({
  products,
  onAdd,
  onEdit,
  onToggleBought
}: {
  products: Product[];
  onAdd: () => void;
  onEdit: (productId: string) => void;
  onToggleBought: (productId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState("Todos");
  const [status, setStatus] = useState("Todos");

  const markets = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((product) => product.supermarket)))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortByNewest(products).filter((product) => {
      const matchesQuery =
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery);
      const matchesMarket = market === "Todos" || product.supermarket === market;
      const matchesStatus =
        status === "Todos" ||
        (status === "Comprados" && product.isBought) ||
        (status === "Nao comprados" && !product.isBought);
      return matchesQuery && matchesMarket && matchesStatus;
    });
  }, [market, products, query, status]);

  const total = filteredProducts.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0);
  const boughtTotal = filteredProducts
    .filter((product) => product.isBought)
    .reduce((sum, product) => sum + product.quantity * product.unitPrice, 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <MetricCard label="Itens" value={filteredProducts.length.toString()} />
        <MetricCard label="Total" value={money(total)} />
        <MetricCard label="Comprado" value={money(boughtTotal)} />
        <button className="button-primary justify-center" type="button" onClick={onAdd}>
          <Plus size={18} />
          Adicionar
        </button>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supermarket-ink/45" size={18} />
          <input className="input pl-10" placeholder="Produto ou marca" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="input" value={market} onChange={(event) => setMarket(event.target.value)}>
          {markets.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>Todos</option>
          <option>Comprados</option>
          <option>Nao comprados</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <EmptyState action="Adicionar produto" onClick={onAdd} />
        ) : (
          filteredProducts.map((product) => (
            <article className={product.isBought ? "product-row product-row-done" : "product-row"} key={product.id}>
              <button
                className={product.isBought ? "status-bought" : "status-pending"}
                type="button"
                aria-label={product.isBought ? "Comprado" : "Nao comprado"}
                onClick={() => onToggleBought(product.id)}
              >
                {product.isBought ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </button>

              <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onEdit(product.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-black">{product.name}</h2>
                  <span className="rounded bg-supermarket-mint px-2 py-1 text-xs font-bold text-supermarket-leaf">
                    {product.brand}
                  </span>
                </div>
                <p className="mt-2 flex flex-wrap gap-3 text-sm text-supermarket-ink/60">
                  <span>{quantity(product.quantity)} un.</span>
                  <span>x {money(product.unitPrice)}</span>
                  <span>{product.supermarket}</span>
                  <span>{dateFormatter.format(product.timestamp)}</span>
                </p>
              </button>

              <div className="text-left sm:text-right">
                <p className="text-sm text-supermarket-ink/50">Subtotal</p>
                <strong className="text-xl text-supermarket-leaf">{money(product.quantity * product.unitPrice)}</strong>
              </div>

              <button className="icon-button" type="button" onClick={() => onEdit(product.id)} aria-label="Editar">
                <Edit3 size={18} />
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ProductEditor({
  product,
  onCancel,
  onDelete,
  onSave
}: {
  product: Product | null;
  onCancel: () => void;
  onDelete: (productId: string) => void;
  onSave: (form: ProductForm) => void;
}) {
  const [form, setForm] = useState<ProductForm>(() =>
    product
      ? {
          name: product.name,
          brand: product.brand,
          quantity: product.quantity.toString().replace(".", ","),
          unitPrice: product.unitPrice.toFixed(2).replace(".", ","),
          supermarket: product.supermarket === "Nao informado" ? "" : product.supermarket
        }
      : emptyProductForm
  );
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar.");
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <form className="rounded bg-white p-5 shadow-soft" onSubmit={submit}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase text-supermarket-leaf">{product ? "Editar" : "Cadastro"}</p>
            <h2 className="text-2xl font-black">Produto</h2>
          </div>
          {product ? (
            <button className="danger-button" type="button" onClick={() => onDelete(product.id)}>
              <Trash2 size={18} />
              Excluir
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Nome do produto</span>
            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="field">
            <span>Marca</span>
            <input className="input" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
          </label>
          <label className="field">
            <span>Quantidade</span>
            <input className="input" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
          </label>
          <label className="field">
            <span>Valor unitario</span>
            <input className="input" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} />
          </label>
          <label className="field sm:col-span-2">
            <span>Supermercado</span>
            <input className="input" value={form.supermarket} onChange={(event) => setForm({ ...form, supermarket: event.target.value })} />
          </label>
        </div>

        {error ? <p className="mt-4 rounded bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="button-primary" type="submit">
            <Save size={18} />
            Salvar
          </button>
          <button className="button-secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

function Dashboard({ products, priceHistory }: { products: Product[]; priceHistory: PriceHistory[] }) {
  const productNames = useMemo(
    () => Array.from(new Set(priceHistory.map((item) => item.productName))).sort(),
    [priceHistory]
  );
  const markets = useMemo(
    () => ["Todos", ...Array.from(new Set(priceHistory.map((item) => item.supermarket))).sort()],
    [priceHistory]
  );
  const [productName, setProductName] = useState(productNames[0] ?? "");
  const [market, setMarket] = useState("Todos");
  const [months, setMonths] = useState("6");

  useEffect(() => {
    if (!productName && productNames[0]) {
      setProductName(productNames[0]);
    }
  }, [productName, productNames]);

  const filteredHistory = useMemo(() => {
    const since = Date.now() - Number(months) * 31 * 24 * 60 * 60 * 1000;
    return priceHistory.filter((item) => {
      const matchesProduct = !productName || item.productName === productName;
      const matchesMarket = market === "Todos" || item.supermarket === market;
      return matchesProduct && matchesMarket && item.timestamp >= since;
    });
  }, [market, months, priceHistory, productName]);

  const monthly = useMemo(() => buildMonthlySeries(filteredHistory), [filteredHistory]);
  const comparison = useMemo(() => buildMarketComparison(filteredHistory), [filteredHistory]);
  const total = products.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0);
  const bought = products.filter((product) => product.isBought).length;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <MetricCard label="Produtos" value={products.length.toString()} />
        <MetricCard label="Comprados" value={bought.toString()} />
        <MetricCard label="Total estimado" value={money(total)} />
        <MetricCard label="Historicos" value={priceHistory.length.toString()} />
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <select className="input" value={productName} onChange={(event) => setProductName(event.target.value)}>
          {productNames.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="input" value={market} onChange={(event) => setMarket(event.target.value)}>
          {markets.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="input" value={months} onChange={(event) => setMonths(event.target.value)}>
          <option value="3">3 meses</option>
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-supermarket-leaf" size={22} />
            <h2 className="text-xl font-black">Variacao mensal</h2>
          </div>
          <LineChart points={monthly} />
        </section>

        <section className="panel">
          <div className="mb-4 flex items-center gap-2">
            <Store className="text-supermarket-leaf" size={22} />
            <h2 className="text-xl font-black">Supermercados</h2>
          </div>
          <BarComparison items={comparison} />
        </section>
      </div>
    </section>
  );
}

function HistoryView({ priceHistory }: { priceHistory: PriceHistory[] }) {
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState("Todos");
  const [month, setMonth] = useState("Todos");
  const [selected, setSelected] = useState<PriceHistory | null>(null);

  const markets = useMemo(() => ["Todos", ...Array.from(new Set(priceHistory.map((item) => item.supermarket))).sort()], [priceHistory]);
  const months = useMemo(() => ["Todos", ...Array.from(new Set(priceHistory.map((item) => monthKey(item.timestamp)))).sort().reverse()], [priceHistory]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortByNewest(priceHistory).filter((item) => {
      const matchesQuery =
        item.productName.toLowerCase().includes(normalizedQuery) ||
        item.brand.toLowerCase().includes(normalizedQuery);
      const matchesMarket = market === "Todos" || item.supermarket === market;
      const matchesMonth = month === "Todos" || monthKey(item.timestamp) === month;
      return matchesQuery && matchesMarket && matchesMonth;
    });
  }, [market, month, priceHistory, query]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supermarket-ink/45" size={18} />
          <input className="input pl-10" placeholder="Produto ou marca" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="input" value={market} onChange={(event) => setMarket(event.target.value)}>
          {markets.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="input" value={month} onChange={(event) => setMonth(event.target.value)}>
          {months.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            filtered.map((item) => (
              <button className="history-row" type="button" key={item.id} onClick={() => setSelected(item)}>
                <span>
                  <strong>{item.productName}</strong>
                  <small>{item.brand} · {item.supermarket}</small>
                </span>
                <span className="text-right">
                  <strong>{money(item.price)}</strong>
                  <small>{dateFormatter.format(item.timestamp)}</small>
                </span>
              </button>
            ))
          )}
        </div>

        <aside className="panel h-fit">
          <div className="mb-4 flex items-center gap-2">
            <History className="text-supermarket-leaf" size={22} />
            <h2 className="text-xl font-black">Detalhes</h2>
          </div>
          {selected ? (
            <div className="space-y-3">
              <Summary label="Produto" value={selected.productName} />
              <Summary label="Marca" value={selected.brand} />
              <Summary label="Supermercado" value={selected.supermarket} />
              <Summary label="Valor" value={money(selected.price)} />
              <Summary label="Data" value={dateFormatter.format(selected.timestamp)} />
            </div>
          ) : (
            <p className="text-supermarket-ink/60">Selecione um registro.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

function LineChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0) {
    return <div className="empty-chart">Sem dados para o filtro.</div>;
  }

  const width = 720;
  const height = 260;
  const padding = 34;
  const max = Math.max(...points.map((point) => point.value));
  const min = Math.min(...points.map((point) => point.value));
  const range = Math.max(max - min, 1);
  const coordinates = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { ...point, x, y };
  });
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafico de linha">
        <path d={path} fill="none" stroke="#1f6f55" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="6" fill="#1f6f55" />
            <text x={point.x} y={height - 8} textAnchor="middle" fontSize="13" fill="#53615d">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        {points.map((point) => (
          <span className="chart-chip" key={point.label}>
            {point.label}: {money(point.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarComparison({ items }: { items: { label: string; value: number }[] }) {
  if (items.length === 0) {
    return <div className="empty-chart">Sem dados para comparar.</div>;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <strong>{item.label}</strong>
            <span>{money(item.value)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-supermarket-mint">
            <div className="h-full rounded bg-supermarket-leaf" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildMonthlySeries(history: PriceHistory[]) {
  const grouped = history.reduce<Record<string, { total: number; count: number; timestamp: number }>>((acc, item) => {
    const key = monthKey(item.timestamp);
    acc[key] = acc[key] ?? { total: 0, count: 0, timestamp: item.timestamp };
    acc[key].total += item.price;
    acc[key].count += 1;
    acc[key].timestamp = Math.min(acc[key].timestamp, item.timestamp);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([key, value]) => ({
      label: monthFormatter.format(value.timestamp),
      sortKey: key,
      value: value.total / value.count
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function buildMarketComparison(history: PriceHistory[]) {
  const grouped = history.reduce<Record<string, { total: number; count: number }>>((acc, item) => {
    acc[item.supermarket] = acc[item.supermarket] ?? { total: 0, count: 0 };
    acc[item.supermarket].total += item.price;
    acc[item.supermarket].count += 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value: value.total / value.count }))
    .sort((a, b) => a.value - b.value);
}

function monthKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function NavButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button className={active ? "nav-button-active" : "nav-button"} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white p-4 shadow-soft">
      <p className="text-sm text-supermarket-ink/60">{label}</p>
      <strong className="text-2xl font-black">{value}</strong>
    </div>
  );
}

function MetricLine({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 size={18} />
      <span>{value}</span>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-supermarket-ink/10 pb-2 last:border-b-0 last:pb-0">
      <span className="text-supermarket-ink/60">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function EmptyState({ action, onClick }: { action?: string; onClick?: () => void }) {
  return (
    <div className="rounded border border-dashed border-supermarket-ink/20 bg-white p-8 text-center">
      <ShoppingBasket className="mx-auto text-supermarket-leaf" size={36} />
      <p className="mt-3 font-bold text-supermarket-ink/70">Nenhum registro encontrado.</p>
      {action && onClick ? (
        <button className="button-primary mt-5" type="button" onClick={onClick}>
          <Plus size={18} />
          {action}
        </button>
      ) : null}
    </div>
  );
}
