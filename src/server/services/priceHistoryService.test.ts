import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as priceHistoryRepository from "../repositories/priceHistoryRepository";
import * as profileRepository from "../repositories/profileRepository";
import * as priceHistoryService from "./priceHistoryService";

vi.mock("../repositories/priceHistoryRepository");
vi.mock("../repositories/profileRepository");

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
  userId: profile.id
};

const product = {
  id: "c98d0105-8e80-4cfe-a9f8-a9b78f43c0d4",
  userId: profile.id,
  listId: list.id
};

function history(overrides: Partial<priceHistoryRepository.PriceHistoryRecord> = {}) {
  return {
    id: "1d2d719f-197e-4821-89a1-2e8bc3bc3fef",
    legacyId: null,
    userId: profile.id,
    listId: list.id,
    productId: product.id,
    productName: "Arroz",
    brand: "Tipo 1",
    quantity: new Prisma.Decimal("2"),
    price: new Prisma.Decimal("8.50"),
    supermarket: "Mercado Central",
    createdAt: new Date("2026-06-04T00:00:00.000Z"),
    user: { legacyId: identity.legacyId },
    list: { legacyId: null },
    product: { legacyId: null },
    ...overrides
  } as priceHistoryRepository.PriceHistoryRecord;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(profileRepository.ensureProfile).mockResolvedValue(profile);
  vi.mocked(priceHistoryRepository.findListById).mockResolvedValue(list);
  vi.mocked(priceHistoryRepository.findProductById).mockResolvedValue(product);
});

describe("priceHistoryService", () => {
  it("lista historico com filtros por produto, supermercado e intervalo mensal", async () => {
    vi.mocked(priceHistoryRepository.findAllByUser).mockResolvedValue([history()]);

    const result = await priceHistoryService.getPriceHistory(identity, {
      productName: "Arroz",
      supermarket: "Mercado",
      monthStart: "2026-01",
      monthEnd: "2026-06"
    });

    expect(result).toMatchObject([{ productName: "Arroz", price: 8.5, userId: identity.legacyId }]);
    expect(priceHistoryRepository.findAllByUser).toHaveBeenCalledWith(
      profile.id,
      expect.objectContaining({
        productName: "Arroz",
        supermarket: "Mercado",
        monthStart: new Date(Date.UTC(2026, 0, 1)),
        monthEnd: new Date(Date.UTC(2026, 6, 1))
      })
    );
  });

  it("cria historico validando lista e produto do usuario", async () => {
    vi.mocked(priceHistoryRepository.create).mockResolvedValue(history());

    await priceHistoryService.createPriceHistory(identity, {
      listId: list.id,
      productId: product.id,
      productName: "Arroz",
      brand: "Tipo 1",
      quantity: "2",
      price: "8,50",
      supermarket: "Mercado Central"
    });

    expect(priceHistoryRepository.create).toHaveBeenCalledWith({
      userId: profile.id,
      listId: list.id,
      productId: product.id,
      productName: "Arroz",
      brand: "Tipo 1",
      supermarket: "Mercado Central",
      quantity: new Prisma.Decimal("2.000"),
      price: new Prisma.Decimal("8.50")
    });
  });

  it("rejeita preco vazio ou zero", async () => {
    await expect(priceHistoryService.createPriceHistory(identity, { productName: "Arroz", price: 0 })).rejects.toMatchObject({
      statusCode: 400,
      message: "Informe um valor valido maior que zero."
    });
  });

  it("impede criar historico para produto de outro usuario", async () => {
    vi.mocked(priceHistoryRepository.findProductById).mockResolvedValue(null);

    await expect(
      priceHistoryService.createPriceHistory(identity, {
        productId: "produto-de-outro",
        productName: "Arroz",
        price: 8.5
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Produto nao encontrado."
    });
  });

  it("busca registro por id somente do usuario resolvido", async () => {
    vi.mocked(priceHistoryRepository.findById).mockResolvedValue(history());

    await expect(priceHistoryService.getPriceHistoryRecord(identity, "1d2d719f-197e-4821-89a1-2e8bc3bc3fef")).resolves.toMatchObject({
      id: "1d2d719f-197e-4821-89a1-2e8bc3bc3fef"
    });
    expect(priceHistoryRepository.findById).toHaveBeenCalledWith("1d2d719f-197e-4821-89a1-2e8bc3bc3fef", profile.id);
  });

  it("exclui registro somente do usuario resolvido", async () => {
    vi.mocked(priceHistoryRepository.deleteHistory).mockResolvedValue({ id: "1d2d719f-197e-4821-89a1-2e8bc3bc3fef" });

    await expect(priceHistoryService.deletePriceHistory(identity, "1d2d719f-197e-4821-89a1-2e8bc3bc3fef")).resolves.toEqual({
      id: "1d2d719f-197e-4821-89a1-2e8bc3bc3fef"
    });
  });

  it("gera historico automatico ignorando preco zero", async () => {
    await expect(
      priceHistoryService.createAutoPriceHistory({
        userId: profile.id,
        listId: list.id,
        productId: product.id,
        productName: "Arroz",
        brand: "Tipo 1",
        supermarket: "Mercado Central",
        quantity: new Prisma.Decimal("2"),
        price: new Prisma.Decimal("0")
      })
    ).resolves.toBeNull();
    expect(priceHistoryRepository.create).not.toHaveBeenCalled();
  });
});
