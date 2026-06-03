import { getBody, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import * as listService from "../../src/server/services/listService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (request.method === "GET") {
      const lists = await listService.getLists(authUser.id);
      sendSuccess(response, 200, lists);
      return;
    }

    if (request.method === "POST") {
      const body = getBody(request);
      const list = await listService.createList({ ...body, userId: authUser.id });
      sendSuccess(response, 201, list, "Lista criada");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
