import { AppError } from "../errors";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireIdentifier(value: unknown, message: string) {
  return requireText(value, message, 160);
}

export function requireText(value: unknown, message: string, maxLength = 160) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, message);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new AppError(400, `O campo deve ter no maximo ${maxLength} caracteres.`);
  }
  return normalized;
}

export function optionalText(value: unknown, message: string, maxLength = 160) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (typeof value !== "string") {
    throw new AppError(400, message);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new AppError(400, `O campo deve ter no maximo ${maxLength} caracteres.`);
  }
  return normalized;
}

export function requireEmail(value: unknown, message = "Informe um e-mail valido.") {
  const email = requireText(value, message, 254).toLowerCase();
  if (!emailPattern.test(email)) {
    throw new AppError(400, message);
  }
  return email;
}

export function parsePageLimit(value: unknown, fallback: number, maximum: number) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new AppError(400, `Informe limit entre 1 e ${maximum}.`);
  }
  return parsed;
}
