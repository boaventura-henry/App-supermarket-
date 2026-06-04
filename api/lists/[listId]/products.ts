import { withApiHandler, getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";
import { getAuthenticatedUser } from "../../../src/server/auth/getAuthenticatedUser";
import * as productService from "../../../src/server/services/productService";

async function handler(request: ApiRequest, response: ApiResponse) {
  const listId = getQueryParam(request, "listId");

  try {
    const authUser = await getAuthenticatedUser(request);
    if (request.method === "GET") {
      const products = await productService.getProducts(listId, authUser.id);
      sendSuccess(response, 200, products);
      return;
    }

    if (request.method === "POST") {
      const body = getBody(request);
      const product = await productService.createProduct(listId, { ...body, userId: authUser.id });
      sendSuccess(response, 201, product, "Produto criado");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
