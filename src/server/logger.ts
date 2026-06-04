import { getRequestContext } from "./http/requestContext";

type LogLevel = "info" | "warn" | "error";
type LogDetails = Record<string, unknown>;

const sensitiveKeyPattern = /authorization|cookie|password|token|secret|database_url|direct_url|service_role/i;

export const logger = {
  info(event: string, details: LogDetails = {}) {
    writeLog("info", event, details);
  },
  warn(event: string, details: LogDetails = {}) {
    writeLog("warn", event, details);
  },
  error(event: string, error: unknown, details: LogDetails = {}) {
    writeLog("error", event, {
      ...details,
      error: sanitizeError(error)
    });
  }
};

function writeLog(level: LogLevel, event: string, details: LogDetails) {
  const context = getRequestContext();
  const safeDetails = redact(details) as LogDetails;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: context?.requestId,
    userId: context?.userId,
    endpoint: context?.endpoint,
    method: context?.method,
    ...safeDetails
  };
  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

function sanitizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { name: "UnknownError", message: "Erro desconhecido" };
  }

  return {
    name: error.name,
    message: sanitizeMessage(error.message)
  };
}

function sanitizeMessage(message: string) {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/bearer\s+[a-z0-9._-]+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, 50).map(redact);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, sensitiveKeyPattern.test(key) ? "[REDACTED]" : redact(item)])
  );
}
