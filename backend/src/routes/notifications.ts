import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { broadcast } from '../utils/sse';

const router = Router();
const prisma = new PrismaClient();

// All notification routes require auth
router.use(requireAuth);

// GET /api/notifications - Get top 50 recent notifications
router.get('/', async (_req, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { read: false },
  });

  res.json({ data: notifications, unreadCount });
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', async (_req, res) => {
  await prisma.notification.updateMany({
    where: { read: false },
    data: { read: true },
  });

  // Tell clients to invalidate notifications
  broadcast('invalidate', { keys: ['notifications'] });

  res.json({ message: 'All notifications marked as read' });
});

// PATCH /api/notifications/:id/read - Mark one as read
router.patch('/:id/read', async (req, res) => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id },
  });

  if (!notification) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { read: true },
  });

  // Tell clients to invalidate notifications
  broadcast('invalidate', { keys: ['notifications'] });

  res.json(updated);
});

export default router;
