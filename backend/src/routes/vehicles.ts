import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { VehicleSchema, VehicleUpdateSchema } from '../validators';

const router = Router();
const prisma = new PrismaClient();

// All vehicle routes require auth
router.use(requireAuth);

// GET /api/vehicles
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = req.query.search as string;
  const status = req.query.status as any;
  const type = req.query.type as string;

  const where: any = {};
  if (search) {
    where.OR = [
      { registrationNumber: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && status !== 'ALL') where.status = status;
  if (type && type !== 'ALL') where.type = type;

  const total = await prisma.vehicle.count({ where });
  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      _count: { select: { trips: true, maintenanceLogs: true } },
    },
  });

  res.json({
    data: vehicles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/vehicles/:id
router.get('/:id', async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: {
      trips: {
        include: { driver: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      maintenanceLogs: { orderBy: { createdAt: 'desc' } },
      fuelLogs: { orderBy: { date: 'desc' }, take: 10 },
      expenses: { orderBy: { date: 'desc' }, take: 10 },
    },
  });

  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json(vehicle);
});

// POST /api/vehicles
router.post('/', async (req, res) => {
  const parse = VehicleSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const existing = await prisma.vehicle.findUnique({
    where: { registrationNumber: parse.data.registrationNumber },
  });
  if (existing) {
    res.status(409).json({ error: `Registration number "${parse.data.registrationNumber}" is already in use` });
    return;
  }

  const vehicle = await prisma.vehicle.create({ data: parse.data as any });
  res.status(201).json(vehicle);
});

// PUT /api/vehicles/:id
router.put('/:id', async (req, res) => {
  const parse = VehicleUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  // Check duplicate registration number if it's being changed
  if (parse.data.registrationNumber && parse.data.registrationNumber !== existing.registrationNumber) {
    const duplicate = await prisma.vehicle.findUnique({
      where: { registrationNumber: parse.data.registrationNumber },
    });
    if (duplicate) {
      res.status(409).json({ error: `Registration number "${parse.data.registrationNumber}" is already in use` });
      return;
    }
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: parse.data as any,
  });
  res.json(vehicle);
});

// DELETE /api/vehicles/:id
router.delete('/:id', async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  if (vehicle.status === 'ON_TRIP') {
    res.status(400).json({ error: 'Cannot delete a vehicle that is currently on a trip' });
    return;
  }

  await prisma.vehicle.delete({ where: { id: req.params.id } });
  res.json({ message: 'Vehicle deleted successfully' });
});

export default router;
