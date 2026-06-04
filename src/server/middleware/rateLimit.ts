import { AppError } from "../errors";
import type { RequestContext } from "../http/requestContext";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();
const DEFAULT_WINDOW_MS = 60_000;

export function enforceRequestRateLimit(context: RequestContext) {
  const { limit, scope } = resolvePolicy(context);
  const identity = context.ip ?? "unknown";
  consume(`${scope}:ip:${identity}`, limit);
}

export function enforceAuthenticatedRateLimit(context: RequestContext, userId: string) {
  const { limit, scope } = resolvePolicy(context);
  consume(`${scope}:user:${userId}`, limit * 2);
}

function consume(key: string, limit: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + DEFAULT_WINDOW_MS });
    cleanupExpiredBuckets(now);
    return;
  }

  if (current.count >= limit) {
    throw new AppError(429, "Muitas solicitacoes. Aguarde um momento e tente novamente.");
  }

  current.count += 1;
}

function resolvePolicy(context: RequestContext) {
  const endpoint = context.endpoint.toLowerCase();
  const method = context.method.toUpperCase();

  if (endpoint.includes("/migration/") || endpoint.includes("/invites")) {
    return { scope: `${method}:${endpoint}`, limit: 15 };
  }
  if (method === "GET") {
    return { scope: `${method}:${endpoint}`, limit: 240 };
  }
  return { scope: `${method}:${endpoint}`, limit: 90 };
}

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < 2_000) {
    return;
  }
  for (const [key, value] of buckets) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
