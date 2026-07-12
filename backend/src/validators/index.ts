import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const SignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']),
});

// ─── Vehicle ────────────────────────────────────────────────────
export const VehicleSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required').toUpperCase(),
  name: z.string().min(1, 'Vehicle name/model is required'),
  type: z.string().min(1, 'Vehicle type is required'),
  maxLoadCapacity: z.number().positive('Max load capacity must be positive'),
  odometer: z.number().min(0, 'Odometer cannot be negative').default(0),
  acquisitionCost: z.number().positive('Acquisition cost must be positive'),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED']).default('AVAILABLE'),
  region: z.string().optional(),
});

export const VehicleUpdateSchema = VehicleSchema.partial();

// ─── Driver ─────────────────────────────────────────────────────
export const DriverSchema = z.object({
  name: z.string().min(1, 'Driver name is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseCategory: z.string().min(1, 'License category is required'),
  licenseExpiryDate: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid date' }),
  contactNumber: z.string().min(1, 'Contact number is required'),
  safetyScore: z.number().min(0).max(100).default(100),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED']).default('AVAILABLE'),
});

export const DriverUpdateSchema = DriverSchema.partial();

// ─── Trip ───────────────────────────────────────────────────────
export const CreateTripSchema = z.object({
  source: z.string().min(1, 'Source location is required'),
  destination: z.string().min(1, 'Destination is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  cargoWeight: z.number().positive('Cargo weight must be positive'),
  plannedDistance: z.number().positive('Planned distance must be positive'),
  revenue: z.number().min(0).optional(),
});

export const CompleteTripSchema = z.object({
  actualDistance: z.number().positive('Actual distance must be positive'),
  fuelConsumed: z.number().positive('Fuel consumed must be positive'),
  finalOdometer: z.number().positive('Final odometer must be positive'),
});

// ─── Maintenance ────────────────────────────────────────────────
export const MaintenanceSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  description: z.string().min(1, 'Description is required'),
  cost: z.number().min(0, 'Cost cannot be negative'),
});

// ─── Fuel Log ───────────────────────────────────────────────────
export const FuelLogSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  liters: z.number().positive('Liters must be positive'),
  cost: z.number().positive('Cost must be positive'),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid date' }),
});

// ─── Expense ────────────────────────────────────────────────────
export const ExpenseSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: z.enum(['TOLL', 'MISC', 'MAINTENANCE']),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid date' }),
  description: z.string().min(1, 'Description is required'),
});
