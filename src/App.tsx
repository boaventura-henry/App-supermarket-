import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Circle,
  Edit3,
  Eye,
  EyeOff,
  Fingerprint,
  History,
  LogOut,
  Lock,
  Mail,
  Menu,
  Moon,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Store,
  Sun,
  Trash2,
  X,
  UserPlus
} from "lucide-react";
import {
  createId,
  getUserData,
  hashText,
  loadDatabase,
  normalizeEmail,
  readLocalDatabaseSnapshot,
  saveDatabase,
  sortByNewest
} from "./storage";
import type { AppDatabase, PriceHistory, Product, ShoppingList, User, View } from "./types";
import {
  createPasskeyForUser,
  describePasskeyError,
  getPasskeyAssertion,
  getPasskeySupport
} from "./webauthn";
import {
  USE_REMOTE_PRODUCTS,
  createProduct as createRemoteProduct,
  deleteProduct as deleteRemoteProduct,
  getProducts as getRemoteProducts,
  togglePurchased as toggleRemotePurchased,
  updateProduct as updateRemoteProduct
} from "./services/productApi";
import {
  USE_REMOTE_PRICE_HISTORY,
  createPriceHistory as createRemotePriceHistory,
  getPriceHistory as getRemotePriceHistory
} from "./services/priceHistoryApi";
import {
  ENABLE_LOCAL_DATA_MIGRATION,
  importLocalData,
  type MigrationResult
} from "./services/migrationApi";

type AuthMode = "login" | "register" | "recover";
type ThemeMode = "light" | "dark";

type ProductForm = {
  name: string;
  brand: string;
  quantity: string;
  unitPrice: string;
  supermarket: string;
};

type ProductEditDraft = Omit<ProductForm, "name">;

type ClearProductFields = {
  brand: boolean;
  quantity: boolean;
  unitPrice: boolean;
  supermarket: boolean;
};

type ListForm = {
  name: string;
  color: string;
};

type ProductSortField = "original" | "name" | "quantity";

type ProductSort = {
  field: ProductSortField;
  direction: "asc" | "desc";
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
  quantity: "",
  unitPrice: "",
  supermarket: ""
};

const emptyClearProductFields: ClearProductFields = {
  brand: false,
  quantity: false,
  unitPrice: false,
  supermarket: false
};

const emptyListForm: ListForm = {
  name: "",
  color: "#6df7a7"
};

function money(value: number) {
  return currency.format(value);
}

function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function productToEditDraft(product: Product): ProductEditDraft {
  return {
    brand: product.brand ?? "",
    quantity: product.quantity !== null ? String(product.quantity).replace(".", ",") : "",
    unitPrice: product.unitPrice !== null ? product.unitPrice.toFixed(2).replace(".", ",") : "",
    supermarket: product.supermarket || ""
  };
}

function loadTheme(): ThemeMode {
  return localStorage.getItem("app-supermarket-theme") === "dark" ? "dark" : "light";
}

export function App() {
  const [database, setDatabase] = useState<AppDatabase>(() => loadDatabase());
  const [view, setView] = useState<View>("home");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [isPasskeyBusy, setIsPasskeyBusy] = useState(false);
  const [pendingPasskeyUserId, setPendingPasskeyUserId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    saveDatabase(database);
  }, [database]);

  useEffect(() => {
    localStorage.setItem("app-supermarket-theme", theme);
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    getPasskeySupport().then((supported) => {
      if (isMounted) {
        setPasskeySupported(supported);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const themeClass = theme === "dark" ? "theme-dark" : "theme-light";
  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  const currentUser = useMemo(
    () => database.users.find((user) => user.uid === database.activeUserId) ?? null,
    [database.activeUserId, database.users]
  );

  const pendingPasskeyUser = useMemo(
    () => database.users.find((user) => user.uid === pendingPasskeyUserId) ?? null,
    [database.users, pendingPasskeyUserId]
  );

  const userData = useMemo(() => {
    if (!currentUser) {
      return { lists: [], products: [], priceHistory: [] };
    }
    return getUserData(database, currentUser.uid);
  }, [currentUser, database]);

  useEffect(() => {
    if (!USE_REMOTE_PRODUCTS || !currentUser || !selectedListId) {
      return;
    }

    let isMounted = true;
    getRemoteProducts(selectedListId, currentUser.uid)
      .then((products) => {
        if (!isMounted) {
          return;
        }
        setDatabase((current) => replaceProductsForList(current, selectedListId, products));
      })
      .catch((error) => {
        console.error("Nao foi possivel carregar produtos remotos.", error);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, selectedListId]);

  useEffect(() => {
    if (!USE_REMOTE_PRICE_HISTORY || !currentUser) {
      return;
    }

    let isMounted = true;
    getRemotePriceHistory(currentUser.uid)
      .then((history) => {
        if (!isMounted) {
          return;
        }
        setDatabase((current) => replacePriceHistoryForUser(current, currentUser.uid, history));
      })
      .catch((error) => {
        console.error("Nao foi possivel carregar historico remoto.", error);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const pendingUserHasPasskey = useMemo(() => {
    const userId = pendingPasskeyUser?.uid;
    return Boolean(userId && database.passkeys.some((passkey) => passkey.userId === userId));
  }, [database.passkeys, pendingPasskeyUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    if (selectedListId && !userData.lists.some((list) => list.id === selectedListId)) {
      setSelectedListId(null);
    }
  }, [currentUser, selectedListId, userData.lists]);

  function updateDatabase(updater: (database: AppDatabase) => AppDatabase) {
    setDatabase((current) => updater(current));
  }

  function replaceProductsForList(current: AppDatabase, listId: string, products: Product[]) {
    return {
      ...current,
      products: [...current.products.filter((product) => product.listId !== listId), ...products]
    };
  }

  function upsertProduct(current: AppDatabase, product: Product) {
    const exists = current.products.some((item) => item.id === product.id);
    return {
      ...current,
      products: exists ? current.products.map((item) => (item.id === product.id ? product : item)) : [...current.products, product]
    };
  }

  function removeProduct(current: AppDatabase, productId: string, userId: string) {
    return {
      ...current,
      products: current.products.filter((product) => !(product.id === productId && product.userId === userId))
    };
  }

  function replacePriceHistoryForUser(current: AppDatabase, userId: string, priceHistory: PriceHistory[]) {
    return {
      ...current,
      priceHistory: [...current.priceHistory.filter((history) => history.userId !== userId), ...priceHistory]
    };
  }

  async function refreshRemotePriceHistory(userId: string) {
    if (!USE_REMOTE_PRICE_HISTORY) {
      return;
    }
    const history = await getRemotePriceHistory(userId);
    setDatabase((current) => replacePriceHistoryForUser(current, userId, history));
  }

  function reportRemoteProductError(error: unknown, fallbackMessage: string) {
    console.error(fallbackMessage, error);
    window.alert(error instanceof Error ? error.message : fallbackMessage);
  }

  function userNeedsPasskeyOffer(user: User) {
    return passkeySupported && !database.passkeys.some((passkey) => passkey.userId === user.uid);
  }

  function finishAuthenticatedLogin(user: User) {
    updateDatabase((current) => ({ ...current, activeUserId: user.uid }));
    setPendingPasskeyUserId(null);
    setPasskeyMessage("");
    setPasskeyError("");
    setAuthMessage("");
    setView("home");
  }

  async function handleLogin(email: string, password: string) {
    setAuthError("");
    setAuthMessage("");
    setPasskeyError("");
    setPasskeyMessage("");
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await hashText(password);
    const user = database.users.find((item) => item.email === normalizedEmail);
    if (!user || user.passwordHash !== passwordHash) {
      setAuthError("E-mail ou senha invalidos.");
      return;
    }
    if (userNeedsPasskeyOffer(user)) {
      setPendingPasskeyUserId(user.uid);
      setAuthMode("login");
      setAuthMessage("Login confirmado. Voce pode ativar biometria agora ou continuar sem ativar.");
      return;
    }
    finishAuthenticatedLogin(user);
  }

  async function handleRegister(name: string, email: string, password: string, securityAnswer: string) {
    setAuthError("");
    setAuthMessage("");
    setPasskeyError("");
    setPasskeyMessage("");
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

    updateDatabase((current) => ({ ...current, users: [...current.users, user] }));
    if (userNeedsPasskeyOffer(user)) {
      setPendingPasskeyUserId(user.uid);
      setAuthMode("login");
      setAuthMessage("Conta criada. Voce pode ativar biometria agora ou continuar sem ativar.");
      return;
    }
    finishAuthenticatedLogin(user);
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

  async function handlePasskeyLogin() {
    setAuthError("");
    setAuthMessage("");
    setIsPasskeyBusy(true);
    try {
      const passkey = await getPasskeyAssertion(database.passkeys);
      if (!passkey) {
        setAuthError("Biometria nao encontrada. Entre com e-mail e senha para cadastrar novamente.");
        return;
      }
      const user = database.users.find((item) => item.uid === passkey.userId);
      if (!user) {
        setAuthError("Conta vinculada a biometria nao foi encontrada.");
        return;
      }
      updateDatabase((current) => ({
        ...current,
        activeUserId: user.uid,
        passkeys: current.passkeys.map((item) =>
          item.id === passkey.id ? { ...item, lastUsedAt: Date.now() } : item
        )
      }));
      setView("home");
    } catch (err) {
      setAuthError(describePasskeyError(err));
    } finally {
      setIsPasskeyBusy(false);
    }
  }

  async function handleRegisterPasskey(user: User) {
    setPasskeyError("");
    setPasskeyMessage("");
    setIsPasskeyBusy(true);
    try {
      const passkey = await createPasskeyForUser(user);
      updateDatabase((current) => ({
        ...current,
        passkeys: [...current.passkeys.filter((item) => item.userId !== user.uid), passkey]
      }));
      setPasskeyMessage("Biometria ativada neste dispositivo. Use a biometria ou PIN do seu dispositivo nos proximos acessos.");
    } catch (err) {
      setPasskeyError(describePasskeyError(err));
    } finally {
      setIsPasskeyBusy(false);
    }
  }

  function logout() {
    updateDatabase((current) => ({ ...current, activeUserId: null }));
    setView("home");
    setPendingPasskeyUserId(null);
    setSelectedListId(null);
    setEditingListId(null);
    setPasskeyMessage("");
    setPasskeyError("");
    setIsMenuOpen(false);
  }

  function navigateTo(nextView: View) {
    setView(nextView);
    if (nextView === "list") {
      setSelectedListId(null);
    }
    setIsMenuOpen(false);
  }

  function saveShoppingList(form: ListForm) {
    if (!currentUser) {
      return;
    }

    const name = form.name.trim();
    if (!name) {
      throw new Error("Informe o nome da lista.");
    }

    const now = Date.now();
    const targetListId = editingListId && editingListId !== "new" ? editingListId : createId("list");
    updateDatabase((current) => {
      const existing = editingListId
        ? current.lists.find((list) => list.id === editingListId && list.userId === currentUser.uid)
        : null;
      if (editingListId && editingListId !== "new" && !existing) {
        throw new Error("Somente o criador da lista pode alterar.");
      }
      const list: ShoppingList = {
        id: existing?.id ?? targetListId,
        userId: currentUser.uid,
        name,
        color: form.color,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      return {
        ...current,
        lists: existing ? current.lists.map((item) => (item.id === existing.id ? list : item)) : [...current.lists, list]
      };
    });

    setSelectedListId(targetListId);
    setEditingListId(null);
  }

  function deleteShoppingList(listId: string) {
    if (!currentUser) {
      return;
    }
    updateDatabase((current) => ({
      ...current,
      lists: current.lists.filter((list) => !(list.id === listId && list.userId === currentUser.uid)),
      products: current.products.filter((product) => !(product.listId === listId && product.userId === currentUser.uid)),
      priceHistory: current.priceHistory.filter((history) => !(history.listId === listId && history.userId === currentUser.uid))
    }));
    setSelectedListId((current) => (current === listId ? null : current));
    setEditingListId(null);
  }

  function saveProduct(listId: string, form: ProductForm) {
    if (!currentUser) {
      return;
    }
    if (!database.lists.some((list) => list.id === listId && list.userId === currentUser.uid)) {
      throw new Error("Somente o criador da lista pode alterar.");
    }
    const name = form.name.trim();
    if (!name) {
      throw new Error("Informe a descricao do produto.");
    }
    const quantity = parseOptionalNumber(form.quantity);
    if (quantity === undefined) {
      throw new Error("Informe uma quantidade valida ou deixe em branco.");
    }
    const unitPrice = parseMoney(form.unitPrice);
    if (unitPrice === undefined) {
      throw new Error("Informe um valor unitario valido ou deixe em branco.");
    }
    const brand = form.brand.trim();
    const supermarket = form.supermarket.trim();
    const timestamp = Date.now();

    if (USE_REMOTE_PRODUCTS) {
      void createRemoteProduct(listId, {
        userId: currentUser.uid,
        name,
        brand,
        quantity,
        unitPrice,
        supermarket
      })
        .then((product) => {
          updateDatabase((current) => ({
            ...upsertProduct(current, product),
            priceHistory:
              !USE_REMOTE_PRICE_HISTORY && unitPrice !== null && unitPrice > 0
                ? [
                    ...current.priceHistory,
                    {
                      id: createId("hist"),
                      userId: currentUser.uid,
                      listId,
                      productName: name,
                      brand,
                      price: unitPrice,
                      supermarket,
                      timestamp
                    }
                  ]
                : current.priceHistory,
            lists: current.lists.map((list) => (list.id === listId ? { ...list, updatedAt: timestamp } : list))
          }));
          void refreshRemotePriceHistory(currentUser.uid).catch((error) =>
            reportRemoteProductError(error, "Nao foi possivel atualizar o historico remoto.")
          );
        })
        .catch((error) => reportRemoteProductError(error, "Nao foi possivel salvar o produto."));
      return;
    }

    if (USE_REMOTE_PRICE_HISTORY && unitPrice !== null && unitPrice > 0) {
      void createRemotePriceHistory({
        userId: currentUser.uid,
        listId,
        productName: name,
        brand,
        quantity,
        price: unitPrice,
        supermarket,
        createdAt: new Date(timestamp).toISOString()
      })
        .then(() => refreshRemotePriceHistory(currentUser.uid))
        .catch((error) => reportRemoteProductError(error, "Nao foi possivel salvar o historico remoto."));
    }

    updateDatabase((current) => {
      const nextSortOrder =
        current.products
          .filter((product) => product.userId === currentUser.uid && product.listId === listId)
          .reduce((max, product) => Math.max(max, Number.isFinite(product.sortOrder) ? product.sortOrder : -1), -1) + 1;
      const product: Product = {
        id: createId("prd"),
        userId: currentUser.uid,
        listId,
        name,
        brand,
        quantity,
        unitPrice,
        supermarket,
        timestamp,
        isBought: false,
        sortOrder: nextSortOrder
      };
      const history: PriceHistory[] =
        !USE_REMOTE_PRICE_HISTORY && unitPrice !== null && unitPrice > 0
          ? [
              ...current.priceHistory,
              {
                id: createId("hist"),
                userId: currentUser.uid,
                listId,
                productName: name,
                brand,
                price: unitPrice,
                supermarket,
                timestamp
              }
            ]
          : current.priceHistory;
      return {
        ...current,
        products: [...current.products, product],
        priceHistory: history,
        lists: current.lists.map((list) => (list.id === listId ? { ...list, updatedAt: timestamp } : list))
      };
    });
  }

  function deleteProduct(productId: string) {
    if (!currentUser) {
      return;
    }
    if (USE_REMOTE_PRODUCTS) {
      void deleteRemoteProduct(productId, currentUser.uid)
        .then(() => {
          updateDatabase((current) => removeProduct(current, productId, currentUser.uid));
        })
        .catch((error) => reportRemoteProductError(error, "Nao foi possivel excluir o produto."));
      return;
    }
    updateDatabase((current) => ({
      ...current,
      products: current.products.filter((product) => !(product.id === productId && product.userId === currentUser.uid))
    }));
  }

  function toggleBought(productId: string) {
    if (!currentUser) {
      return;
    }
    if (USE_REMOTE_PRODUCTS) {
      const target = database.products.find((product) => product.id === productId && product.userId === currentUser.uid);
      if (!target) {
        return;
      }
      void toggleRemotePurchased(productId, currentUser.uid, !target.isBought)
        .then((product) => {
          updateDatabase((current) => upsertProduct(current, product));
        })
        .catch((error) => reportRemoteProductError(error, "Nao foi possivel atualizar o status do produto."));
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

  function saveProductInline(productId: string, draft: ProductEditDraft) {
    if (!currentUser) {
      return;
    }

    const parsedQuantity = parseOptionalNumber(draft.quantity);
    const parsedPrice = parseMoney(draft.unitPrice);
    if (parsedQuantity === undefined || parsedPrice === undefined) {
      return;
    }

    const nextBrand = draft.brand.trim();
    const nextQuantity = draft.quantity.trim() === "" || parsedQuantity === null ? null : parsedQuantity;
    const nextUnitPrice = draft.unitPrice.trim() === "" || parsedPrice === null ? null : parsedPrice;
    const nextSupermarket = draft.supermarket.trim();
    const timestamp = Date.now();

    if (USE_REMOTE_PRODUCTS) {
      const target = database.products.find((product) => product.id === productId && product.userId === currentUser.uid);
      if (!target) {
        return;
      }
      void updateRemoteProduct(productId, {
        userId: currentUser.uid,
        brand: nextBrand,
        quantity: nextQuantity,
        unitPrice: nextUnitPrice,
        supermarket: nextSupermarket
      })
        .then((updated) => {
          const historyPrice =
            typeof nextUnitPrice === "number" && nextUnitPrice > 0 && nextUnitPrice !== target.unitPrice ? nextUnitPrice : null;
          updateDatabase((current) => ({
            ...upsertProduct(current, updated),
            priceHistory:
              !USE_REMOTE_PRICE_HISTORY && historyPrice !== null
                ? [
                    ...current.priceHistory,
                    {
                      id: createId("hist"),
                      userId: currentUser.uid,
                      listId: target.listId,
                      productName: target.name,
                      brand: nextBrand,
                      price: historyPrice,
                      supermarket: nextSupermarket,
                      timestamp
                    }
                  ]
                : current.priceHistory,
            lists: current.lists.map((list) => (list.id === target.listId ? { ...list, updatedAt: timestamp } : list))
          }));
          void refreshRemotePriceHistory(currentUser.uid).catch((error) =>
            reportRemoteProductError(error, "Nao foi possivel atualizar o historico remoto.")
          );
        })
        .catch((error) => reportRemoteProductError(error, "Nao foi possivel atualizar o produto."));
      return;
    }

    const targetForRemoteHistory = database.products.find((product) => product.id === productId && product.userId === currentUser.uid);
    if (
      USE_REMOTE_PRICE_HISTORY &&
      targetForRemoteHistory &&
      typeof nextUnitPrice === "number" &&
      nextUnitPrice > 0 &&
      nextUnitPrice !== targetForRemoteHistory.unitPrice
    ) {
      void createRemotePriceHistory({
        userId: currentUser.uid,
        listId: targetForRemoteHistory.listId,
        productId,
        productName: targetForRemoteHistory.name,
        brand: nextBrand,
        quantity: nextQuantity,
        price: nextUnitPrice,
        supermarket: nextSupermarket,
        createdAt: new Date(timestamp).toISOString()
      })
        .then(() => refreshRemotePriceHistory(currentUser.uid))
        .catch((error) => reportRemoteProductError(error, "Nao foi possivel salvar o historico remoto."));
    }

    updateDatabase((current) => {
      const target = current.products.find((product) => product.id === productId && product.userId === currentUser.uid);
      if (!target) {
        return current;
      }

      const updated: Product = {
        ...target,
        brand: nextBrand,
        quantity: nextQuantity,
        unitPrice: nextUnitPrice,
        supermarket: nextSupermarket
      };
      const historyPrice =
        typeof nextUnitPrice === "number" && nextUnitPrice > 0 && nextUnitPrice !== target.unitPrice ? nextUnitPrice : null;
      const history =
        !USE_REMOTE_PRICE_HISTORY && historyPrice !== null
          ? [
              ...current.priceHistory,
              {
                id: createId("hist"),
                userId: currentUser.uid,
                listId: target.listId,
                productName: target.name,
                brand: nextBrand,
                price: historyPrice,
                supermarket: nextSupermarket,
                timestamp
              }
            ]
          : current.priceHistory;

      return {
        ...current,
        products: current.products.map((product) => (product.id === productId ? updated : product)),
        priceHistory: history,
        lists: current.lists.map((list) => (list.id === target.listId ? { ...list, updatedAt: timestamp } : list))
      };
    });
  }

  function clearProductFields(listId: string, fields: ClearProductFields) {
    if (!currentUser) {
      return;
    }

    const shouldClear = Object.values(fields).some(Boolean);
    if (!shouldClear) {
      throw new Error("Selecione pelo menos um campo para limpar.");
    }

    const timestamp = Date.now();
    if (USE_REMOTE_PRODUCTS) {
      const targets = database.products.filter((product) => product.userId === currentUser.uid && product.listId === listId);
      void Promise.all(
        targets.map((product) =>
          updateRemoteProduct(product.id, {
            userId: currentUser.uid,
            brand: fields.brand ? "" : product.brand,
            quantity: fields.quantity ? null : product.quantity,
            unitPrice: fields.unitPrice ? null : product.unitPrice,
            supermarket: fields.supermarket ? "" : product.supermarket
          })
        )
      )
        .then((products) => {
          updateDatabase((current) => ({
            ...products.reduce((next, product) => upsertProduct(next, product), current),
            lists: current.lists.map((list) => (list.id === listId ? { ...list, updatedAt: timestamp } : list))
          }));
        })
        .catch((error) => reportRemoteProductError(error, "Nao foi possivel limpar os campos da lista."));
      return;
    }
    updateDatabase((current) => ({
      ...current,
      products: current.products.map((product) => {
        if (product.userId !== currentUser.uid || product.listId !== listId) {
          return product;
        }
        return {
          ...product,
          brand: fields.brand ? "" : product.brand,
          quantity: fields.quantity ? null : product.quantity,
          unitPrice: fields.unitPrice ? null : product.unitPrice,
          supermarket: fields.supermarket ? "" : product.supermarket
        };
      }),
      lists: current.lists.map((list) => (list.id === listId ? { ...list, updatedAt: timestamp } : list))
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
        onPasskeyLogin={handlePasskeyLogin}
        onRegisterPasskey={handleRegisterPasskey}
        onContinueAfterPasskey={() => {
          if (pendingPasskeyUser) {
            finishAuthenticatedLogin(pendingPasskeyUser);
          }
        }}
        passkeySupported={passkeySupported}
        hasPasskeys={database.passkeys.length > 0}
        pendingPasskeyUser={pendingPasskeyUser}
        pendingUserHasPasskey={pendingUserHasPasskey}
        passkeyMessage={passkeyMessage}
        passkeyError={passkeyError}
        isPasskeyBusy={isPasskeyBusy}
      />
    );
  }

  return (
    <main className={`${themeClass} min-h-screen bg-supermarket-paper text-supermarket-ink`}>
      <header className="sticky top-0 z-20 border-b border-supermarket-ink/10 bg-white/95 backdrop-blur">
        <div className="app-header-inner">
          <div className="flex min-w-0 items-center gap-3">
            <div className="app-header-logo">
              <ShoppingBasket size={21} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-supermarket-ink/60">{currentUser.name}</p>
              <h1 className="truncate text-lg font-black sm:text-xl">App Supermarket</h1>
            </div>
          </div>
          <button
            className="menu-trigger"
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={isMenuOpen}
            aria-controls="app-side-menu"
          >
            <Menu size={21} />
            <span>Menu</span>
          </button>
        </div>
      </header>

      <SideMenu
        currentView={view}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={navigateTo}
        onLogout={logout}
        onToggleTheme={toggleTheme}
        theme={theme}
        userName={currentUser.name}
        enableMigration={ENABLE_LOCAL_DATA_MIGRATION}
      />

      {view === "home" ? <Home products={userData.products} /> : null}

      {view === "list" ? (
        <ShoppingList
          lists={userData.lists}
          products={userData.products}
          users={database.users}
          currentUserId={currentUser.uid}
          selectedListId={selectedListId}
          editingListId={editingListId}
          onSelectList={setSelectedListId}
          onBackToLists={() => setSelectedListId(null)}
          onStartList={() => setEditingListId("new")}
          onEditList={setEditingListId}
          onCancelList={() => setEditingListId(null)}
          onSaveList={saveShoppingList}
          onDeleteList={deleteShoppingList}
          onSaveProduct={saveProduct}
          onToggleBought={toggleBought}
          onInlineChange={saveProductInline}
          onClearFields={clearProductFields}
          onDeleteProduct={deleteProduct}
        />
      ) : null}

      {view === "shared" ? (
        <SharedLists
          users={database.users}
          lists={database.lists}
          products={database.products}
          currentUserId={currentUser.uid}
          editingListId={editingListId}
          onEditList={setEditingListId}
          onCancelList={() => setEditingListId(null)}
          onSaveList={saveShoppingList}
          onDeleteList={deleteShoppingList}
          onSaveProduct={saveProduct}
          onToggleBought={toggleBought}
          onInlineChange={saveProductInline}
          onClearFields={clearProductFields}
          onDeleteProduct={deleteProduct}
        />
      ) : null}

      {view === "dashboard" ? <Dashboard products={userData.products} priceHistory={userData.priceHistory} /> : null}

      {view === "history" ? <HistoryView priceHistory={userData.priceHistory} /> : null}

      {view === "migration" && ENABLE_LOCAL_DATA_MIGRATION ? <MigrationView currentUser={currentUser} /> : null}
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
  onRecover,
  onPasskeyLogin,
  onRegisterPasskey,
  onContinueAfterPasskey,
  passkeySupported,
  hasPasskeys,
  pendingPasskeyUser,
  pendingUserHasPasskey,
  passkeyMessage,
  passkeyError,
  isPasskeyBusy
}: {
  mode: AuthMode;
  error: string;
  message: string;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string, securityAnswer: string) => Promise<void>;
  onRecover: (email: string, securityAnswer: string, newPassword: string) => Promise<void>;
  onPasskeyLogin: () => Promise<void>;
  onRegisterPasskey: (user: User) => Promise<void>;
  onContinueAfterPasskey: () => void;
  passkeySupported: boolean;
  hasPasskeys: boolean;
  pendingPasskeyUser: User | null;
  pendingUserHasPasskey: boolean;
  passkeyMessage: string;
  passkeyError: string;
  isPasskeyBusy: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await onLogin(email, password);
      }
      if (mode === "register") {
        await onRegister(name, email, password, securityAnswer);
      }
      if (mode === "recover") {
        await onRecover(email, securityAnswer, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const heading =
    mode === "login" ? "Entrar no aplicativo" : mode === "register" ? "Criar sua conta" : "Recuperar senha";
  const buttonLabel = mode === "login" ? "Acessar o App" : mode === "register" ? "Criar conta" : "Salvar nova senha";
  const showPasskeyActivation = mode === "login" && Boolean(pendingPasskeyUser);

  function registerPendingPasskey() {
    if (pendingPasskeyUser) {
      void onRegisterPasskey(pendingPasskeyUser);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="auth-logo" aria-hidden="true">
            <ShoppingCart size={34} />
          </div>
          <h1 id="auth-title">SuperList</h1>
          <p>Suas compras sob controle</p>
        </div>

        {showPasskeyActivation && pendingPasskeyUser ? (
          <section className="auth-form auth-passkey-enrollment" aria-live="polite">
            <div className="auth-passkey-enrollment-icon" aria-hidden="true">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2>Ativar biometria?</h2>
              <p>
                Use a biometria ou PIN do seu dispositivo para entrar mais rapido. O SuperList nao le nem armazena sua
                biometria; salvamos apenas os metadados publicos da passkey.
              </p>
            </div>
            {message ? <p className="auth-alert auth-alert-success">{message}</p> : null}
            {passkeyMessage ? <p className="auth-alert auth-alert-success">{passkeyMessage}</p> : null}
            {passkeyError ? <p className="auth-alert auth-alert-error">{passkeyError}</p> : null}
            {passkeySupported && !pendingUserHasPasskey ? (
              <button
                className="auth-passkey-button"
                type="button"
                onClick={registerPendingPasskey}
                disabled={isPasskeyBusy}
              >
                <Fingerprint size={21} />
                {isPasskeyBusy ? "Aguardando biometria..." : "Ativar biometria do dispositivo"}
              </button>
            ) : null}
            {!passkeySupported ? (
              <p className="auth-passkey-hint">
                Este navegador ou dispositivo nao informou suporte a WebAuthn/Passkeys. Voce pode continuar usando e-mail
                e senha.
              </p>
            ) : null}
            <button className="auth-submit" type="button" onClick={onContinueAfterPasskey}>
              {pendingUserHasPasskey ? "Continuar para o app" : "Continuar sem biometria"}
            </button>
          </section>
        ) : (
        <form className="auth-form" onSubmit={submit}>
          <h2>{heading}</h2>

          <div className="grid gap-4">
            {mode === "register" ? (
              <label className="auth-field">
                <span>Nome</span>
                <input
                  className="auth-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome"
                  autoComplete="name"
                  required
                />
              </label>
            ) : null}

            <label className="auth-field">
              <span>E-mail</span>
              <div className="auth-input-shell">
                <Mail size={21} aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="E-mail"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>{mode === "recover" ? "Nova senha" : "Senha"}</span>
              <div className="auth-input-shell">
                <Lock size={21} aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "recover" ? "Nova senha" : "Senha"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                <button
                  className="auth-password-toggle"
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
              <label className="auth-field">
                <span>Resposta de seguranca</span>
                <input
                  className="auth-input"
                  value={securityAnswer}
                  onChange={(event) => setSecurityAnswer(event.target.value)}
                  placeholder="Resposta de seguranca"
                  autoComplete="off"
                  required
                />
              </label>
            ) : null}
          </div>

          {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}
          {message ? <p className="auth-alert auth-alert-success">{message}</p> : null}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {mode === "register" ? <UserPlus size={19} /> : <Save size={19} />}
            {isSubmitting ? "Aguarde..." : buttonLabel}
          </button>

          {mode === "login" && passkeySupported ? (
            <div className="auth-passkey">
              <div className="auth-separator">
                <span />
                <strong>ou</strong>
                <span />
              </div>
              {hasPasskeys ? (
                <button className="auth-passkey-button" type="button" onClick={onPasskeyLogin} disabled={isPasskeyBusy}>
                  <Fingerprint size={21} />
                  {isPasskeyBusy ? "Lendo biometria..." : "Entrar com Face ID / Digital"}
                </button>
              ) : (
                <p className="auth-passkey-hint">
                  Entre com e-mail e senha uma vez para ativar biometria neste dispositivo.
                </p>
              )}
            </div>
          ) : null}

          <div className="auth-links">
            <button className="link-button" type="button" onClick={() => onModeChange("register")}>
              Criar conta
            </button>
            <button className="link-button" type="button" onClick={() => onModeChange("recover")}>
              Esqueci minha senha
            </button>
          </div>
          {mode !== "login" ? (
            <button className="auth-back-link" type="button" onClick={() => onModeChange("login")}>
              Voltar para login
            </button>
          ) : null}
        </form>
        )}
      </section>
    </main>
  );
}

function Home({ products }: { products: Product[] }) {
  const boughtByMarket = useMemo(() => {
    const grouped = products
      .filter((product) => product.isBought)
      .reduce<Record<string, number>>((acc, product) => {
        const market = (product.supermarket ?? "").trim() || "Sem supermercado";
        acc[market] = (acc[market] ?? 0) + 1;
        return acc;
      }, {});

    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"));
  }, [products]);

  const totalBought = boughtByMarket.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...boughtByMarket.map((item) => item.value), 1);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-black uppercase text-supermarket-leaf">Home</p>
        <h2 className="text-2xl font-black">Resumo das compras</h2>
        <p className="text-supermarket-ink/60">Itens marcados como comprados, agrupados por supermercado.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.35fr_0.65fr]">
        <MetricCard label="Itens comprados" value={totalBought.toString()} />
        <section className="panel">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-supermarket-leaf" size={22} />
            <h3 className="text-xl font-black">Comprados por supermercado</h3>
          </div>
          {boughtByMarket.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="home-bar-list">
              {boughtByMarket.map((item) => (
                <div className="home-bar-row" key={item.label}>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <strong className="truncate">{item.label}</strong>
                    <span>{item.value}</span>
                  </div>
                  <div className="home-bar-track">
                    <div className="home-bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ShoppingList({
  lists,
  products,
  users,
  currentUserId,
  selectedListId,
  editingListId,
  title = "Listas cadastradas",
  description = "Escolha uma lista para abrir os itens ou crie uma nova.",
  allowCreateList = true,
  onSelectList,
  onBackToLists,
  onStartList,
  onEditList,
  onCancelList,
  onSaveList,
  onDeleteList,
  onSaveProduct,
  onToggleBought,
  onInlineChange,
  onClearFields,
  onDeleteProduct
}: {
  lists: ShoppingList[];
  products: Product[];
  users: User[];
  currentUserId: string;
  selectedListId: string | null;
  editingListId: string | null;
  title?: string;
  description?: string;
  allowCreateList?: boolean;
  onSelectList: (listId: string) => void;
  onBackToLists: () => void;
  onStartList: () => void;
  onEditList: (listId: string) => void;
  onCancelList: () => void;
  onSaveList: (form: ListForm) => void;
  onDeleteList: (listId: string) => void;
  onSaveProduct: (listId: string, form: ProductForm) => void;
  onToggleBought: (productId: string) => void;
  onInlineChange: (productId: string, draft: ProductEditDraft) => void;
  onClearFields: (listId: string, fields: ClearProductFields) => void;
  onDeleteProduct: (productId: string) => void;
}) {
  const [sort, setSort] = useState<ProductSort>({ field: "original", direction: "asc" });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const selectedList = selectedListId ? lists.find((list) => list.id === selectedListId) ?? null : null;
  const isListOwner = selectedList ? selectedList.userId === currentUserId : true;
  const readonlyReason = "Somente o criador da lista pode alterar.";
  const creatorLabel = (userId: string) => {
    const user = users.find((item) => item.uid === userId);
    return user ? `${user.name} - ${user.email}` : "Usuario local";
  };
  const getListSummary = (listId: string) => {
    const listItems = products.filter((product) => product.listId === listId);
    const bought = listItems.filter((product) => product.isBought).length;
    const total = listItems.reduce((sum, product) => sum + (product.quantity ?? 0) * (product.unitPrice ?? 0), 0);
    return { count: listItems.length, bought, total };
  };
  const listProducts = useMemo(() => {
    if (!selectedList) {
      return [];
    }
    const scopedProducts = products.filter((product) => product.listId === selectedList.id);
    return scopedProducts.slice().sort((a, b) => {
      const boughtOrder = Number(a.isBought) - Number(b.isBought);
      if (boughtOrder !== 0) {
        return boughtOrder;
      }

      const originalOrder =
        (Number.isFinite(a.sortOrder) ? a.sortOrder : a.timestamp) -
          (Number.isFinite(b.sortOrder) ? b.sortOrder : b.timestamp) || a.timestamp - b.timestamp || a.id.localeCompare(b.id);
      if (sort.field === "original") {
        return originalOrder;
      }

      const result =
        sort.field === "quantity"
          ? (a.quantity ?? Number.MAX_SAFE_INTEGER) - (b.quantity ?? Number.MAX_SAFE_INTEGER)
          : a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      if (result === 0) {
        return originalOrder;
      }
      return sort.direction === "asc" ? result : -result;
    });
  }, [products, selectedList, sort]);

  function toggleSort(field: ProductSortField) {
    setSort((current) =>
      current.field === field
        ? { field, direction: current.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" }
    );
  }

  const total = listProducts.reduce((sum, product) => sum + (product.quantity ?? 0) * (product.unitPrice ?? 0), 0);
  const boughtProducts = listProducts.filter((product) => product.isBought);
  const boughtCount = boughtProducts.length;
  const boughtTotal = boughtProducts.reduce((sum, product) => sum + (product.quantity ?? 0) * (product.unitPrice ?? 0), 0);
  const completionRate = listProducts.length > 0 ? Math.round((boughtCount / listProducts.length) * 100) : 0;

  function saveProductFromModal(form: ProductForm) {
    if (!selectedList || !isListOwner) {
      return;
    }
    onSaveProduct(selectedList.id, form);
    setIsProductModalOpen(false);
  }

  function requestProductEdit(productId: string) {
    if (!isListOwner) {
      return;
    }
    if (editingProductId && editingProductId !== productId) {
      const shouldDiscard = window.confirm("Descartar as alteracoes da linha atual e editar outro produto?");
      if (!shouldDiscard) {
        return;
      }
    }
    setSavedProductId(null);
    setEditingProductId(productId);
  }

  function confirmProductEdit(productId: string, draft: ProductEditDraft) {
    if (!isListOwner) {
      return;
    }
    onInlineChange(productId, draft);
    setEditingProductId(null);
    setSavedProductId(productId);
    window.setTimeout(() => {
      setSavedProductId((current) => (current === productId ? null : current));
    }, 1600);
  }

  if (!selectedList) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="text-supermarket-ink/60">{description}</p>
          </div>
          {allowCreateList ? (
            <button className="button-primary justify-center" type="button" onClick={onStartList}>
              <Plus size={18} />
              Nova lista
            </button>
          ) : null}
        </div>

        {editingListId && (editingListId === "new" || lists.some((list) => list.id === editingListId && list.userId === currentUserId)) ? (
          <ListEditor
            list={editingListId === "new" ? null : lists.find((list) => list.id === editingListId) ?? null}
            onCancel={onCancelList}
            onSave={onSaveList}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {lists.length === 0 ? (
            <EmptyState action={allowCreateList ? "Criar primeira lista" : undefined} onClick={allowCreateList ? onStartList : undefined} />
          ) : (
            lists.map((list) => {
              const summary = getListSummary(list.id);
              const canEditList = list.userId === currentUserId;
              return (
                <article className="shopping-list-card" key={list.id}>
                  <button className="shopping-list-card-main" type="button" onClick={() => onSelectList(list.id)}>
                    <span className="list-color-dot" style={{ backgroundColor: list.color }} />
                    <span className="min-w-0">
                      <strong>{list.name}</strong>
                      <small>
                        {creatorLabel(list.userId)}
                      </small>
                      <small>
                        {summary.count} {summary.count === 1 ? "item" : "itens"} - {summary.bought} comprados - {money(summary.total)}
                      </small>
                    </span>
                  </button>
                  {canEditList ? (
                    <div className="list-card-actions">
                      <button className="icon-button" type="button" onClick={() => onEditList(list.id)} aria-label="Editar lista">
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="icon-button danger-icon-button"
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Excluir a lista "${list.name}"?`)) {
                            onDeleteList(list.id);
                          }
                        }}
                        aria-label="Excluir lista"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="list-detail-section mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="list-color-dot" style={{ backgroundColor: selectedList.color }} />
          <div>
            <p className="text-sm font-black uppercase text-supermarket-leaf">Lista</p>
            <h2 className="text-2xl font-black">{selectedList.name}</h2>
            <p className="text-sm text-supermarket-ink/60">
              {creatorLabel(selectedList.userId)} - {listProducts.length} itens - {boughtCount} comprados - {money(total)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="list-back-button" type="button" onClick={onBackToLists}>
            Voltar
          </button>
          {isListOwner ? (
            <>
              <button className="button-secondary" type="button" onClick={() => setIsClearModalOpen(true)}>
                <RefreshCcw size={16} />
                Limpar campos
              </button>
              <button className="button-primary" type="button" onClick={() => setIsProductModalOpen(true)}>
                <Plus size={16} />
                Produto
              </button>
            </>
          ) : null}
        </div>
      </div>

      {!isListOwner ? <div className="readonly-banner">Visualizacao somente leitura. Apenas o criador pode alterar esta lista.</div> : null}

      {isListOwner && editingListId ? (
        <ListEditor
          list={editingListId === "new" ? null : lists.find((list) => list.id === editingListId) ?? null}
          onCancel={onCancelList}
          onSave={onSaveList}
        />
      ) : null}

      <div className="panel product-detail-panel">
        <div className="compact-product-list">
          <div className="compact-product-header">
            <button className="sort-header" type="button" onClick={() => toggleSort("name")}>
              Nome produto
              <SortIndicator active={sort.field === "name"} direction={sort.direction} />
            </button>
            <button className="sort-header" type="button" onClick={() => toggleSort("quantity")}>
              Qtd
              <SortIndicator active={sort.field === "quantity"} direction={sort.direction} />
            </button>
            <span>Valor unit.</span>
            <span>Marca</span>
            <span>Supermercado</span>
            <span>Valor total</span>
            <span />
          </div>
          {listProducts.length === 0 ? (
            <EmptyState />
          ) : (
            listProducts.map((product) => (
              <ProductGridRow
                key={product.id}
                product={product}
                isEditing={isListOwner && editingProductId === product.id}
                isRecentlySaved={savedProductId === product.id}
                readOnly={!isListOwner}
                readOnlyReason={readonlyReason}
                onRequestEdit={requestProductEdit}
                onCancelEdit={() => setEditingProductId(null)}
                onDelete={onDeleteProduct}
                onSave={confirmProductEdit}
                onToggleBought={onToggleBought}
              />
            ))
          )}
        </div>
        <div className="product-grid-footer">
          <span>Preco total da lista: <strong>{money(total)}</strong></span>
          <span>Preco atual: <strong>{money(boughtTotal)}</strong></span>
          <span>Comprados: <strong>{boughtCount}</strong></span>
          <span>Conclusao: <strong>{completionRate}%</strong></span>
        </div>
      </div>

      {isListOwner && isProductModalOpen ? <ProductModal onCancel={() => setIsProductModalOpen(false)} onSave={saveProductFromModal} /> : null}
      {isListOwner && isClearModalOpen ? (
        <ClearFieldsModal
          onCancel={() => setIsClearModalOpen(false)}
          onConfirm={(fields) => {
            onClearFields(selectedList.id, fields);
            setIsClearModalOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function ProductGridRow({
  product,
  isEditing,
  isRecentlySaved,
  readOnly,
  readOnlyReason,
  onRequestEdit,
  onCancelEdit,
  onToggleBought,
  onSave,
  onDelete
}: {
  product: Product;
  isEditing: boolean;
  isRecentlySaved: boolean;
  readOnly: boolean;
  readOnlyReason: string;
  onRequestEdit: (productId: string) => void;
  onCancelEdit: () => void;
  onToggleBought: (productId: string) => void;
  onSave: (productId: string, draft: ProductEditDraft) => void;
  onDelete: (productId: string) => void;
}) {
  const [draft, setDraft] = useState<ProductEditDraft>(() => productToEditDraft(product));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(productToEditDraft(product));
    setError("");
  }, [isEditing, product]);

  const parsedQuantity = parseOptionalNumber(draft.quantity);
  const parsedPrice = parseMoney(draft.unitPrice);
  const rowQuantity = isEditing ? (parsedQuantity === undefined || parsedQuantity === null ? 0 : parsedQuantity) : product.quantity ?? 0;
  const rowUnitPrice = isEditing ? (parsedPrice === undefined || parsedPrice === null ? 0 : parsedPrice) : product.unitPrice ?? 0;
  const rowTotal = rowQuantity * rowUnitPrice;

  function startEdit() {
    if (readOnly) {
      return;
    }
    onRequestEdit(product.id);
  }

  function cancelEdit() {
    setDraft(productToEditDraft(product));
    setError("");
    onCancelEdit();
  }

  function saveEdit() {
    if (!isEditing || readOnly) {
      return;
    }
    setError("");
    if (parsedQuantity === undefined) {
      setError("Informe uma quantidade valida ou deixe em branco.");
      return;
    }
    if (parsedPrice === undefined) {
      setError("Informe um valor unitario valido ou deixe em branco.");
      return;
    }
    onSave(product.id, draft);
  }

  return (
    <div
      className={[
        "compact-product-row",
        product.isBought ? "compact-product-row-done" : "",
        isEditing ? "compact-product-row-active" : "",
        isRecentlySaved ? "compact-product-row-saved" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="product-name-cell">
        <button
          className={product.isBought ? "status-bought" : "status-pending"}
          type="button"
          aria-label={product.isBought ? "Comprado" : "Nao comprado"}
          title={readOnly ? readOnlyReason : undefined}
          disabled={readOnly}
          onClick={() => onToggleBought(product.id)}
        >
          {product.isBought ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>
        <button
          className="product-name-stack product-name-edit-trigger"
          type="button"
          onClick={startEdit}
          disabled={readOnly}
          title={readOnly ? readOnlyReason : undefined}
        >
          <strong title={product.name}>{product.name}</strong>
          {isRecentlySaved ? <small className="row-save-feedback">Alteracoes gravadas</small> : null}
        </button>
      </div>
      {isEditing ? (
        <>
          <input
            className="inline-input"
            inputMode="decimal"
            value={draft.quantity}
            placeholder="-"
            aria-label={`Quantidade de ${product.name}`}
            onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
          />
          <input
            className="inline-input inline-input-money"
            inputMode="decimal"
            value={draft.unitPrice}
            placeholder="-"
            aria-label={`Valor unitario de ${product.name}`}
            onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })}
          />
          <input
            className="inline-input"
            value={draft.brand}
            onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
            placeholder="Opcional"
            aria-label={`Marca de ${product.name}`}
          />
          <input
            className="inline-input"
            value={draft.supermarket}
            onChange={(event) => setDraft({ ...draft, supermarket: event.target.value })}
            placeholder="Opcional"
            aria-label={`Supermercado de ${product.name}`}
          />
          <span className="line-total">{money(rowTotal)}</span>
          <span className="row-actions">
            <button className="icon-button row-save-button" type="button" onClick={saveEdit} aria-label="Gravar produto">
              <Save size={16} />
            </button>
            <button className="icon-button" type="button" onClick={cancelEdit} aria-label="Cancelar edicao">
              <X size={16} />
            </button>
            <button className="icon-button" type="button" onClick={() => onDelete(product.id)} aria-label="Excluir produto">
              <Trash2 size={16} />
            </button>
          </span>
          {error ? <p className="row-edit-error">{error}</p> : null}
        </>
      ) : (
        <>
          <button className="inline-value-button" type="button" onClick={startEdit} disabled={readOnly} title={readOnly ? readOnlyReason : undefined}>
            {product.quantity ?? "-"}
          </button>
          <button
            className="inline-value-button inline-value-money"
            type="button"
            onClick={startEdit}
            disabled={readOnly}
            title={readOnly ? readOnlyReason : undefined}
          >
            {product.unitPrice !== null ? money(product.unitPrice) : "-"}
          </button>
          <button className="inline-value-button" type="button" onClick={startEdit} disabled={readOnly} title={readOnly ? readOnlyReason : undefined}>
            {product.brand || "-"}
          </button>
          <button className="inline-value-button" type="button" onClick={startEdit} disabled={readOnly} title={readOnly ? readOnlyReason : undefined}>
            {product.supermarket || "-"}
          </button>
          <span className="line-total">{money(rowTotal)}</span>
          {readOnly ? (
            <span className="row-actions readonly-actions" title={readOnlyReason}>
              Somente leitura
            </span>
          ) : (
            <span className="row-actions">
              <button className="icon-button row-save-button" type="button" onClick={saveEdit} aria-label="Gravar produto" disabled>
                <Save size={16} />
              </button>
              <button className="icon-button" type="button" onClick={cancelEdit} aria-label="Cancelar edicao" disabled>
                <X size={16} />
              </button>
              <button className="icon-button" type="button" onClick={() => onDelete(product.id)} aria-label="Excluir produto">
                <Trash2 size={16} />
              </button>
            </span>
          )}
        </>
      )}
    </div>
  );
}

function ProductModal({ onCancel, onSave }: { onCancel: () => void; onSave: (form: ProductForm) => void }) {
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      onSave(form);
      setForm(emptyProductForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o produto.");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <form className="product-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="passkey-icon" aria-hidden="true">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-supermarket-leaf">Produto</p>
              <h4 className="text-xl font-black">Cadastrar item</h4>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Fechar cadastro de produto">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="field">
            <span>Nome do produto *</span>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ex.: Arroz, leite, cafe..."
              autoFocus
            />
          </label>
          <label className="field">
            <span>Marca</span>
            <input
              className="input"
              value={form.brand}
              onChange={(event) => setForm({ ...form, brand: event.target.value })}
              placeholder="Opcional"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">
              <span>Quantidade</span>
              <input
                className="input"
                inputMode="decimal"
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                placeholder="Opcional"
              />
            </label>
            <label className="field">
              <span>Valor unitario</span>
              <input
                className="input"
                inputMode="decimal"
                value={form.unitPrice}
                onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
                placeholder="Opcional"
              />
            </label>
          </div>
          <label className="field">
            <span>Supermercado</span>
            <input
              className="input"
              value={form.supermarket}
              onChange={(event) => setForm({ ...form, supermarket: event.target.value })}
              placeholder="Opcional"
            />
          </label>
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="button-secondary justify-center" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="button-primary justify-center" type="submit">
            <Plus size={18} />
            Adicionar produto
          </button>
        </div>
      </form>
    </div>
  );
}

function ClearFieldsModal({
  onCancel,
  onConfirm
}: {
  onCancel: () => void;
  onConfirm: (fields: ClearProductFields) => void;
}) {
  const [fields, setFields] = useState<ClearProductFields>(emptyClearProductFields);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      onConfirm(fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel limpar os campos.");
    }
  }

  function updateField(field: keyof ClearProductFields) {
    setFields((current) => ({ ...current, [field]: !current[field] }));
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <form className="product-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-supermarket-leaf">Limpeza em massa</p>
            <h4 className="text-xl font-black">Escolha os campos</h4>
            <p className="mt-1 text-sm font-semibold text-supermarket-ink/60">
              Os produtos, nomes e status de comprado serao preservados.
            </p>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Fechar limpeza de campos">
            <X size={18} />
          </button>
        </div>

        <div className="bulk-clear-grid">
          <label className="bulk-clear-option">
            <input type="checkbox" checked={fields.quantity} onChange={() => updateField("quantity")} />
            <span>Quantidade</span>
          </label>
          <label className="bulk-clear-option">
            <input type="checkbox" checked={fields.unitPrice} onChange={() => updateField("unitPrice")} />
            <span>Valor unitario</span>
          </label>
          <label className="bulk-clear-option">
            <input type="checkbox" checked={fields.brand} onChange={() => updateField("brand")} />
            <span>Marca</span>
          </label>
          <label className="bulk-clear-option">
            <input type="checkbox" checked={fields.supermarket} onChange={() => updateField("supermarket")} />
            <span>Supermercado</span>
          </label>
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="button-secondary justify-center" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="danger-button justify-center" type="submit">
            <RefreshCcw size={16} />
            Confirmar limpeza
          </button>
        </div>
      </form>
    </div>
  );
}

function SortIndicator({ active, direction }: { active: boolean; direction: ProductSort["direction"] }) {
  return (
    <span className={active ? "sort-indicator sort-indicator-active" : "sort-indicator"} aria-hidden="true">
      <ArrowUpDown size={13} />
      {active ? direction.toUpperCase() : null}
    </span>
  );
}

function ListEditor({ list, onCancel, onSave }: { list: ShoppingList | null; onCancel: () => void; onSave: (form: ListForm) => void }) {
  const [form, setForm] = useState<ListForm>(() => (list ? { name: list.name, color: list.color } : emptyListForm));
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
    <form className="mb-5 rounded-[2rem] bg-white p-5 shadow-soft" onSubmit={submit}>
      <div className="mb-4">
        <p className="text-sm font-bold uppercase text-supermarket-leaf">{list ? "Editar lista" : "Nova lista"}</p>
        <h3 className="text-xl font-black">Dados da lista</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <label className="field">
          <span>Nome da lista</span>
          <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Cor</span>
          <input className="color-input" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
        </label>
      </div>
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <div className="mt-5 flex gap-3">
        <button className="button-primary" type="submit">
          <Save size={18} />
          Salvar
        </button>
        <button className="button-secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SharedLists({
  users,
  lists,
  products,
  currentUserId,
  editingListId,
  onEditList,
  onCancelList,
  onSaveList,
  onDeleteList,
  onSaveProduct,
  onToggleBought,
  onInlineChange,
  onClearFields,
  onDeleteProduct
}: {
  users: User[];
  lists: ShoppingList[];
  products: Product[];
  currentUserId: string;
  editingListId: string | null;
  onEditList: (listId: string) => void;
  onCancelList: () => void;
  onSaveList: (form: ListForm) => void;
  onDeleteList: (listId: string) => void;
  onSaveProduct: (listId: string, form: ProductForm) => void;
  onToggleBought: (productId: string) => void;
  onInlineChange: (productId: string, draft: ProductEditDraft) => void;
  onClearFields: (listId: string, fields: ClearProductFields) => void;
  onDeleteProduct: (productId: string) => void;
}) {
  return (
    <SharedListsContent
      users={users}
      lists={lists}
      products={products}
      currentUserId={currentUserId}
      editingListId={editingListId}
      onEditList={onEditList}
      onCancelList={onCancelList}
      onSaveList={onSaveList}
      onDeleteList={onDeleteList}
      onSaveProduct={onSaveProduct}
      onToggleBought={onToggleBought}
      onInlineChange={onInlineChange}
      onClearFields={onClearFields}
      onDeleteProduct={onDeleteProduct}
    />
  );
}

function SharedListsContent(props: {
  users: User[];
  lists: ShoppingList[];
  products: Product[];
  currentUserId: string;
  editingListId: string | null;
  onEditList: (listId: string) => void;
  onCancelList: () => void;
  onSaveList: (form: ListForm) => void;
  onDeleteList: (listId: string) => void;
  onSaveProduct: (listId: string, form: ProductForm) => void;
  onToggleBought: (productId: string) => void;
  onInlineChange: (productId: string, draft: ProductEditDraft) => void;
  onClearFields: (listId: string, fields: ClearProductFields) => void;
  onDeleteProduct: (productId: string) => void;
}) {
  const [selectedSharedListId, setSelectedSharedListId] = useState<string | null>(null);

  return (
    <ShoppingList
      lists={props.lists}
      products={props.products}
      users={props.users}
      currentUserId={props.currentUserId}
      selectedListId={selectedSharedListId}
      editingListId={props.editingListId}
      title="Outras listas"
      description="Visualize listas de todos os usuarios cadastrados neste navegador."
      allowCreateList={false}
      onSelectList={setSelectedSharedListId}
      onBackToLists={() => setSelectedSharedListId(null)}
      onStartList={() => undefined}
      onEditList={props.onEditList}
      onCancelList={props.onCancelList}
      onSaveList={props.onSaveList}
      onDeleteList={props.onDeleteList}
      onSaveProduct={props.onSaveProduct}
      onToggleBought={props.onToggleBought}
      onInlineChange={props.onInlineChange}
      onClearFields={props.onClearFields}
      onDeleteProduct={props.onDeleteProduct}
    />
  );
}

function MigrationView({ currentUser }: { currentUser: User }) {
  const [snapshot, setSnapshot] = useState(() => readLocalDatabaseSnapshot());
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const localDatabase = snapshot.database;
  const localUser = localDatabase?.users.find((user) => user.uid === currentUser.uid) ?? null;
  const userLists = localDatabase?.lists.filter((list) => list.userId === currentUser.uid) ?? [];
  const userProducts = localDatabase?.products.filter((product) => product.userId === currentUser.uid) ?? [];
  const userPriceHistory = localDatabase?.priceHistory.filter((history) => history.userId === currentUser.uid) ?? [];
  const userPasskeys = localDatabase?.passkeys.filter((passkey) => passkey.userId === currentUser.uid) ?? [];
  const totalLocalItems =
    (localDatabase?.users.length ?? 0) +
    (localDatabase?.lists.length ?? 0) +
    (localDatabase?.products.length ?? 0) +
    (localDatabase?.priceHistory.length ?? 0);

  function refreshPreview() {
    setSnapshot(readLocalDatabaseSnapshot());
    setResult(null);
    setError("");
  }

  async function startImport() {
    setError("");
    setResult(null);

    if (!localDatabase || !localUser) {
      setError("Nenhum usuario local correspondente ao login atual foi encontrado.");
      return;
    }

    const confirmed = window.confirm(
      "Importar os dados deste usuario para a nuvem? Os dados locais nao serao apagados e a importacao pode ser executada novamente."
    );
    if (!confirmed) {
      return;
    }

    setIsImporting(true);
    try {
      const response = await importLocalData({
        user: localUser,
        lists: userLists,
        products: userProducts,
        priceHistory: userPriceHistory,
        passkeys: userPasskeys
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel importar os dados locais.");
    } finally {
      setIsImporting(false);
    }
  }

  if (snapshot.error) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="panel">
          <h2 className="text-2xl font-black">Migrar dados para nuvem</h2>
          <p className="mt-3 text-supermarket-ink/70">{snapshot.error}</p>
          <button className="button-secondary mt-5" type="button" onClick={refreshPreview}>
            <RefreshCcw size={16} />
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  if (!localDatabase || totalLocalItems === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="panel">
          <h2 className="text-2xl font-black">Migrar dados para nuvem</h2>
          <p className="mt-3 text-supermarket-ink/70">Nenhum dado local encontrado para importar.</p>
          <button className="button-secondary mt-5" type="button" onClick={refreshPreview}>
            <RefreshCcw size={16} />
            Atualizar previa
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-black uppercase text-supermarket-leaf">Migracao</p>
        <h2 className="text-2xl font-black">Migrar dados para nuvem</h2>
        <p className="mt-2 text-supermarket-ink/70">
          Os dados locais nao serao apagados. Esta importacao pode ser executada novamente sem duplicar registros.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel">
          <h3 className="mb-4 text-xl font-black">Previa local</h3>
          <div className="space-y-3">
            <Summary label="Usuarios encontrados" value={String(localDatabase.users.length)} />
            <Summary label="Listas encontradas" value={String(localDatabase.lists.length)} />
            <Summary label="Produtos encontrados" value={String(localDatabase.products.length)} />
            <Summary label="Historicos encontrados" value={String(localDatabase.priceHistory.length)} />
            <Summary label="Usuario local ativo" value={localUser ? `${localUser.name} (${localUser.email})` : "Nao encontrado"} />
            <Summary label="Leitura" value={new Date(snapshot.readAt).toLocaleString("pt-BR")} />
          </div>
        </section>

        <section className="panel">
          <h3 className="mb-4 text-xl font-black">Sera importado agora</h3>
          <div className="space-y-3">
            <Summary label="Usuario logado" value={currentUser.email} />
            <Summary label="Listas do usuario" value={String(userLists.length)} />
            <Summary label="Produtos do usuario" value={String(userProducts.length)} />
            <Summary label="Historicos do usuario" value={String(userPriceHistory.length)} />
            <Summary label="Passkeys publicas" value={String(userPasskeys.length)} />
            <Summary label="Outros usuarios ignorados" value={String(Math.max(localDatabase.users.length - 1, 0))} />
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="button-primary" type="button" onClick={startImport} disabled={isImporting || !localUser}>
          <Save size={16} />
          {isImporting ? "Importando..." : "Importar dados para nuvem"}
        </button>
        <button className="button-secondary" type="button" onClick={refreshPreview} disabled={isImporting}>
          <RefreshCcw size={16} />
          Atualizar previa
        </button>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-bold text-red-700">{error}</div> : null}

      {result ? (
        <section className="panel mt-5">
          <h3 className="mb-4 text-xl font-black">Resultado da importacao</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(result.summary).map(([key, value]) => (
              <Summary key={key} label={formatMigrationSummaryLabel(key)} value={String(value)} />
            ))}
          </div>
          {result.warnings.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-black">Avisos</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-supermarket-ink/75">
                {result.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function formatMigrationSummaryLabel(key: string) {
  const labels: Record<string, string> = {
    userImported: "Usuario importado",
    userSkipped: "Usuario ignorado",
    listsImported: "Listas importadas",
    listsSkipped: "Listas ignoradas",
    productsImported: "Produtos importados",
    productsSkipped: "Produtos ignorados",
    priceHistoryImported: "Historicos importados",
    priceHistorySkipped: "Historicos ignorados",
    passkeysImported: "Passkeys importadas",
    passkeysSkipped: "Passkeys ignoradas",
    duplicatesDetected: "Duplicados detectados"
  };

  return labels[key] ?? key;
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
  const total = products.reduce((sum, product) => sum + (product.quantity ?? 0) * (product.unitPrice ?? 0), 0);
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
        (item.brand ?? "").toLowerCase().includes(normalizedQuery);
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
                  <small>{[item.brand, item.supermarket].filter(Boolean).join(" - ")}</small>
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
              <Summary label="Marca" value={selected.brand || "-"} />
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
          <div className="h-3 overflow-hidden rounded-full bg-supermarket-mint">
            <div className="h-full rounded-full bg-supermarket-leaf" style={{ width: `${(item.value / max) * 100}%` }} />
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

function SideMenu({
  currentView,
  isOpen,
  onClose,
  onNavigate,
  onLogout,
  onToggleTheme,
  theme,
  userName,
  enableMigration
}: {
  currentView: View;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  theme: ThemeMode;
  userName: string;
  enableMigration: boolean;
}) {
  return (
    <>
      <button
        className={isOpen ? "side-menu-overlay side-menu-overlay-open" : "side-menu-overlay"}
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <aside
        id="app-side-menu"
        className={isOpen ? "side-menu side-menu-open" : "side-menu"}
        aria-hidden={!isOpen}
      >
        <div className="side-menu-header">
          <div>
            <p>Menu</p>
            <h2>{userName}</h2>
          </div>
          <button className="side-menu-close" type="button" onClick={onClose} aria-label="Fechar menu">
            <X size={22} />
          </button>
        </div>

        <nav className="side-menu-nav" aria-label="Navegacao principal">
          <NavButton active={currentView === "home"} onClick={() => onNavigate("home")}>
            Home
          </NavButton>
          <NavButton active={currentView === "list"} onClick={() => onNavigate("list")}>
            Lista
          </NavButton>
          <NavButton active={currentView === "shared"} onClick={() => onNavigate("shared")}>
            Outras listas
          </NavButton>
          <NavButton active={currentView === "dashboard"} onClick={() => onNavigate("dashboard")}>
            Dashboard
          </NavButton>
          <NavButton active={currentView === "history"} onClick={() => onNavigate("history")}>
            Historico
          </NavButton>
          {enableMigration ? (
            <NavButton active={currentView === "migration"} onClick={() => onNavigate("migration")}>
              Migrar dados para nuvem
            </NavButton>
          ) : null}
        </nav>

        <div className="side-menu-footer">
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
          <button className="side-menu-logout" type="button" onClick={onLogout}>
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

function ThemeButton({ theme, onToggle }: { theme: ThemeMode; onToggle: () => void }) {
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      <span>{theme === "dark" ? "Claro" : "Escuro"}</span>
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft">
      <p className="text-sm text-supermarket-ink/60">{label}</p>
      <strong className="text-2xl font-black">{value}</strong>
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
    <div className="rounded-3xl border border-dashed border-supermarket-ink/20 bg-white p-8 text-center">
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
