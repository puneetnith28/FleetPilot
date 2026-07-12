import { PrismaClient, Role, VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus, ExpenseType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FleetPilot database...');

  // ─── Users ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('fleet123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'fleet@fleetpilot.com' },
      update: {},
      create: { name: 'Alice Morgan', email: 'fleet@fleetpilot.com', passwordHash, role: Role.FLEET_MANAGER },
    }),
    prisma.user.upsert({
      where: { email: 'driver@fleetpilot.com' },
      update: {},
      create: { name: 'Alex Driver', email: 'driver@fleetpilot.com', passwordHash, role: Role.DRIVER },
    }),
    prisma.user.upsert({
      where: { email: 'safety@fleetpilot.com' },
      update: {},
      create: { name: 'Sam Safety', email: 'safety@fleetpilot.com', passwordHash, role: Role.SAFETY_OFFICER },
    }),
    prisma.user.upsert({
      where: { email: 'finance@fleetpilot.com' },
      update: {},
      create: { name: 'Fiona Finance', email: 'finance@fleetpilot.com', passwordHash, role: Role.FINANCIAL_ANALYST },
    }),
  ]);
  console.log(`✅ Created ${users.length} users`);

  // ─── Vehicles ─────────────────────────────────────────────
  const vehicles = await Promise.all([
    prisma.vehicle.upsert({
      where: { registrationNumber: 'VAN-001' },
      update: {},
      create: {
        registrationNumber: 'VAN-001', name: 'Ford Transit', type: 'VAN',
        maxLoadCapacity: 800, odometer: 45000, acquisitionCost: 35000,
        status: VehicleStatus.AVAILABLE, region: 'North',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'VAN-002' },
      update: {},
      create: {
        registrationNumber: 'VAN-002', name: 'Mercedes Sprinter', type: 'VAN',
        maxLoadCapacity: 1200, odometer: 62000, acquisitionCost: 48000,
        status: VehicleStatus.ON_TRIP, region: 'South',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'TRK-001' },
      update: {},
      create: {
        registrationNumber: 'TRK-001', name: 'Volvo FH16', type: 'TRUCK',
        maxLoadCapacity: 15000, odometer: 180000, acquisitionCost: 120000,
        status: VehicleStatus.AVAILABLE, region: 'East',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'TRK-002' },
      update: {},
      create: {
        registrationNumber: 'TRK-002', name: 'Scania R450', type: 'TRUCK',
        maxLoadCapacity: 20000, odometer: 250000, acquisitionCost: 150000,
        status: VehicleStatus.IN_SHOP, region: 'West',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'BUS-001' },
      update: {},
      create: {
        registrationNumber: 'BUS-001', name: "MAN Lion's City", type: 'BUS',
        maxLoadCapacity: 5000, odometer: 320000, acquisitionCost: 180000,
        status: VehicleStatus.RETIRED, region: 'North',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'VAN-003' },
      update: {},
      create: {
        registrationNumber: 'VAN-003', name: 'Volkswagen Crafter', type: 'VAN',
        maxLoadCapacity: 1000, odometer: 28000, acquisitionCost: 42000,
        status: VehicleStatus.AVAILABLE, region: 'East',
      },
    }),
  ]);
  console.log(`✅ Created ${vehicles.length} vehicles`);

  const [van001, van002, trk001, , , van003] = vehicles;

  // ─── Drivers ──────────────────────────────────────────────
  const drivers = await Promise.all([
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-UK-001' },
      update: {},
      create: {
        name: 'John Smith', licenseNumber: 'DL-UK-001', licenseCategory: 'B',
        licenseExpiryDate: new Date('2027-06-30'), contactNumber: '+44 7700 900001',
        safetyScore: 95, status: DriverStatus.AVAILABLE,
      },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-UK-002' },
      update: {},
      create: {
        name: 'Jane Doe', licenseNumber: 'DL-UK-002', licenseCategory: 'C',
        licenseExpiryDate: new Date('2028-09-15'), contactNumber: '+44 7700 900002',
        safetyScore: 88, status: DriverStatus.ON_TRIP,
      },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-UK-003' },
      update: {},
      create: {
        name: 'Bob Johnson', licenseNumber: 'DL-UK-003', licenseCategory: 'B+E',
        licenseExpiryDate: new Date('2026-12-01'), contactNumber: '+44 7700 900003',
        safetyScore: 72, status: DriverStatus.AVAILABLE,
      },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-UK-004' },
      update: {},
      create: {
        name: 'Alice Williams', licenseNumber: 'DL-UK-004', licenseCategory: 'B',
        licenseExpiryDate: new Date('2024-03-15'), contactNumber: '+44 7700 900004',
        safetyScore: 60, status: DriverStatus.OFF_DUTY,
      },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-UK-005' },
      update: {},
      create: {
        name: 'Charlie Brown', licenseNumber: 'DL-UK-005', licenseCategory: 'C',
        licenseExpiryDate: new Date('2027-04-20'), contactNumber: '+44 7700 900005',
        safetyScore: 40, status: DriverStatus.SUSPENDED,
      },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-UK-006' },
      update: {},
      create: {
        name: 'Diana Prince', licenseNumber: 'DL-UK-006', licenseCategory: 'C+E',
        licenseExpiryDate: new Date('2029-11-30'), contactNumber: '+44 7700 900006',
        safetyScore: 98, status: DriverStatus.AVAILABLE,
      },
    }),
  ]);
  console.log(`✅ Created ${drivers.length} drivers`);

  const [johnSmith, janeDoe, bobJohnson, , , dianaPrince] = drivers;

  // ─── Trips ────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const trips = await Promise.all([
    // Completed trip: TRK-001 / John Smith → London → Manchester
    prisma.trip.upsert({
      where: { id: 'trip-seed-001' },
      update: {},
      create: {
        id: 'trip-seed-001',
        source: 'London', destination: 'Manchester',
        vehicleId: trk001.id, driverId: johnSmith.id,
        cargoWeight: 8000, plannedDistance: 320,
        actualDistance: 325, fuelConsumed: 85,
        revenue: 4500,
        status: TripStatus.COMPLETED,
        createdAt: daysAgo(14), dispatchedAt: daysAgo(14), completedAt: daysAgo(13),
      },
    }),
    // Dispatched trip: VAN-002 / Jane Doe → Bristol → Leeds
    prisma.trip.upsert({
      where: { id: 'trip-seed-002' },
      update: {},
      create: {
        id: 'trip-seed-002',
        source: 'Bristol', destination: 'Leeds',
        vehicleId: van002.id, driverId: janeDoe.id,
        cargoWeight: 600, plannedDistance: 280,
        revenue: 1800,
        status: TripStatus.DISPATCHED,
        createdAt: daysAgo(2), dispatchedAt: daysAgo(2),
      },
    }),
    // Completed trip: VAN-001 / Bob Johnson → Cardiff → Oxford
    prisma.trip.upsert({
      where: { id: 'trip-seed-003' },
      update: {},
      create: {
        id: 'trip-seed-003',
        source: 'Cardiff', destination: 'Oxford',
        vehicleId: van001.id, driverId: bobJohnson.id,
        cargoWeight: 450, plannedDistance: 155,
        actualDistance: 160, fuelConsumed: 28,
        revenue: 1200,
        status: TripStatus.COMPLETED,
        createdAt: daysAgo(7), dispatchedAt: daysAgo(7), completedAt: daysAgo(6),
      },
    }),
    // Completed trip: TRK-001 / Diana Prince → Birmingham → Glasgow
    prisma.trip.upsert({
      where: { id: 'trip-seed-004' },
      update: {},
      create: {
        id: 'trip-seed-004',
        source: 'Birmingham', destination: 'Glasgow',
        vehicleId: trk001.id, driverId: dianaPrince.id,
        cargoWeight: 12000, plannedDistance: 480,
        actualDistance: 490, fuelConsumed: 130,
        revenue: 7200,
        status: TripStatus.COMPLETED,
        createdAt: daysAgo(30), dispatchedAt: daysAgo(30), completedAt: daysAgo(29),
      },
    }),
    // Draft trip: VAN-003 / Diana → Bath → Exeter
    prisma.trip.upsert({
      where: { id: 'trip-seed-005' },
      update: {},
      create: {
        id: 'trip-seed-005',
        source: 'Bath', destination: 'Exeter',
        vehicleId: van003.id, driverId: dianaPrince.id,
        cargoWeight: 300, plannedDistance: 90,
        revenue: 800,
        status: TripStatus.DRAFT,
        createdAt: daysAgo(1),
      },
    }),
    // Cancelled trip: VAN-001 → London → Dover
    prisma.trip.upsert({
      where: { id: 'trip-seed-006' },
      update: {},
      create: {
        id: 'trip-seed-006',
        source: 'London', destination: 'Dover',
        vehicleId: van001.id, driverId: johnSmith.id,
        cargoWeight: 200, plannedDistance: 110,
        status: TripStatus.CANCELLED,
        createdAt: daysAgo(10),
      },
    }),
  ]);
  console.log(`✅ Created ${trips.length} trips`);

  // ─── Maintenance Logs ─────────────────────────────────────
  const maintenanceLogs = await Promise.all([
    // TRK-002 OPEN — reason it's IN_SHOP
    prisma.maintenanceLog.upsert({
      where: { id: 'maint-seed-001' },
      update: {},
      create: {
        id: 'maint-seed-001',
        vehicleId: vehicles[3].id, // TRK-002
        description: 'Annual Service + Brake Pads Replacement',
        cost: 850,
        status: MaintenanceStatus.OPEN,
        createdAt: daysAgo(3),
      },
    }),
    // VAN-001 CLOSED — Oil Change
    prisma.maintenanceLog.upsert({
      where: { id: 'maint-seed-002' },
      update: {},
      create: {
        id: 'maint-seed-002',
        vehicleId: van001.id,
        description: 'Oil Change & Filter Replacement',
        cost: 120,
        status: MaintenanceStatus.CLOSED,
        createdAt: daysAgo(21), closedAt: daysAgo(20),
      },
    }),
    // TRK-001 CLOSED — Tire Rotation
    prisma.maintenanceLog.upsert({
      where: { id: 'maint-seed-003' },
      update: {},
      create: {
        id: 'maint-seed-003',
        vehicleId: trk001.id,
        description: 'Tire Rotation & Wheel Alignment',
        cost: 200,
        status: MaintenanceStatus.CLOSED,
        createdAt: daysAgo(35), closedAt: daysAgo(34),
      },
    }),
  ]);
  console.log(`✅ Created ${maintenanceLogs.length} maintenance logs`);

  // ─── Fuel Logs ────────────────────────────────────────────
  const fuelLogs = await Promise.all([
    prisma.fuelLog.create({ data: { vehicleId: trk001.id, liters: 85, cost: 170, date: daysAgo(13) } }),
    prisma.fuelLog.create({ data: { vehicleId: van001.id, liters: 28, cost: 56, date: daysAgo(6) } }),
    prisma.fuelLog.create({ data: { vehicleId: van002.id, liters: 38, cost: 76, date: daysAgo(3) } }),
    prisma.fuelLog.create({ data: { vehicleId: trk001.id, liters: 130, cost: 260, date: daysAgo(29) } }),
    prisma.fuelLog.create({ data: { vehicleId: van003.id, liters: 22, cost: 44, date: daysAgo(5) } }),
  ]);
  console.log(`✅ Created ${fuelLogs.length} fuel logs`);

  // ─── Expenses ─────────────────────────────────────────────
  const expenses = await Promise.all([
    prisma.expense.create({ data: { vehicleId: trk001.id, type: ExpenseType.TOLL, amount: 25, date: daysAgo(13), description: 'M1 Motorway toll' } }),
    prisma.expense.create({ data: { vehicleId: van001.id, type: ExpenseType.TOLL, amount: 15, date: daysAgo(6), description: 'Severn Bridge toll' } }),
    prisma.expense.create({ data: { vehicleId: vehicles[3].id, type: ExpenseType.MAINTENANCE, amount: 200, date: daysAgo(40), description: 'Parts for annual service' } }),
    prisma.expense.create({ data: { vehicleId: van003.id, type: ExpenseType.MISC, amount: 50, date: daysAgo(5), description: 'Overnight parking fees' } }),
    prisma.expense.create({ data: { vehicleId: trk001.id, type: ExpenseType.TOLL, amount: 35, date: daysAgo(29), description: 'M6 Toll road' } }),
    prisma.expense.create({ data: { vehicleId: van002.id, type: ExpenseType.MISC, amount: 80, date: daysAgo(2), description: 'Driver accommodation' } }),
  ]);
  console.log(`✅ Created ${expenses.length} expenses`);

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Fleet Manager : fleet@fleetpilot.com   / fleet123');
  console.log('  Driver        : driver@fleetpilot.com  / fleet123');
  console.log('  Safety Officer: safety@fleetpilot.com  / fleet123');
  console.log('  Finance       : finance@fleetpilot.com / fleet123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
