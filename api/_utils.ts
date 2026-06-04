import { AppError, toErrorResponse } from "../src/server/errors";
import { createRequestContext, runWithRequestContext } from "../src/server/http/requestContext";
import { logger } from "../src/server/logger";
import { enforceRequestRateLimit } from "../src/server/middleware/rateLimit";

export type ApiRequest = {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export type ApiHandler = (request: ApiRequest, response: ApiResponse) => Promise<void>;

const MAX_BODY_BYTES = 256 * 1024;

export function withApiHandler(handler: ApiHandler): ApiHandler {
  return async (request, response) => {
    const context = createRequestContext(request);
    const startedAt = Date.now();
    let statusCode = 200;
    const originalStatus = response.status.bind(response);
    const originalJson = response.json.bind(response);

    response.setHeader("x-request-id", context.requestId);
    response.status = (code: number) => {
      statusCode = code;
      originalStatus(code);
      return response;
    };
    response.json = (body: unknown) => {
      originalJson(appendRequestId(body, context.requestId));
    };

    await runWithRequestContext(context, async () => {
      logger.info("api.request.started");
      try {
        enforceRequestRateLimit(context);
        await handler(request, response);
      } catch (error) {
        sendError(response, error);
      } finally {
        logger.info("api.request.completed", {
          status: statusCode,
          durationMs: Date.now() - startedAt
        });
      }
    });
  };
}

export function getQueryParam(request: ApiRequest, name: string) {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function getBody(request: ApiRequest) {
  if (typeof request.body === "string") {
    if (request.body.length > MAX_BODY_BYTES) {
      throw new AppError(413, "Payload muito grande.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(request.body) as unknown;
    } catch {
      throw new AppError(400, "Payload JSON invalido.");
    }
    if (!isRecord(parsed)) {
      throw new AppError(400, "Payload invalido.");
    }
    return parsed;
  }

  if (request.body === undefined || request.body === null) {
    return {};
  }
  if (!isRecord(request.body)) {
    throw new AppError(400, "Payload invalido.");
  }
  if (JSON.stringify(request.body).length > MAX_BODY_BYTES) {
    throw new AppError(413, "Payload muito grande.");
  }
  return request.body;
}

export function sendSuccess(response: ApiResponse, statusCode: 200 | 201, data: unknown, message = "OK") {
  response.status(statusCode).json({
    success: true,
    message,
    data
  });
}

export function sendError(response: ApiResponse, error: unknown) {
  logger.error("api.request.failed", error);
  const { statusCode, body } = toErrorResponse(error);
  response.status(statusCode).json(body);
}

export function methodNotAllowed(response: ApiResponse, allowed: string[]) {
  response.setHeader("Allow", allowed.join(", "));
  response.status(405).json({
    success: false,
    message: "Metodo nao permitido"
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function appendRequestId(body: unknown, requestId: string) {
  return isRecord(body) ? { ...body, requestId } : body;
}
