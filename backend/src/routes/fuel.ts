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
  const logs = await prisma.fuelLog.findMany({
    where: vehicleId ? { vehicleId: vehicleId as string } : undefined,
    orderBy: { date: 'desc' },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
  });
  res.json(logs);
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
