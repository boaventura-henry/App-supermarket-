import { getAuthenticatedUser } from "../../../src/server/auth/getAuthenticatedUser";
import * as notificationService from "../../../src/server/services/notificationService";
import { withApiHandler, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";

async function handler(request: ApiRequest, response: ApiResponse) {
  const id = getQueryParam(request, "id");

  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "PATCH") {
      const notification = await notificationService.markAsRead(id, authUser.id);
      sendSuccess(response, 200, notification, "Notificacao lida");
      return;
    }

    methodNotAllowed(response, ["PATCH"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
