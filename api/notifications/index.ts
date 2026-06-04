import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import * as notificationService from "../../src/server/services/notificationService";
import { withApiHandler, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";

async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "GET") {
      const notifications = await notificationService.getNotifications(authUser.id, getQueryParam(request, "limit"));
      sendSuccess(response, 200, notifications);
      return;
    }

    methodNotAllowed(response, ["GET"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
