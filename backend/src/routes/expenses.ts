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
  const expenses = await prisma.expense.findMany({
    where: vehicleId ? { vehicleId: vehicleId as string } : undefined,
    orderBy: { date: 'desc' },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
  });
  res.json(expenses);
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
