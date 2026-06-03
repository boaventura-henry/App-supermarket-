import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import * as listService from "../../src/server/services/listService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const authUser = await getAuthenticatedUser(request);
    if (request.method === "GET") {
      const list = await listService.getList(id, authUser.id);
      sendSuccess(response, 200, list);
      return;
    }

    if (request.method === "PUT") {
      const body = getBody(request);
      const list = await listService.updateList(id, { ...body, userId: authUser.id });
      sendSuccess(response, 200, list, "Lista atualizada");
      return;
    }

    if (request.method === "DELETE") {
      const result = await listService.deleteList(id, authUser.id);
      sendSuccess(response, 200, result, "Lista excluida");
      return;
    }

    methodNotAllowed(response, ["GET", "PUT", "DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}
