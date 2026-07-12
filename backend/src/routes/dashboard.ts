import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/dashboard — Live KPI aggregation
router.get('/', async (_req, res) => {
  const [
    vehicles,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    totalDrivers,
  ] = await Promise.all([
    prisma.vehicle.findMany({ select: { status: true } }),
    prisma.trip.count({ where: { status: 'DISPATCHED' } }),
    prisma.trip.count({ where: { status: 'DRAFT' } }),
    prisma.driver.count({ where: { status: 'ON_TRIP' } }),
    prisma.driver.count({ where: { status: { not: 'SUSPENDED' } } }),
  ]);

  const totalVehicles = vehicles.length;
  const nonRetiredVehicles = vehicles.filter((v) => v.status !== 'RETIRED');
  const activeVehicles = vehicles.filter((v) => v.status === 'ON_TRIP').length;
  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const inShopVehicles = vehicles.filter((v) => v.status === 'IN_SHOP').length;
  const retiredVehicles = vehicles.filter((v) => v.status === 'RETIRED').length;

  const utilizedVehicles = vehicles.filter(
    (v) => v.status === 'ON_TRIP' || v.status === 'IN_SHOP'
  ).length;

  const fleetUtilization =
    nonRetiredVehicles.length > 0
      ? Math.round((utilizedVehicles / nonRetiredVehicles.length) * 100)
      : 0;

  // Vehicle breakdown by type
  const vehiclesByType = await prisma.vehicle.groupBy({
    by: ['type'],
    _count: { type: true },
  });

  // Recent trips
  const recentTrips = await prisma.trip.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: { select: { registrationNumber: true, name: true } },
      driver: { select: { name: true } },
    },
  });

  res.json({
    kpis: {
      totalVehicles,
      activeVehicles,
      availableVehicles,
      inShopVehicles,
      retiredVehicles,
      fleetUtilization,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      totalDrivers,
    },
    vehiclesByType: vehiclesByType.map((v) => ({ type: v.type, count: v._count.type })),
    recentTrips,
  });
});

export default router;
