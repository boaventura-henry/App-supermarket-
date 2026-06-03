import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import * as listService from "../../src/server/services/listService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === "GET") {
      const userId = getQueryParam(request, "userId");
      const lists = await listService.getLists(userId);
      sendSuccess(response, 200, lists);
      return;
    }

    if (request.method === "POST") {
      const list = await listService.createList(getBody(request));
      sendSuccess(response, 201, list, "Lista criada");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
