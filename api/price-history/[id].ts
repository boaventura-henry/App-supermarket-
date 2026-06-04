import { withApiHandler, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import * as priceHistoryService from "../../src/server/services/priceHistoryService";

async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const authUser = await getAuthenticatedUser(request);
    if (request.method === "GET") {
      const history = await priceHistoryService.getPriceHistoryRecord(id, authUser.id);
      sendSuccess(response, 200, history);
      return;
    }

    if (request.method === "DELETE") {
      const result = await priceHistoryService.deletePriceHistory(id, authUser.id);
      sendSuccess(response, 200, result, "Historico de precos excluido");
      return;
    }

    methodNotAllowed(response, ["GET", "DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
