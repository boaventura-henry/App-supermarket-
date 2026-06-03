import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";
import * as productService from "../../../src/server/services/productService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    if (request.method === "PATCH") {
      const product = await productService.updatePurchasedStatus(id, getBody(request));
      sendSuccess(response, 200, product, "Status atualizado");
      return;
    }

    methodNotAllowed(response, ["PATCH"]);
  } catch (error) {
    sendError(response, error);
  }
}
