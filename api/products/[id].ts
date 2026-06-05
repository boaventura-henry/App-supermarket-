import {
  getBody,
  getIdentity,
  getQueryParam,
  methodNotAllowed,
  sendError,
  sendSuccess,
  type ApiRequest,
  type ApiResponse
} from "../_utils";
import * as productService from "../../src/server/services/productService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const identity = getIdentity(request);

    if (request.method === "PUT") {
      const product = await productService.updateProduct(identity, id, getBody(request));
      sendSuccess(response, 200, product, "Produto atualizado");
      return;
    }

    if (request.method === "DELETE") {
      const result = await productService.deleteProduct(identity, id);
      sendSuccess(response, 200, result, "Produto excluido");
      return;
    }

    methodNotAllowed(response, ["PUT", "DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}
