import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors";
import * as listRepository from "../repositories/listRepository";
import * as profileRepository from "../repositories/profileRepository";
import * as listService from "./listService";

vi.mock("../repositories/listRepository");
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
  legacyId: null,
  userId: profile.id,
  name: "Mercado",
  color: "#6df7a7",
  createdAt: new Date("2026-06-04T00:00:00.000Z"),
  updatedAt: new Date("2026-06-04T00:00:00.000Z")
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(profileRepository.ensureProfile).mockResolvedValue(profile);
});

describe("listService", () => {
  it("lista somente dados do perfil resolvido", async () => {
    vi.mocked(listRepository.findAllByUser).mockResolvedValue([list]);

    await expect(listService.getLists(identity)).resolves.toEqual([list]);
    expect(listRepository.findAllByUser).toHaveBeenCalledWith(profile.id);
  });

  it("cria lista normalizada para o perfil resolvido", async () => {
    vi.mocked(listRepository.create).mockResolvedValue(list);

    await listService.createList(identity, { name: "  Mercado  ", color: "#6DF7A7" });

    expect(listRepository.create).toHaveBeenCalledWith({
      userId: profile.id,
      name: "Mercado",
      color: "#6df7a7"
    });
  });

  it("rejeita lista sem nome", async () => {
    await expect(listService.createList(identity, { name: " ", color: "#6df7a7" })).rejects.toMatchObject({
      statusCode: 400
    });
  });

  it("impede atualizar lista que nao pertence ao perfil", async () => {
    vi.mocked(listRepository.update).mockResolvedValue(null);

    await expect(listService.updateList(identity, list.id, { name: "Outra" })).rejects.toEqual(
      new AppError(404, "Lista nao encontrada")
    );
    expect(listRepository.update).toHaveBeenCalledWith(list.id, profile.id, { name: "Outra" });
  });

  it("impede excluir lista que nao pertence ao perfil", async () => {
    vi.mocked(listRepository.remove).mockResolvedValue(null);

    await expect(listService.deleteList(identity, list.id)).rejects.toMatchObject({
      statusCode: 404,
      message: "Lista nao encontrada"
    });
  });
});
