import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { DriverSchema, DriverUpdateSchema } from '../validators';
import { broadcast } from '../utils/sse';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/drivers
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = req.query.search as string;
  const status = req.query.status as any;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && status !== 'ALL') where.status = status;

  const total = await prisma.driver.count({ where });
  const drivers = await prisma.driver.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  res.json({
    data: drivers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
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
  
  broadcast('invalidate', { keys: ['drivers', 'dashboard'] });
  
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
  
  broadcast('invalidate', { keys: ['drivers', 'dashboard'] });
  
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

  try {
    await prisma.driver.delete({ where: { id: req.params.id } });
    
    broadcast('invalidate', { keys: ['drivers', 'dashboard'] });
    
    res.json({ message: 'Driver deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Cannot delete driver because they have historical records (trips). Please set status to SUSPENDED instead.' });
    } else {
      res.status(500).json({ error: 'Failed to delete driver' });
    }
  }
});

export default router;
