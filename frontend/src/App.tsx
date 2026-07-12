import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { DriverShell } from '@/components/layout/DriverShell';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { VehiclesPage } from '@/pages/VehiclesPage';
import { VehicleDetailPage } from '@/pages/VehicleDetailPage';
import { DriversPage } from '@/pages/DriversPage';
import { DriverDetailPage } from '@/pages/DriverDetailPage';
import { TripsPage } from '@/pages/TripsPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { FuelPage } from '@/pages/FuelPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ActiveTripPage } from '@/pages/driver/ActiveTripPage';
import { LogFuelPage } from '@/pages/driver/LogFuelPage';
import { LogMaintenancePage } from '@/pages/driver/LogMaintenancePage';

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  useRealtimeUpdates();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  
  if (user?.role === 'DRIVER') {
    return (
      <Routes>
        <Route path="/" element={<DriverShell />}>
          <Route index element={<Navigate to="/driver/trip" replace />} />
          <Route path="driver/trip" element={<ActiveTripPage />} />
          <Route path="driver/fuel" element={<LogFuelPage />} />
          <Route path="driver/maintenance" element={<LogMaintenancePage />} />
          <Route path="*" element={<Navigate to="/driver/trip" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="drivers/:id" element={<DriverDetailPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:id" element={<TripDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="fuel" element={<FuelPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
