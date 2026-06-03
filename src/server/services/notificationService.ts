import type { NotificationType, Prisma } from "@prisma/client";
import { resolveUserId } from "../auth/listPermissions";
import { AppError } from "../errors";
import * as notificationRepository from "../repositories/notificationRepository";
import type { NotificationRecord } from "../repositories/notificationRepository";

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function getNotifications(userId: unknown) {
  const user = await resolveUserId(requireString(userId, "Informe o userId."));
  const notifications = await notificationRepository.findAllByUser(user.id);
  return notifications.map(mapNotification);
}

export async function createNotification(userId: string, payload: NotificationPayload) {
  return notificationRepository.create({
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    metadata: payload.metadata
  });
}

export async function markAsRead(id: unknown, userId: unknown) {
  const notificationId = requireString(id, "Informe o id da notificacao.");
  const user = await resolveUserId(requireString(userId, "Informe o userId."));
  const notification = await notificationRepository.markAsRead(notificationId, user.id);

  if (!notification) {
    throw new AppError(404, "Notificacao nao encontrada.");
  }

  return mapNotification(notification);
}

export async function markAllAsRead(userId: unknown) {
  const user = await resolveUserId(requireString(userId, "Informe o userId."));
  return notificationRepository.markAllAsRead(user.id);
}

function mapNotification(notification: NotificationRecord) {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt?.toISOString() ?? null,
    metadata: notification.metadata,
    createdAt: notification.createdAt.toISOString()
  };
}

function requireString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, message);
  }
  return value.trim();
}
