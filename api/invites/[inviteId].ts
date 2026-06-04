import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import * as inviteService from "../../src/server/services/inviteService";
import { withApiHandler, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";

async function handler(request: ApiRequest, response: ApiResponse) {
  const inviteId = getQueryParam(request, "inviteId");

  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "DELETE") {
      const invite = await inviteService.cancelInvite(inviteId, authUser.id);
      sendSuccess(response, 200, invite, "Convite cancelado");
      return;
    }

    methodNotAllowed(response, ["DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
