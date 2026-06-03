import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import * as notificationService from "../../src/server/services/notificationService";
import { methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "PATCH") {
      const result = await notificationService.markAllAsRead(authUser.id);
      sendSuccess(response, 200, result, "Notificacoes marcadas como lidas");
      return;
    }

    methodNotAllowed(response, ["PATCH"]);
  } catch (error) {
    sendError(response, error);
  }
}
