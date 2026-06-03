import { getAuthenticatedUser } from "../../../../../src/server/auth/getAuthenticatedUser";
import { getBody, getQueryParam, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../../../../_utils";
import * as shareService from "../../../../../src/server/services/shareService";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const listId = getQueryParam(request, "listId");
  const shareId = getQueryParam(request, "shareId");

  try {
    const authUser = await getAuthenticatedUser(request);

    if (request.method === "PUT") {
      const share = await shareService.updateShare(listId, shareId, { ...getBody(request), userId: authUser.id });
      sendSuccess(response, 200, share, "Compartilhamento atualizado");
      return;
    }

    if (request.method === "DELETE") {
      const result = await shareService.deleteShare(listId, shareId, authUser.id);
      sendSuccess(response, 200, result, "Compartilhamento removido");
      return;
    }

    methodNotAllowed(response, ["PUT", "DELETE"]);
  } catch (error) {
    sendError(response, error);
  }
}
