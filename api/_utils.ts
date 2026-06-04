import { AppError, toErrorResponse } from "../src/server/errors";
import type { LocalIdentity } from "../src/server/repositories/profileRepository";

export type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export function getIdentity(request: ApiRequest): LocalIdentity {
  const legacyId = getHeader(request, "x-superlist-user-id");
  const email = getHeader(request, "x-superlist-user-email");
  const name = getHeader(request, "x-superlist-user-name");

  if (!legacyId || !email || !name) {
    throw new AppError(400, "Identidade local incompleta.");
  }

  return { legacyId, email, name };
}

export function getQueryParam(request: ApiRequest, name: string) {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function getBody(request: ApiRequest) {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body) as Record<string, unknown>;
    } catch {
      throw new AppError(400, "JSON invalido.");
    }
  }

  if (typeof request.body === "object" && request.body !== null && !Array.isArray(request.body)) {
    return request.body as Record<string, unknown>;
  }

  return {};
}

export function sendSuccess(response: ApiResponse, statusCode: 200 | 201, data: unknown, message = "OK") {
  response.status(statusCode).json({ success: true, message, data });
}

export function sendError(response: ApiResponse, error: unknown) {
  const { statusCode, body } = toErrorResponse(error);
  response.status(statusCode).json(body);
}

export function methodNotAllowed(response: ApiResponse, allowed: string[]) {
  response.setHeader("Allow", allowed.join(", "));
  response.status(405).json({ success: false, message: "Metodo nao permitido" });
}

function getHeader(request: ApiRequest, name: string) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return undefined;
  }

  try {
    return decodeURIComponent(normalized);
  } catch {
    throw new AppError(400, "Identidade local invalida.");
  }
}
