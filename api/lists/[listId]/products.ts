import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";
import * as productService from "../../../src/server/services/productService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const listId = getQueryParam(request, "listId");

  try {
    if (request.method === "GET") {
      const userId = getQueryParam(request, "userId");
      const products = await productService.getProducts(listId, userId);
      sendSuccess(response, 200, products);
      return;
    }

    if (request.method === "POST") {
      const product = await productService.createProduct(listId, getBody(request));
      sendSuccess(response, 201, product, "Produto criado");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
