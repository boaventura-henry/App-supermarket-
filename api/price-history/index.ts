import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUserOrNull } from "../../src/server/auth/getAuthenticatedUser";
import * as priceHistoryService from "../../src/server/services/priceHistoryService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const authUser = await getAuthenticatedUserOrNull(request);
    if (request.method === "GET") {
      const history = await priceHistoryService.getPriceHistory({
        userId: authUser?.id ?? getQueryParam(request, "userId"),
        productName: getQueryParam(request, "productName"),
        supermarket: getQueryParam(request, "supermarket"),
        brand: getQueryParam(request, "brand"),
        monthStart: getQueryParam(request, "monthStart"),
        monthEnd: getQueryParam(request, "monthEnd")
      });
      sendSuccess(response, 200, history);
      return;
    }

    if (request.method === "POST") {
      const body = getBody(request);
      const history = await priceHistoryService.createPriceHistory({ ...body, userId: authUser?.id ?? body.userId });
      sendSuccess(response, 201, history, "Historico de precos criado");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
