import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// Middleware to ensure user is a DRIVER
router.use((req, res, next) => {
  if ((req as any).user.role !== 'DRIVER') {
    res.status(403).json({ error: 'Access denied: Must be a DRIVER' });
    return;
  }
  next();
});

// GET /api/driver-portal/me
router.get('/me', async (req, res) => {
  const userId = (req as any).user.id;
  const driver = await prisma.driver.findUnique({
    where: { userId },
  });

  if (!driver) {
    res.status(404).json({ error: 'Driver profile not found or linked to this user' });
    return;
  }

  res.json(driver);
});

// GET /api/driver-portal/active-trip
router.get('/active-trip', async (req, res) => {
  const userId = (req as any).user.id;
  
  const driver = await prisma.driver.findUnique({
    where: { userId },
  });

  if (!driver) {
    res.status(404).json({ error: 'Driver profile not linked' });
    return;
  }

  // Find the currently dispatched trip for this driver
  const activeTrip = await prisma.trip.findFirst({
    where: {
      driverId: driver.id,
      status: 'DISPATCHED',
    },
    include: {
      vehicle: true,
      driver: true,
    }
  });

  res.json(activeTrip); // returns null if no active trip
});

export default router;
