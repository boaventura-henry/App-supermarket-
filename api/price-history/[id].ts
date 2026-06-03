import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUserOrNull } from "../../src/server/auth/getAuthenticatedUser";
import * as priceHistoryService from "../../src/server/services/priceHistoryService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const authUser = await getAuthenticatedUserOrNull(request);
    if (request.method === "GET") {
      const userId = authUser?.id ?? getQueryParam(request, "userId");
      const history = await priceHistoryService.getPriceHistoryRecord(id, userId);
      sendSuccess(response, 200, history);
      return;
    }

    if (request.method === "DELETE") {
      const userId = authUser?.id ?? getQueryParam(request, "userId") ?? getBody(request).userId;
      const result = await priceHistoryService.deletePriceHistory(id, userId);
      sendSuccess(response, 200, result, "Historico de precos excluido");
      return;
    }

    methodNotAllowed(response, ["GET", "DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}
