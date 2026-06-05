import {
  getBody,
  getIdentity,
  getQueryParam,
  methodNotAllowed,
  sendError,
  sendSuccess,
  type ApiRequest,
  type ApiResponse
} from "../../_utils";
import * as productService from "../../../src/server/services/productService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const listId = getQueryParam(request, "listId");

  try {
    const identity = getIdentity(request);

    if (request.method === "GET") {
      const products = await productService.getProducts(identity, listId);
      sendSuccess(response, 200, products);
      return;
    }

    if (request.method === "POST") {
      const product = await productService.createProduct(identity, listId, getBody(request));
      sendSuccess(response, 201, product, "Produto criado");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
