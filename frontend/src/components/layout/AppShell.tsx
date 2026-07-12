import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Menu, Truck, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from './GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
      
      <main className="flex-1 w-full md:ml-64 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">FleetPilot</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
              <SearchIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Desktop Header / Topbar */}
        <div className="hidden md:flex h-16 items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <Button 
            variant="outline" 
            className="w-64 justify-start text-muted-foreground gap-2 bg-background/50 hover:bg-background/80" 
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon className="h-4 w-4" />
            <span>Search vehicles, drivers...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Welcome back, <span className="font-semibold text-foreground">{user?.name}</span></span>
          </div>
        </div>
        <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto flex-1 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
