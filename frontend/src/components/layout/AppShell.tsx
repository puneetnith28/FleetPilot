import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-6 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
