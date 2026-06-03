import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUserOrNull } from "../../src/server/auth/getAuthenticatedUser";
import * as productService from "../../src/server/services/productService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const authUser = await getAuthenticatedUserOrNull(request);
    if (request.method === "PUT") {
      const body = getBody(request);
      const product = await productService.updateProduct(id, { ...body, userId: authUser?.id ?? body.userId });
      sendSuccess(response, 200, product, "Produto atualizado");
      return;
    }

    if (request.method === "DELETE") {
      const userId = authUser?.id ?? getQueryParam(request, "userId") ?? getBody(request).userId;
      const result = await productService.deleteProduct(id, userId);
      sendSuccess(response, 200, result, "Produto excluido");
      return;
    }

    methodNotAllowed(response, ["PUT", "DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}
