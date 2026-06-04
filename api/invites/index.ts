import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import * as inviteService from "../../src/server/services/inviteService";
import { withApiHandler, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";

async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "GET") {
      const invites = await inviteService.getMyInvites(authUser.id);
      sendSuccess(response, 200, invites);
      return;
    }

    methodNotAllowed(response, ["GET"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
