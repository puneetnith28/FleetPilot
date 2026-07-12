import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { FuelLogSchema } from '../validators';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/fuel
router.get('/', async (req, res) => {
  const { vehicleId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  
  const where = vehicleId ? { vehicleId: vehicleId as string } : undefined;
  
  const total = await prisma.fuelLog.count({ where });
  const logs = await prisma.fuelLog.findMany({
    where,
    orderBy: { date: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
  });
  
  res.json({
    data: logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// POST /api/fuel
router.post('/', async (req, res) => {
  const parse = FuelLogSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: parse.data.vehicleId } });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  const log = await prisma.fuelLog.create({
    data: {
      ...parse.data,
      date: new Date(parse.data.date),
    },
    include: { vehicle: { select: { id: true, registrationNumber: true, name: true } } },
  });
  res.status(201).json(log);
});

// DELETE /api/fuel/:id
router.delete('/:id', async (req, res) => {
  const log = await prisma.fuelLog.findUnique({ where: { id: req.params.id } });
  if (!log) { res.status(404).json({ error: 'Fuel log not found' }); return; }
  await prisma.fuelLog.delete({ where: { id: req.params.id } });
  res.json({ message: 'Fuel log deleted successfully' });
});

export default router;
