import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { ExpenseSchema } from '../validators';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/expenses
router.get('/', async (req, res) => {
  const { vehicleId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  
  const where = vehicleId ? { vehicleId: vehicleId as string } : undefined;
  
  const total = await prisma.expense.count({ where });
  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
  });
  
  res.json({
    data: expenses,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// POST /api/expenses
router.post('/', async (req, res) => {
  const parse = ExpenseSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: parse.data.vehicleId } });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  const expense = await prisma.expense.create({
    data: {
      ...parse.data,
      date: new Date(parse.data.date),
    },
    include: { vehicle: { select: { id: true, registrationNumber: true, name: true } } },
  });
  res.status(201).json(expense);
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!expense) { res.status(404).json({ error: 'Expense not found' }); return; }
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ message: 'Expense deleted successfully' });
});

export default router;
