import { withApiHandler, getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import * as priceHistoryService from "../../src/server/services/priceHistoryService";

async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (request.method === "GET") {
      const history = await priceHistoryService.getPriceHistory({
        userId: authUser.id,
        productName: getQueryParam(request, "productName"),
        supermarket: getQueryParam(request, "supermarket"),
        brand: getQueryParam(request, "brand"),
        monthStart: getQueryParam(request, "monthStart"),
        monthEnd: getQueryParam(request, "monthEnd"),
        limit: getQueryParam(request, "limit")
      });
      sendSuccess(response, 200, history);
      return;
    }

    if (request.method === "POST") {
      const body = getBody(request);
      const history = await priceHistoryService.createPriceHistory({ ...body, userId: authUser.id });
      sendSuccess(response, 201, history, "Historico de precos criado");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
