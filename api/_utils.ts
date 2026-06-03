import { toErrorResponse } from "../src/server/errors";

export type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export function getQueryParam(request: ApiRequest, name: string) {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function getBody(request: ApiRequest) {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return isRecord(request.body) ? request.body : {};
}

export function sendSuccess(response: ApiResponse, statusCode: 200 | 201, data: unknown, message = "OK") {
  response.status(statusCode).json({
    success: true,
    message,
    data
  });
}

export function sendError(response: ApiResponse, error: unknown) {
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
