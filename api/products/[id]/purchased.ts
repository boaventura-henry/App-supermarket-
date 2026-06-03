import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";
import { getAuthenticatedUserOrNull } from "../../../src/server/auth/getAuthenticatedUser";
import * as productService from "../../../src/server/services/productService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const authUser = await getAuthenticatedUserOrNull(request);
    if (request.method === "PATCH") {
      const body = getBody(request);
      const product = await productService.updatePurchasedStatus(id, { ...body, userId: authUser?.id ?? body.userId });
      sendSuccess(response, 200, product, "Status atualizado");
      return;
    }

    methodNotAllowed(response, ["PATCH"]);
  } catch (error) {
    sendError(response, error);
  }
}
