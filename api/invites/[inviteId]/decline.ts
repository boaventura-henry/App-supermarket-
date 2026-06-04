import { getAuthenticatedUser } from "../../../src/server/auth/getAuthenticatedUser";
import * as inviteService from "../../../src/server/services/inviteService";
import { withApiHandler, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";

async function handler(request: ApiRequest, response: ApiResponse) {
  const inviteId = getQueryParam(request, "inviteId");

  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "POST") {
      const invite = await inviteService.declineInvite(inviteId, authUser.id);
      sendSuccess(response, 200, invite, "Convite recusado");
      return;
    }

    methodNotAllowed(response, ["POST"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
