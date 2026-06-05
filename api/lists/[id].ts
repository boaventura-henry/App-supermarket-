import {
  getBody,
  getIdentity,
  getQueryParam,
  methodNotAllowed,
  sendError,
  sendSuccess,
  type ApiRequest,
  type ApiResponse
} from "../_utils";
import * as listService from "../../src/server/services/listService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== "GET" && request.method !== "PUT" && request.method !== "DELETE") {
      methodNotAllowed(response, ["GET", "PUT", "DELETE"]);
      return;
    }

    const identity = getIdentity(request);
    const id = getQueryParam(request, "id");

    if (request.method === "GET") {
      sendSuccess(response, 200, await listService.getList(identity, id));
      return;
    }

    if (request.method === "PUT") {
      sendSuccess(response, 200, await listService.updateList(identity, id, getBody(request)), "Lista atualizada");
      return;
    }

    if (request.method === "DELETE") {
      sendSuccess(response, 200, await listService.deleteList(identity, id), "Lista excluida");
      return;
    }

  } catch (error) {
    sendError(response, error);
  }
}
