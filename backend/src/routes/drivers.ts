import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { DriverSchema, DriverUpdateSchema } from '../validators';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/drivers
router.get('/', async (_req, res) => {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(drivers);
});

// GET /api/drivers/:id
router.get('/:id', async (req, res) => {
  const driver = await prisma.driver.findUnique({
    where: { id: req.params.id },
    include: {
      trips: { orderBy: { createdAt: 'desc' }, take: 10, include: { vehicle: true } },
    },
  });

  if (!driver) {
    res.status(404).json({ error: 'Driver not found' });
    return;
  }
  res.json(driver);
});

// POST /api/drivers
router.post('/', async (req, res) => {
  const parse = DriverSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const existing = await prisma.driver.findUnique({ where: { licenseNumber: parse.data.licenseNumber } });
  if (existing) {
    res.status(409).json({ error: `License number "${parse.data.licenseNumber}" is already registered` });
    return;
  }

  const driver = await prisma.driver.create({
    data: {
      ...parse.data,
      licenseExpiryDate: new Date(parse.data.licenseExpiryDate),
    } as any,
  });
  res.status(201).json(driver);
});

// PUT /api/drivers/:id
router.put('/:id', async (req, res) => {
  const parse = DriverUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Driver not found' });
    return;
  }

  // Check duplicate license if changed
  if (parse.data.licenseNumber && parse.data.licenseNumber !== existing.licenseNumber) {
    const duplicate = await prisma.driver.findUnique({ where: { licenseNumber: parse.data.licenseNumber } });
    if (duplicate) {
      res.status(409).json({ error: `License number "${parse.data.licenseNumber}" is already registered` });
      return;
    }
  }

  const updateData: any = { ...parse.data };
  if (parse.data.licenseExpiryDate) {
    updateData.licenseExpiryDate = new Date(parse.data.licenseExpiryDate);
  }

  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: updateData,
  });
  res.json(driver);
});

// DELETE /api/drivers/:id
router.delete('/:id', async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!driver) {
    res.status(404).json({ error: 'Driver not found' });
    return;
  }

  if (driver.status === 'ON_TRIP') {
    res.status(400).json({ error: 'Cannot delete a driver who is currently on a trip' });
    return;
  }

  await prisma.driver.delete({ where: { id: req.params.id } });
  res.json({ message: 'Driver deleted successfully' });
});

export default router;
