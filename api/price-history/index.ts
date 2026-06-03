import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import * as priceHistoryService from "../../src/server/services/priceHistoryService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === "GET") {
      const history = await priceHistoryService.getPriceHistory({
        userId: getQueryParam(request, "userId"),
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
      const history = await priceHistoryService.createPriceHistory(getBody(request));
      sendSuccess(response, 201, history, "Historico de precos criado");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
