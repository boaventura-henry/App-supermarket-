import { withApiHandler, getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";
import { getAuthenticatedUser } from "../../../src/server/auth/getAuthenticatedUser";
import * as productService from "../../../src/server/services/productService";

async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const authUser = await getAuthenticatedUser(request);
    if (request.method === "PATCH") {
      const body = getBody(request);
      const product = await productService.updatePurchasedStatus(id, { ...body, userId: authUser.id });
      sendSuccess(response, 200, product, "Status atualizado");
      return;
    }

    methodNotAllowed(response, ["PATCH"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
