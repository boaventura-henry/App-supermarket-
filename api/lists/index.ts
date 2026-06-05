import { getBody, getIdentity, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import * as listService from "../../src/server/services/listService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== "GET" && request.method !== "POST") {
      methodNotAllowed(response, ["GET", "POST"]);
      return;
    }

    const identity = getIdentity(request);

    if (request.method === "GET") {
      sendSuccess(response, 200, await listService.getLists(identity));
      return;
    }

    sendSuccess(response, 201, await listService.createList(identity, getBody(request)), "Lista criada");
  } catch (error) {
    sendError(response, error);
  }
}
