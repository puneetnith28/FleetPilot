import { PrismaClient, NotificationType } from '@prisma/client';
import { broadcast } from './sse';

const prisma = new PrismaClient();

/**
 * Creates a notification in the database and broadcasts it via SSE
 */
export const createNotification = async (
  title: string,
  message: string,
  type: NotificationType = 'INFO'
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
      },
    });

    // Push the notification object to connected clients
    broadcast('notification', notification);

    return notification;
  } catch (error) {
    console.error('[Notifications] Error creating notification:', error);
    return null;
  }
};
