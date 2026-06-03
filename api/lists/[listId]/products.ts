import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";
import { getAuthenticatedUserOrNull } from "../../../src/server/auth/getAuthenticatedUser";
import * as productService from "../../../src/server/services/productService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const listId = getQueryParam(request, "listId");

  try {
    const authUser = await getAuthenticatedUserOrNull(request);
    if (request.method === "GET") {
      const userId = authUser?.id ?? getQueryParam(request, "userId");
      const products = await productService.getProducts(listId, userId);
      sendSuccess(response, 200, products);
      return;
    }

    if (request.method === "POST") {
      const body = getBody(request);
      const product = await productService.createProduct(listId, { ...body, userId: authUser?.id ?? body.userId });
      sendSuccess(response, 201, product, "Produto criado");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
