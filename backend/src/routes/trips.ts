import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { CreateTripSchema, CompleteTripSchema } from '../validators';
import { broadcast } from '../utils/sse';
import { createNotification } from '../utils/notifications';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// ─── Business Rule Validators ─────────────────────────────────────────────────

export async function validateVehicleForTrip(vehicleId: string, excludeTripId?: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { error: 'Vehicle not found' };

  // Rule 2: Retired or In Shop vehicles cannot be dispatched
  if (vehicle.status === 'RETIRED') {
    return { error: `Vehicle "${vehicle.registrationNumber}" is RETIRED and cannot be assigned to trips` };
  }
  if (vehicle.status === 'IN_SHOP') {
    return { error: `Vehicle "${vehicle.registrationNumber}" is IN_SHOP and cannot be assigned to trips` };
  }

  // Rule 4: Vehicle already On Trip cannot be assigned to another trip
  if (vehicle.status === 'ON_TRIP') {
    // Check if this is for the same trip (update scenario)
    if (excludeTripId) {
      const existingTrip = await prisma.trip.findFirst({
        where: { vehicleId, status: 'DISPATCHED', id: { not: excludeTripId } },
      });
      if (existingTrip) {
        return { error: `Vehicle "${vehicle.registrationNumber}" is already ON_TRIP and cannot be assigned to another trip` };
      }
    } else {
      return { error: `Vehicle "${vehicle.registrationNumber}" is already ON_TRIP and cannot be assigned to another trip` };
    }
  }

  return { vehicle };
}

export async function validateDriverForTrip(driverId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { error: 'Driver not found' };

  // Rule 3: Suspended drivers cannot be assigned
  if (driver.status === 'SUSPENDED') {
    return { error: `Driver "${driver.name}" is SUSPENDED and cannot be assigned to trips` };
  }

  // Rule 3: Expired license drivers cannot be assigned
  if (new Date(driver.licenseExpiryDate) < new Date()) {
    return {
      error: `Driver "${driver.name}" has an EXPIRED license (expired ${new Date(driver.licenseExpiryDate).toLocaleDateString()}) and cannot be assigned to trips`,
    };
  }

  // Rule 4: Driver already On Trip cannot be assigned to another trip
  if (driver.status === 'ON_TRIP') {
    return { error: `Driver "${driver.name}" is already ON_TRIP and cannot be assigned to another trip` };
  }

  return { driver };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/trips
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = req.query.search as string;
  const status = req.query.status as any;
  const dateStart = req.query.dateStart as string;
  const dateEnd = req.query.dateEnd as string;

  const where: any = {};
  if (search) {
    where.OR = [
      { vehicle: { registrationNumber: { contains: search, mode: 'insensitive' } } },
      { driver: { name: { contains: search, mode: 'insensitive' } } },
      { source: { contains: search, mode: 'insensitive' } },
      { destination: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && status !== 'ALL') where.status = status;
  if (dateStart || dateEnd) {
    where.createdAt = {};
    if (dateStart) where.createdAt.gte = new Date(dateStart);
    if (dateEnd) where.createdAt.lte = new Date(dateEnd);
  }

  const total = await prisma.trip.count({ where });
  const trips = await prisma.trip.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true, type: true } },
      driver: { select: { id: true, name: true, licenseCategory: true } },
    },
  });

  res.json({
    data: trips,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
    include: {
      vehicle: true,
      driver: true,
    },
  });

  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json(trip);
});

// POST /api/trips — Create trip (status = DRAFT)
router.post('/', async (req, res) => {
  const parse = CreateTripSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { vehicleId, driverId, cargoWeight, ...rest } = parse.data;

  // Validate vehicle
  const vehicleResult = await validateVehicleForTrip(vehicleId);
  if (vehicleResult.error) {
    res.status(400).json({ error: vehicleResult.error });
    return;
  }

  // Validate driver
  const driverResult = await validateDriverForTrip(driverId);
  if (driverResult.error) {
    res.status(400).json({ error: driverResult.error });
    return;
  }

  // Rule 5: Cargo weight must not exceed vehicle's max load capacity
  if (cargoWeight > vehicleResult.vehicle!.maxLoadCapacity) {
    res.status(400).json({
      error: `Cargo weight (${cargoWeight} kg) exceeds the vehicle's maximum load capacity (${vehicleResult.vehicle!.maxLoadCapacity} kg)`,
    });
    return;
  }

  const trip = await prisma.trip.create({
    data: { vehicleId, driverId, cargoWeight, ...rest, status: 'DRAFT' },
    include: { vehicle: true, driver: true },
  });

  broadcast('invalidate', { keys: ['trips', 'dashboard'] });

  res.status(201).json(trip);
});

// POST /api/trips/:id/dispatch — DRAFT → DISPATCHED
router.post('/:id/dispatch', async (req, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
    include: { vehicle: true, driver: true },
  });

  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.status !== 'DRAFT') {
    res.status(400).json({ error: `Cannot dispatch a trip with status "${trip.status}". Only DRAFT trips can be dispatched.` });
    return;
  }

  // Re-validate vehicle (race condition protection — Rule 4)
  const vehicleResult = await validateVehicleForTrip(trip.vehicleId, trip.id);
  if (vehicleResult.error) {
    res.status(400).json({ error: vehicleResult.error });
    return;
  }

  // Re-validate driver (race condition protection — Rule 3, 4)
  const driverResult = await validateDriverForTrip(trip.driverId);
  if (driverResult.error) {
    res.status(400).json({ error: driverResult.error });
    return;
  }

  // Re-check cargo weight (Rule 5)
  if (trip.cargoWeight > vehicleResult.vehicle!.maxLoadCapacity) {
    res.status(400).json({
      error: `Cargo weight (${trip.cargoWeight} kg) exceeds the vehicle's max load capacity (${vehicleResult.vehicle!.maxLoadCapacity} kg)`,
    });
    return;
  }

  // Rule 6: Dispatch → both vehicle and driver flip to ON_TRIP
  const [updatedTrip] = await prisma.$transaction([
    prisma.trip.update({
      where: { id: trip.id },
      data: { status: 'DISPATCHED', dispatchedAt: new Date() },
      include: { vehicle: true, driver: true },
    }),
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: 'ON_TRIP' },
    }),
    prisma.driver.update({
      where: { id: trip.driverId },
      data: { status: 'ON_TRIP' },
    }),
  ]);

  broadcast('invalidate', { keys: ['trips', 'dashboard', 'vehicles', 'drivers'] });

  res.json(updatedTrip);
});

// POST /api/trips/:id/complete — DISPATCHED → COMPLETED
router.post('/:id/complete', async (req, res) => {
  const parse = CompleteTripSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { actualDistance, fuelConsumed, finalOdometer } = parse.data;

  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
    include: { vehicle: true },
  });

  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.status !== 'DISPATCHED') {
    res.status(400).json({ error: `Cannot complete a trip with status "${trip.status}". Only DISPATCHED trips can be completed.` });
    return;
  }

  if (finalOdometer <= trip.vehicle.odometer) {
    res.status(400).json({
      error: `Final odometer (${finalOdometer} km) must be greater than current odometer (${trip.vehicle.odometer} km)`,
    });
    return;
  }

  // Rule 7: Complete → both vehicle and driver flip back to AVAILABLE
  const [updatedTrip] = await prisma.$transaction([
    prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        actualDistance,
        fuelConsumed,
      },
      include: { vehicle: true, driver: true },
    }),
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: 'AVAILABLE', odometer: finalOdometer },
    }),
    prisma.driver.update({
      where: { id: trip.driverId },
      data: { status: 'AVAILABLE' },
    }),
    // Auto-create fuel log from consumed fuel
    prisma.fuelLog.create({
      data: {
        vehicleId: trip.vehicleId,
        liters: fuelConsumed,
        cost: fuelConsumed * 2, // Estimated at £2/liter — store actual in future
        date: new Date(),
      },
    }),
  ]);

  broadcast('invalidate', { keys: ['trips', 'dashboard', 'vehicles', 'drivers'] });
  createNotification(
    'Trip Completed',
    `Trip for vehicle ${trip.vehicle.registrationNumber} has been completed.`,
    'SUCCESS'
  );

  res.json(updatedTrip);
});

// POST /api/trips/:id/cancel — DRAFT or DISPATCHED → CANCELLED
router.post('/:id/cancel', async (req, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
  });

  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }

  if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
    res.status(400).json({ error: `Cannot cancel a trip with status "${trip.status}"` });
    return;
  }

  const updates: any[] = [
    prisma.trip.update({
      where: { id: trip.id },
      data: { status: 'CANCELLED' },
      include: { vehicle: true, driver: true },
    }),
  ];

  // Rule 8: Cancel from DISPATCHED → both vehicle and driver restored to AVAILABLE
  if (trip.status === 'DISPATCHED') {
    updates.push(
      prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'AVAILABLE' },
      }),
      prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: 'AVAILABLE' },
      })
    );
  }

  const [updatedTrip] = await prisma.$transaction(updates);
  
  broadcast('invalidate', { keys: ['trips', 'dashboard', 'vehicles', 'drivers'] });
  
  res.json(updatedTrip);
});

// PUT /api/trips/:id — Update DRAFT trip
router.put('/:id', async (req, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.status !== 'DRAFT') {
    res.status(400).json({ error: 'Only DRAFT trips can be edited' });
    return;
  }

  const parse = CreateTripSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const vehicleId = parse.data.vehicleId || trip.vehicleId;
  const driverId = parse.data.driverId || trip.driverId;
  const cargoWeight = parse.data.cargoWeight || trip.cargoWeight;

  if (parse.data.vehicleId) {
    const vr = await validateVehicleForTrip(vehicleId, trip.id);
    if (vr.error) { res.status(400).json({ error: vr.error }); return; }
    if (cargoWeight > vr.vehicle!.maxLoadCapacity) {
      res.status(400).json({ error: `Cargo weight (${cargoWeight} kg) exceeds vehicle max load capacity (${vr.vehicle!.maxLoadCapacity} kg)` });
      return;
    }
  }

  if (parse.data.driverId) {
    const dr = await validateDriverForTrip(driverId);
    if (dr.error) { res.status(400).json({ error: dr.error }); return; }
  }

  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: parse.data,
    include: { vehicle: true, driver: true },
  });
  
  broadcast('invalidate', { keys: ['trips', 'dashboard'] });
  
  res.json(updated);
});

export default router;
