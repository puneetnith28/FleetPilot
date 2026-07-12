import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/reports — All analytics in one response
router.get('/', async (_req, res) => {
  const [vehicles, trips, fuelLogs, maintenanceLogs, expenses] = await Promise.all([
    prisma.vehicle.findMany(),
    prisma.trip.findMany({ where: { status: 'COMPLETED' } }),
    prisma.fuelLog.findMany(),
    prisma.maintenanceLog.findMany(),
    prisma.expense.findMany(),
  ]);

  // ─── Per-vehicle calculations ─────────────────────────────────
  const vehicleReports = vehicles.map((vehicle) => {
    const vehicleTrips = trips.filter((t) => t.vehicleId === vehicle.id);
    const vehicleFuel = fuelLogs.filter((f) => f.vehicleId === vehicle.id);
    const vehicleMaintenance = maintenanceLogs.filter((m) => m.vehicleId === vehicle.id);
    const vehicleExpenses = expenses.filter((e) => e.vehicleId === vehicle.id);

    // Fuel efficiency = total distance / total fuel consumed
    const totalDistance = vehicleTrips.reduce((sum, t) => sum + (t.actualDistance || 0), 0);
    const totalFuelLiters = vehicleTrips.reduce((sum, t) => sum + (t.fuelConsumed || 0), 0);
    const fuelEfficiency = totalFuelLiters > 0 ? totalDistance / totalFuelLiters : 0;

    // Operational cost = fuel + maintenance + expenses
    const fuelCost = vehicleFuel.reduce((sum, f) => sum + f.cost, 0);
    const maintenanceCost = vehicleMaintenance.reduce((sum, m) => sum + m.cost, 0);
    const expenseCost = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalOperationalCost = fuelCost + maintenanceCost + expenseCost;

    // Revenue (sum of trip revenue)
    const totalRevenue = vehicleTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);

    // ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
    const roi =
      vehicle.acquisitionCost > 0
        ? ((totalRevenue - (maintenanceCost + fuelCost)) / vehicle.acquisitionCost) * 100
        : 0;

    // Fleet utilization (individual — whether it's being used or maintained)
    const isUtilized = vehicle.status === 'ON_TRIP' || vehicle.status === 'IN_SHOP';

    return {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      name: vehicle.name,
      type: vehicle.type,
      status: vehicle.status,
      region: vehicle.region,
      acquisitionCost: vehicle.acquisitionCost,
      totalTrips: vehicleTrips.length,
      totalDistance: Math.round(totalDistance),
      totalFuelLiters: Math.round(totalFuelLiters * 10) / 10,
      fuelEfficiency: Math.round(fuelEfficiency * 100) / 100, // km/L
      fuelCost: Math.round(fuelCost * 100) / 100,
      maintenanceCost: Math.round(maintenanceCost * 100) / 100,
      expenseCost: Math.round(expenseCost * 100) / 100,
      totalOperationalCost: Math.round(totalOperationalCost * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      isUtilized,
    };
  });

  // ─── Fleet-wide utilization trend (simplified — monthly) ─────
  const nonRetired = vehicles.filter((v) => v.status !== 'RETIRED');
  const utilized = vehicles.filter((v) => v.status === 'ON_TRIP' || v.status === 'IN_SHOP');
  const fleetUtilization = nonRetired.length > 0
    ? Math.round((utilized.length / nonRetired.length) * 100)
    : 0;

  res.json({
    vehicleReports,
    summary: {
      fleetUtilization,
      totalVehicles: vehicles.length,
      totalRevenue: vehicleReports.reduce((s, v) => s + v.totalRevenue, 0),
      totalOperationalCost: vehicleReports.reduce((s, v) => s + v.totalOperationalCost, 0),
      avgFuelEfficiency: (() => {
        const withEfficiency = vehicleReports.filter((v) => v.fuelEfficiency > 0);
        return withEfficiency.length > 0
          ? Math.round((withEfficiency.reduce((s, v) => s + v.fuelEfficiency, 0) / withEfficiency.length) * 100) / 100
          : 0;
      })(),
    },
  });
});

export default router;
