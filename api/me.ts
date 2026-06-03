import { getAuthenticatedUser } from "../src/server/auth/getAuthenticatedUser";
import { prisma } from "../src/server/prisma";
import { getBody, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "./_utils";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "GET") {
      const profile = await upsertProfile(authUser.id, authUser.email, authUser.name);
      await ensureAppUser(authUser.id, authUser.email, profile.name ?? authUser.name);
      sendSuccess(response, 200, profile);
      return;
    }

    if (request.method === "PUT") {
      const body = getBody(request);
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : authUser.name;
      const profile = await upsertProfile(authUser.id, authUser.email, name);
      await ensureAppUser(authUser.id, authUser.email, profile.name ?? authUser.name);
      sendSuccess(response, 200, profile, "Perfil atualizado");
      return;
    }

    methodNotAllowed(response, ["GET", "PUT"]);
  } catch (error) {
    sendError(response, error);
  }
}

async function upsertProfile(id: string, email: string, name: string) {
  return prisma.profile.upsert({
    where: { id },
    update: { email, name },
    create: { id, email, name }
  });
}

async function ensureAppUser(id: string, email: string, name: string) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ id }, { email }]
    },
    select: { id: true }
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: existing.id === id ? { email, name } : { email, name, legacyId: id }
    });
  }

  return prisma.user.create({
    data: {
      id,
      email,
      name,
      passwordHash: "supabase-auth",
      securityAnswerHash: "supabase-auth"
    }
  });
}
