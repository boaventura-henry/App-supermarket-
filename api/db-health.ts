import { getAuthenticatedUser } from "../src/server/auth/getAuthenticatedUser";
import { prisma } from "../src/server/prisma";
import { methodNotAllowed, sendError, sendSuccess, withApiHandler, type ApiRequest, type ApiResponse } from "./_utils";

async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    await getAuthenticatedUser(request);
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(response, 200, { database: "supabase-postgres" });
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
