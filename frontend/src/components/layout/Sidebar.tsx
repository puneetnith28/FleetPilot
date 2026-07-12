import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  Receipt,
  BarChart3,
  LogOut,
  ChevronRight,
  X,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles', icon: Truck, label: 'Fleet', roles: ['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER'] },
  { to: '/drivers', icon: Users, label: 'Drivers', roles: ['FLEET_MANAGER', 'SAFETY_OFFICER', 'DRIVER'] },
  { to: '/trips', icon: Route, label: 'Trips', roles: ['FLEET_MANAGER', 'DRIVER'] },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance', roles: ['FLEET_MANAGER', 'SAFETY_OFFICER'] },
  { to: '/fuel-and-expenses', icon: Fuel, label: 'Fuel & Expenses', roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST'] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['FLEET_MANAGER'] },
];

const ROLE_LABELS: Record<string, string> = {
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
};

const ROLE_COLORS: Record<string, string> = {
  FLEET_MANAGER: 'text-blue-400',
  DRIVER: 'text-green-400',
  SAFETY_OFFICER: 'text-amber-400',
  FINANCIAL_ANALYST: 'text-purple-400',
};

export function Sidebar({ isOpen, setIsOpen }: { isOpen?: boolean; setIsOpen?: (v: boolean) => void }) {
  const { user, logout, hasRole } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.roles || hasRole(...item.roles)
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card border-r border-border transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight">FleetPilot</span>
              <p className="text-[10px] text-muted-foreground leading-none">Fleet Management</p>
            </div>
          </div>
          <button className="md:hidden" onClick={() => setIsOpen?.(false)}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </p>
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setIsOpen?.(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="h-3 w-3 text-primary" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className={cn('text-xs truncate', user?.role ? ROLE_COLORS[user.role] : 'text-muted-foreground')}>
              {user?.role ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
    </>
  );
}
