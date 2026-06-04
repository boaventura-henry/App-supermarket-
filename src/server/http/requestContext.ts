import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type RequestLike = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
};

export type RequestContext = {
  requestId: string;
  method: string;
  endpoint: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(request: RequestLike): RequestContext {
  const incomingRequestId = getHeader(request, "x-request-id");
  return {
    requestId: normalizeRequestId(incomingRequestId) ?? randomUUID(),
    method: request.method ?? "UNKNOWN",
    endpoint: request.url?.split("?")[0] ?? "unknown",
    ip: getClientIp(request),
    userAgent: getHeader(request, "user-agent")
  };
}

export function runWithRequestContext<T>(context: RequestContext, callback: () => Promise<T>) {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext() {
  return requestContextStorage.getStore();
}

export function setRequestUser(userId: string) {
  const context = getRequestContext();
  if (context) {
    context.userId = userId;
  }
}

function getClientIp(request: RequestLike) {
  const forwarded = getHeader(request, "x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || getHeader(request, "x-real-ip");
}

function getHeader(request: RequestLike, name: string) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()] ?? request.headers?.[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRequestId(value?: string) {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return /^[a-zA-Z0-9_.:-]{1,128}$/.test(normalized) ? normalized : null;
}
