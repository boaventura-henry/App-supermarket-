import { withApiHandler, getBody, methodNotAllowed, sendError, sendSuccess, type ApiRequest, type ApiResponse } from "../_utils";
import { getAuthenticatedUser } from "../../src/server/auth/getAuthenticatedUser";
import { recordAudit } from "../../src/server/services/auditLogService";
import * as migrationService from "../../src/server/services/migrationService";

async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === "POST") {
      const authUser = await getAuthenticatedUser(request);
      await recordAudit({
        userId: authUser.id,
        action: "IMPORT_STARTED",
        entityType: "LocalStorageImport",
        entityId: authUser.id
      });
      try {
        const result = await migrationService.importLocalData(getBody(request), authUser);
        await recordAudit({
          userId: authUser.id,
          action: "IMPORT_COMPLETED",
          entityType: "LocalStorageImport",
          entityId: authUser.id,
          metadata: {
            importedItems:
              result.summary.listsImported +
              result.summary.productsImported +
              result.summary.priceHistoryImported +
              result.summary.passkeysImported,
            skippedItems:
              result.summary.listsSkipped +
              result.summary.productsSkipped +
              result.summary.priceHistorySkipped +
              result.summary.passkeysSkipped,
            duplicatesDetected: result.summary.duplicatesDetected
          }
        });
        sendSuccess(response, 201, result, "Importacao concluida");
      } catch (error) {
        await recordAudit({
          userId: authUser.id,
          action: "IMPORT_FAILED",
          entityType: "LocalStorageImport",
          entityId: authUser.id
        });
        throw error;
      }
      return;
    }

    methodNotAllowed(response, ["POST"]);
  } catch (error) {
    sendError(response, error);
  }
}

export default withApiHandler(handler);
