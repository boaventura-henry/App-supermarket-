import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUserOrNull } from "../../src/server/auth/getAuthenticatedUser";
import * as listService from "../../src/server/services/listService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const authUser = await getAuthenticatedUserOrNull(request);
    if (request.method === "GET") {
      const userId = authUser?.id ?? getQueryParam(request, "userId");
      const lists = await listService.getLists(userId);
      sendSuccess(response, 200, lists);
      return;
    }

    if (request.method === "POST") {
      const body = getBody(request);
      const list = await listService.createList({ ...body, userId: authUser?.id ?? body.userId });
      sendSuccess(response, 201, list, "Lista criada");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
