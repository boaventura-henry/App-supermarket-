import { getAuthenticatedUser } from "../../../../src/server/auth/getAuthenticatedUser";
import { withApiHandler, getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../../_utils";
import * as shareService from "../../../../src/server/services/shareService";

async function handler(request: ApiRequest, response: ApiResponse) {
  const listId = getQueryParam(request, "listId");

  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "GET") {
      const shares = await shareService.getShares(listId, authUser.id);
      sendSuccess(response, 200, shares);
      return;
    }

    if (request.method === "POST") {
      const share = await shareService.createShare(listId, { ...getBody(request), userId: authUser.id });
      sendSuccess(response, 201, share, "Lista compartilhada");
      return;
    }

    methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
