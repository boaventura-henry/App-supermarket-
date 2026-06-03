import { AppError } from "../errors";
import { prisma } from "../prisma";

export type ListAccessRole = "OWNER" | "EDITOR" | "VIEWER";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function idFilter(id: string) {
  return uuidPattern.test(id) ? [{ id }, { legacyId: id }] : [{ legacyId: id }];
}

export async function resolveUserId(userId: string) {
  const user = await prisma.user.findFirst({
    where: { OR: idFilter(userId) },
    select: { id: true, legacyId: true, name: true, email: true }
  });

  if (!user) {
    throw new AppError(401, "Usuario nao encontrado.");
  }

  return user;
}

export async function resolveListId(listId: string) {
  const list = await prisma.shoppingList.findFirst({
    where: { OR: idFilter(listId) },
    select: { id: true, legacyId: true, userId: true, name: true }
  });

  if (!list) {
    throw new AppError(404, "Lista nao encontrada.");
  }

  return list;
}

export async function getListAccess(userId: string, listId: string): Promise<ListAccessRole | null> {
  const [user, list] = await Promise.all([resolveUserId(userId), resolveListId(listId)]);
  if (list.userId === user.id) {
    return "OWNER";
  }

  const shared = await prisma.sharedListAccess.findUnique({
    where: {
      listId_userId: {
        listId: list.id,
        userId: user.id
      }
    },
    select: { role: true }
  });

  return shared?.role ?? null;
}

export async function requireListViewer(userId: string, listId: string) {
  const access = await getListAccess(userId, listId);
  if (!access) {
    throw new AppError(403, "Voce nao tem permissao para visualizar esta lista.");
  }
  return access;
}

export async function requireListEditor(userId: string, listId: string) {
  const access = await getListAccess(userId, listId);
  if (access !== "OWNER" && access !== "EDITOR") {
    throw new AppError(403, "Voce nao tem permissao para alterar esta lista.");
  }
  return access;
}

export async function requireListOwner(userId: string, listId: string) {
  const access = await getListAccess(userId, listId);
  if (access !== "OWNER") {
    throw new AppError(403, "Somente o criador pode gerenciar esta lista.");
  }
  return access;
}
