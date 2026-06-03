import { getBody, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUserOrNull } from "../../src/server/auth/getAuthenticatedUser";
import * as migrationService from "../../src/server/services/migrationService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === "POST") {
      const authUser = await getAuthenticatedUserOrNull(request);
      const result = await migrationService.importLocalData(getBody(request), authUser);
      sendSuccess(response, 201, result, "Importacao concluida");
      return;
    }

    methodNotAllowed(response, ["POST"]);
  } catch (error) {
    sendError(response, error);
  }
}
