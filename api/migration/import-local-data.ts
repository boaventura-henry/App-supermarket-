import { getBody, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import * as migrationService from "../../src/server/services/migrationService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === "POST") {
      const result = await migrationService.importLocalData(getBody(request));
      sendSuccess(response, 201, result, "Importacao concluida");
      return;
    }

    methodNotAllowed(response, ["POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
