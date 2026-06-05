import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as productRepository from "../repositories/productRepository";
import * as profileRepository from "../repositories/profileRepository";
import { createAutoPriceHistory } from "./priceHistoryService";
import * as productService from "./productService";

vi.mock("../repositories/productRepository");
vi.mock("../repositories/profileRepository");
vi.mock("./priceHistoryService", () => ({
  createAutoPriceHistory: vi.fn()
}));

const identity = {
  legacyId: "usr_local",
  email: "user@example.com",
  name: "Usuario"
};

const profile = {
  id: "f715917e-a18c-4cee-bca5-a63d61590a4d",
  legacyId: identity.legacyId,
  email: identity.email,
  name: identity.name
};

const list = {
  id: "4bf3f70e-c99d-4070-997f-e0db98798ac1",
  legacyId: null,
  userId: profile.id,
  name: "Mercado",
  color: "#6df7a7"
};

function product(overrides: Partial<productRepository.ProductRecord> = {}) {
  return {
    id: "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4",
    legacyId: null,
    userId: profile.id,
    listId: list.id,
    name: "Arroz",
    brand: "Tipo 1",
    quantity: new Prisma.Decimal("2"),
    unitPrice: new Prisma.Decimal("8.50"),
    supermarket: "Mercado Central",
    purchased: false,
    sortOrder: 3,
    createdAt: new Date("2026-06-04T00:00:00.000Z"),
    updatedAt: new Date("2026-06-04T00:00:00.000Z"),
    user: { legacyId: identity.legacyId },
    list: { legacyId: null, userId: profile.id },
    ...overrides
  } as productRepository.ProductRecord;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(profileRepository.ensureProfile).mockResolvedValue(profile);
  vi.mocked(productRepository.findListById).mockResolvedValue(list);
  vi.mocked(createAutoPriceHistory).mockResolvedValue(null);
});

describe("productService", () => {
  it("lista produtos da lista do usuario preservando retorno local", async () => {
    vi.mocked(productRepository.findAllByList).mockResolvedValue([product()]);

    await expect(productService.getProducts(identity, list.id)).resolves.toMatchObject([
      {
        id: "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4",
        userId: identity.legacyId,
        listId: list.id,
        name: "Arroz",
        quantity: 2,
        unitPrice: 8.5,
        purchased: false,
        sortOrder: 3
      }
    ]);
    expect(productRepository.findAllByList).toHaveBeenCalledWith(list.id, profile.id);
  });

  it("cria produto com sortOrder no fim da lista original", async () => {
    vi.mocked(productRepository.nextSortOrder).mockResolvedValue(4);
    vi.mocked(productRepository.create).mockResolvedValue(product({ sortOrder: 4 }));

    await productService.createProduct(identity, list.id, {
      name: "  Arroz  ",
      brand: "Tipo 1",
      quantity: "2",
      unitPrice: "8,50",
      supermarket: "Mercado Central"
    });

    expect(productRepository.create).toHaveBeenCalledWith({
      userId: profile.id,
      listId: list.id,
      name: "Arroz",
      brand: "Tipo 1",
      quantity: new Prisma.Decimal("2.000"),
      unitPrice: new Prisma.Decimal("8.50"),
      supermarket: "Mercado Central",
      sortOrder: 4
    });
    expect(createAutoPriceHistory).toHaveBeenCalledWith({
      userId: profile.id,
      listId: list.id,
      productId: "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4",
      productName: "Arroz",
      brand: "Tipo 1",
      supermarket: "Mercado Central",
      quantity: new Prisma.Decimal("2"),
      price: new Prisma.Decimal("8.50")
    });
  });

  it("rejeita produto sem descricao", async () => {
    await expect(productService.createProduct(identity, list.id, { name: " " })).rejects.toMatchObject({
      statusCode: 400,
      message: "Informe a descricao do produto."
    });
  });

  it("edita campos opcionais sem alterar nome nem sortOrder", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(product());
    vi.mocked(productRepository.update).mockResolvedValue(
      product({
        brand: null,
        quantity: null,
        unitPrice: new Prisma.Decimal("9.90"),
        supermarket: null
      })
    );

    await productService.updateProduct(identity, "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4", {
      brand: "",
      quantity: "",
      unitPrice: "9.90",
      supermarket: ""
    });

    expect(productRepository.update).toHaveBeenCalledWith("c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4", profile.id, {
      brand: null,
      quantity: null,
      unitPrice: new Prisma.Decimal("9.90"),
      supermarket: null
    });
  });

  it("marca comprado preservando sortOrder para retorno ao desmarcar", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(product({ purchased: false, sortOrder: 2 }));
    vi.mocked(productRepository.updatePurchasedStatus).mockResolvedValue(product({ purchased: true, sortOrder: 2 }));

    const result = await productService.updatePurchasedStatus(identity, "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4", {
      purchased: true
    });

    expect(result).toMatchObject({ purchased: true, isBought: true, sortOrder: 2 });
    expect(productRepository.updatePurchasedStatus).toHaveBeenCalledWith(
      "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4",
      profile.id,
      true
    );
  });

  it("desmarca comprado sem recriar ordem", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(product({ purchased: true, sortOrder: 2 }));
    vi.mocked(productRepository.updatePurchasedStatus).mockResolvedValue(product({ purchased: false, sortOrder: 2 }));

    const result = await productService.updatePurchasedStatus(identity, "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4", {
      purchased: false
    });

    expect(result).toMatchObject({ purchased: false, isBought: false, sortOrder: 2 });
  });

  it("exclui somente produto do usuario resolvido", async () => {
    vi.mocked(productRepository.deleteProduct).mockResolvedValue({ id: "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4" });

    await expect(productService.deleteProduct(identity, "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4")).resolves.toEqual({
      id: "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4"
    });
    expect(productRepository.deleteProduct).toHaveBeenCalledWith("c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4", profile.id);
  });

  it("impede acesso a produto de outro usuario", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(null);

    await expect(productService.updateProduct(identity, "produto-de-outro", { brand: "Outra" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Produto nao encontrado."
    });
  });
});
