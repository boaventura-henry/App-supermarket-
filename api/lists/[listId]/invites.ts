import { getAuthenticatedUser } from "../../../src/server/auth/getAuthenticatedUser";
import * as inviteService from "../../../src/server/services/inviteService";
import { withApiHandler, getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../_utils";

async function handler(request: ApiRequest, response: ApiResponse) {
  const listId = getQueryParam(request, "listId");

  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "GET") {
      const invites = await inviteService.getListInvites(listId, authUser.id);
      sendSuccess(response, 200, invites);
      return;
    }

    if (request.method === "POST") {
      const invite = await inviteService.createInvite(listId, { ...getBody(request), userId: authUser.id });
      sendSuccess(response, 201, invite, "Convite criado");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
