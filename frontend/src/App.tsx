import { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
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
import { FuelAndExpensesPage } from '@/pages/FuelAndExpensesPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ActiveTripPage } from '@/pages/driver/ActiveTripPage';
import { LogFuelPage } from '@/pages/driver/LogFuelPage';
import { LogMaintenancePage } from '@/pages/driver/LogMaintenancePage';
import { Sun, Moon } from 'lucide-react';

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
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="drivers/:id" element={<DriverDetailPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:id" element={<TripDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="fuel-and-expenses" element={<FuelAndExpensesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="relative min-h-screen">
          <AppContent />
          
          {/* Floating Theme Toggle in Bottom-Left Corner */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="fixed bottom-6 left-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg hover:text-foreground hover:scale-105 hover:bg-accent transition-all duration-200"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-400" />}
          </button>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
