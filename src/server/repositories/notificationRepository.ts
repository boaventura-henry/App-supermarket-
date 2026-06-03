import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../prisma";

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  readAt: true,
  metadata: true,
  createdAt: true
} as const;

export type NotificationRecord = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

export type NotificationCreateInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function findAllByUser(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: notificationSelect
  });
}

export async function create(input: NotificationCreateInput) {
  return prisma.notification.create({
    data: input,
    select: notificationSelect
  });
}

export async function markAsRead(id: string, userId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true }
  });

  if (!existing) {
    return null;
  }

  return prisma.notification.update({
    where: { id: existing.id },
    data: { readAt: new Date() },
    select: notificationSelect
  });
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() }
  });

  return { count: result.count };
}
