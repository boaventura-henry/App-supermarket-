import {
  getIdentity,
  getQueryParam,
  methodNotAllowed,
  sendError,
  sendSuccess,
  type ApiRequest,
  type ApiResponse
} from "../_utils";
import * as priceHistoryService from "../../src/server/services/priceHistoryService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const identity = getIdentity(request);

    if (request.method === "GET") {
      const history = await priceHistoryService.getPriceHistoryRecord(identity, id);
      sendSuccess(response, 200, history);
      return;
    }

    if (request.method === "DELETE") {
      const result = await priceHistoryService.deletePriceHistory(identity, id);
      sendSuccess(response, 200, result, "Historico de precos excluido");
      return;
    }

    methodNotAllowed(response, ["GET", "DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}
