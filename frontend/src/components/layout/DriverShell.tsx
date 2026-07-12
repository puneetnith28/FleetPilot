import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Fuel, Wrench, LogOut } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotificationBell } from './NotificationBell';

export function DriverShell() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Trip', path: '/driver/trip', icon: MapPin },
    { label: 'Fuel', path: '/driver/fuel', icon: Fuel },
    { label: 'Maintenance', path: '/driver/maintenance', icon: Wrench },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Topbar */}
      <header className="flex h-14 items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-primary">Driver Portal</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main Content Area (padding bottom to account for fixed bottom nav) */}
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col p-4 pb-28 pt-[env(safe-area-inset-top)] overflow-x-hidden">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "text-primary hover:text-primary"
                )}
              >
                <Icon className={cn("h-6 w-6 mb-0.5", isActive && "fill-primary/20")} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster />
    </div>
  );
}
