import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vehiclesApi, driversApi } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Truck, Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function GlobalSearch({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: vehicles, isLoading: loadingVehicles } = useQuery({ 
    queryKey: ['vehicles'], queryFn: vehiclesApi.list, enabled: open 
  });
  
  const { data: drivers, isLoading: loadingDrivers } = useQuery({ 
    queryKey: ['drivers'], queryFn: driversApi.list, enabled: open 
  });

  const handleSelect = (path: string) => {
    setOpen(false);
    setSearch('');
    navigate(path);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  const filteredVehicles = vehicles?.filter((v: any) => 
    v.registrationNumber.toLowerCase().includes(search.toLowerCase()) || 
    v.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredDrivers = drivers?.filter((d: any) => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.licenseNumber.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl">
        <div className="flex items-center px-4 py-3 border-b border-border/50">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search vehicles and drivers..." 
            className="border-0 focus-visible:ring-0 shadow-none bg-transparent text-base h-auto p-0"
            autoFocus
          />
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {(loadingVehicles || loadingDrivers) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : search && filteredVehicles.length === 0 && filteredDrivers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for "{search}"
            </div>
          ) : (
            <>
              {filteredVehicles.length > 0 && (
                <div className="mb-4">
                  <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicles</p>
                  {filteredVehicles.slice(0, 5).map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelect(`/vehicles/${v.id}`)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/80 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Truck className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{v.registrationNumber}</p>
                          <p className="text-xs text-muted-foreground">{v.name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{v.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
              
              {filteredDrivers.length > 0 && (
                <div>
                  <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drivers</p>
                  {filteredDrivers.slice(0, 5).map((d: any) => (
                    <button
                      key={d.id}
                      onClick={() => handleSelect(`/drivers/${d.id}`)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/80 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.licenseNumber}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
