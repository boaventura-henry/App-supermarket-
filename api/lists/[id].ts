import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import * as listService from "../../src/server/services/listService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    if (request.method === "GET") {
      const userId = getQueryParam(request, "userId");
      const list = await listService.getList(id, userId);
      sendSuccess(response, 200, list);
      return;
    }

    if (request.method === "PUT") {
      const list = await listService.updateList(id, getBody(request));
      sendSuccess(response, 200, list, "Lista atualizada");
      return;
    }

    if (request.method === "DELETE") {
      const userId = getQueryParam(request, "userId") ?? getBody(request).userId;
      const result = await listService.deleteList(id, userId);
      sendSuccess(response, 200, result, "Lista excluida");
      return;
    }

    methodNotAllowed(response, ["GET", "PUT", "DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}
