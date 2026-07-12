import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { MaintenanceSchema } from '../validators';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/maintenance
router.get('/', async (req, res) => {
  const { vehicleId } = req.query;
  const logs = await prisma.maintenanceLog.findMany({
    where: vehicleId ? { vehicleId: vehicleId as string } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
  });
  res.json(logs);
});

// GET /api/maintenance/:id
router.get('/:id', async (req, res) => {
  const log = await prisma.maintenanceLog.findUnique({
    where: { id: req.params.id },
    include: { vehicle: true },
  });
  if (!log) { res.status(404).json({ error: 'Maintenance log not found' }); return; }
  res.json(log);
});

// POST /api/maintenance — Create open maintenance log → sets vehicle to IN_SHOP
router.post('/', async (req, res) => {
  const parse = MaintenanceSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { vehicleId, description, cost } = parse.data;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  if (vehicle.status === 'ON_TRIP') {
    res.status(400).json({ error: `Vehicle "${vehicle.registrationNumber}" is currently ON_TRIP. Cannot create maintenance log.` });
    return;
  }

  if (vehicle.status === 'RETIRED') {
    res.status(400).json({ error: `Vehicle "${vehicle.registrationNumber}" is RETIRED. Cannot create maintenance log.` });
    return;
  }

  // Create log + flip vehicle to IN_SHOP atomically
  const [log] = await prisma.$transaction([
    prisma.maintenanceLog.create({
      data: { vehicleId, description, cost, status: 'OPEN' },
      include: { vehicle: true },
    }),
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'IN_SHOP' },
    }),
  ]);

  res.status(201).json(log);
});

// POST /api/maintenance/:id/close — Close log → restore vehicle to AVAILABLE (unless RETIRED)
router.post('/:id/close', async (req, res) => {
  const log = await prisma.maintenanceLog.findUnique({
    where: { id: req.params.id },
    include: { vehicle: true },
  });

  if (!log) {
    res.status(404).json({ error: 'Maintenance log not found' });
    return;
  }
  if (log.status === 'CLOSED') {
    res.status(400).json({ error: 'Maintenance log is already closed' });
    return;
  }

  // Determine what status to restore vehicle to
  const targetVehicleStatus = log.vehicle.status === 'RETIRED' ? 'RETIRED' : 'AVAILABLE';

  // Check if there are other OPEN maintenance logs for this vehicle
  const otherOpenLogs = await prisma.maintenanceLog.count({
    where: {
      vehicleId: log.vehicleId,
      status: 'OPEN',
      id: { not: log.id },
    },
  });

  const vehicleUpdateStatus = otherOpenLogs > 0 ? 'IN_SHOP' : targetVehicleStatus;

  const [updatedLog] = await prisma.$transaction([
    prisma.maintenanceLog.update({
      where: { id: log.id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { vehicle: true },
    }),
    prisma.vehicle.update({
      where: { id: log.vehicleId },
      data: { status: vehicleUpdateStatus },
    }),
  ]);

  res.json(updatedLog);
});

// PUT /api/maintenance/:id — Update an OPEN maintenance log
router.put('/:id', async (req, res) => {
  const log = await prisma.maintenanceLog.findUnique({ where: { id: req.params.id } });
  if (!log) { res.status(404).json({ error: 'Maintenance log not found' }); return; }
  if (log.status === 'CLOSED') { res.status(400).json({ error: 'Cannot edit a closed maintenance log' }); return; }

  const { description, cost } = req.body;
  const updated = await prisma.maintenanceLog.update({
    where: { id: req.params.id },
    data: { description, cost },
    include: { vehicle: true },
  });
  res.json(updated);
});

export default router;
