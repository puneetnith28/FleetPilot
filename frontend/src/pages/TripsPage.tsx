import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tripsApi, vehiclesApi, driversApi } from '@/lib/api';
import { Plus, Search, Loader2, AlertCircle, MapPin, Navigation, SendHorizonal, Eye, Route, X, Download, FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { exportCSV, exportPDF } from '@/lib/exportUtils';
import { geocode, calculateRoute, RoutingResult } from '@/lib/routing';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatDate, formatDateTime, isLicenseExpired } from '@/lib/utils';

type TripStatus = 'DRAFT' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';

const STATUS_VARIANT: Record<TripStatus, any> = {
  DRAFT: 'gray',
  DISPATCHED: 'blue',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

const FUEL_FACTOR_MAP: Record<string, number> = {
  VAN: 8,
  TRUCK: 15,
  BUS: 12,
  CAR: 5,
  TRAILER: 18,
  OTHER: 10,
};
const getFuelFactor = (type?: string) => type && FUEL_FACTOR_MAP[type] ? FUEL_FACTOR_MAP[type] : 10;

interface TripForm {
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: string;
  plannedDistance: string;
  revenue: string;
}

const emptyForm: TripForm = {
  source: '',
  destination: '',
  vehicleId: '',
  driverId: '',
  cargoWeight: '',
  plannedDistance: '',
  revenue: '',
};

export function TripsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TripForm>(emptyForm);
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const { data: tripsResponse, isLoading } = useQuery({
    queryKey: ['trips', page, search, filterStatus, dateStart, dateEnd],
    queryFn: () => tripsApi.list({ page, limit: 10, search, status: filterStatus, dateStart, dateEnd }),
    refetchInterval: 15000,
  });
  const trips = tripsResponse?.data || [];
  const total = tripsResponse?.total || 0;
  const totalPages = tripsResponse?.totalPages || 1;
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehiclesApi.list });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: driversApi.list });

  // Only available vehicles and valid drivers for trip creation
  const availableVehicles = vehicles.filter((v: any) => v.status === 'AVAILABLE');
  const eligibleDrivers = drivers.filter(
    (d: any) =>
      d.status === 'AVAILABLE' &&
      !isLicenseExpired(d.licenseExpiryDate) &&
      d.status !== 'SUSPENDED'
  );

  // Get selected vehicle for cargo validation preview
  const selectedVehicle = vehicles.find((v: any) => v.id === form.vehicleId);
  const cargoWeight = parseFloat(form.cargoWeight);
  const isOverCapacity =
    selectedVehicle && cargoWeight > 0 && cargoWeight > selectedVehicle.maxLoadCapacity;

  const createMutation = useMutation({
    mutationFn: tripsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      setDialogOpen(false);
      toast({ title: 'Trip created (DRAFT)', variant: 'success' });
    },
    onError: (err: any) => {
      toast({ 
        title: 'Failed to create trip', 
        description: err?.response?.data?.error || 'An unexpected error occurred.',
        variant: 'destructive' 
      });
    },
  });

  const handleCalculateRoute = async () => {
    if (!form.source || !form.destination) {
      toast({ title: 'Missing locations', description: 'Please enter both source and destination.', variant: 'destructive' });
      return;
    }
    
    setIsCalculatingRoute(true);
    setRoutingResult(null);
    
    try {
      const start = await geocode(form.source);
      const end = await geocode(form.destination);
      
      if (!start || !end) {
        toast({ title: 'Geocoding failed', description: 'Could not find one or both locations.', variant: 'destructive' });
        setIsCalculatingRoute(false);
        return;
      }
      
      const result = await calculateRoute(start, end);
      if (result) {
        setRoutingResult(result);
        setForm({ ...form, plannedDistance: Math.round(result.distanceKm).toString() });
        toast({ title: 'Route calculated!', description: `Distance: ${Math.round(result.distanceKm)} km.`, variant: 'success' });
      } else {
        toast({ title: 'Routing failed', description: 'Could not calculate route between these locations.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Routing error', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
    
    setIsCalculatingRoute(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cargoWeight <= 0) {
      toast({ title: 'Invalid Cargo Weight', description: 'Cargo weight must be greater than zero.', variant: 'destructive' });
      return;
    }
    
    if (isOverCapacity) {
      toast({ 
        title: 'Capacity Exceeded', 
        description: `Cargo weight (${cargoWeight} kg) exceeds this vehicle's max capacity (${selectedVehicle.maxLoadCapacity} kg)`,
        variant: 'destructive'
      });
      return;
    }
    createMutation.mutate({
      ...form,
      cargoWeight: parseFloat(form.cargoWeight),
      plannedDistance: parseFloat(form.plannedDistance),
      revenue: form.revenue ? parseFloat(form.revenue) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trip Dispatcher</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and dispatch trips in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['trips'] })}>
            <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Split-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Pane: CREATE TRIP form */}
        <Card className="lg:col-span-1 sticky top-6">
          <CardHeader>
            <CardTitle className="text-base uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Trip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>SOURCE</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Gandhinagar Depot" required />
              </div>
              <div className="space-y-1.5">
                <Label>DESTINATION *</Label>
                <div className="flex gap-2">
                  <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Ahmedabad Hub" required className="flex-1" />
                  <Button type="button" onClick={handleCalculateRoute} disabled={isCalculatingRoute || !form.source || !form.destination}>
                    {isCalculatingRoute ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

            {routingResult && (
              <div className="border border-border rounded-lg overflow-hidden h-48 relative z-0">
                <MapContainer center={routingResult.geometry[0]} zoom={6} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polyline positions={routingResult.geometry} color="hsl(var(--primary))" weight={4} />
                  <Marker position={routingResult.geometry[0]} />
                  <Marker position={routingResult.geometry[routingResult.geometry.length - 1]} />
                </MapContainer>
                {selectedVehicle && (
                  <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur border border-border px-3 py-1.5 rounded-md text-xs font-semibold z-[400] shadow-md">
                    Est. Fuel: {((routingResult.distanceKm / 100) * (selectedVehicle.maxLoadCapacity / 1000) * getFuelFactor(selectedVehicle.type)).toFixed(1)} L
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Vehicle * <span className="text-muted-foreground text-xs">(Available only)</span></Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.length === 0 && (
                    <SelectItem value="none" disabled>No available vehicles</SelectItem>
                  )}
                  {availableVehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber} — {v.name} (max {v.maxLoadCapacity.toLocaleString()} kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Driver * <span className="text-muted-foreground text-xs">(Available, valid license only)</span></Label>
              <Select value={form.driverId} onValueChange={(v) => setForm({ ...form, driverId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleDrivers.length === 0 && (
                    <SelectItem value="none" disabled>No eligible drivers</SelectItem>
                  )}
                  {eligibleDrivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.licenseCategory}) — Score: {d.safetyScore}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

              <div className="space-y-1.5">
                <Label>CARGO WEIGHT (KG)</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.cargoWeight}
                  onChange={(e) => setForm({ ...form, cargoWeight: e.target.value })}
                  placeholder="500"
                  required
                  className={isOverCapacity ? 'border-red-600 focus-visible:ring-red-600' : ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label>PLANNED DISTANCE (KM)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.plannedDistance}
                  onChange={(e) => setForm({ ...form, plannedDistance: e.target.value })}
                  placeholder="320"
                  required
                />
              </div>

              {isOverCapacity && selectedVehicle && (
                <div className="bg-red-950/40 border-l-2 border-red-500 p-3 text-sm text-red-200 mt-2 space-y-1 rounded-r-md">
                  <p>Vehicle Capacity: {selectedVehicle.maxLoadCapacity.toLocaleString()} kg</p>
                  <p>Cargo Weight: {cargoWeight.toLocaleString()} kg</p>
                  <p className="font-semibold mt-1">✗ Capacity exceeded by {(cargoWeight - selectedVehicle.maxLoadCapacity).toLocaleString()} kg - dispatch blocked</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending || !form.vehicleId || !form.driverId || isOverCapacity} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Dispatch
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setForm(emptyForm)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Pane: LIVE BOARD */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Lifecycle Stepper */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Trip Lifecycle</h3>
              <div className="flex items-center justify-between max-w-lg mx-auto relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted -z-10"></div>
                <div className="flex flex-col items-center gap-2 bg-card px-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background"><span className="text-xs font-bold text-muted-foreground">1</span></div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">Draft</span>
                </div>
                <div className="flex flex-col items-center gap-2 bg-card px-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border-2 border-background"><span className="text-xs font-bold">2</span></div>
                  <span className="text-xs font-medium text-blue-400 uppercase">Dispatched</span>
                </div>
                <div className="flex flex-col items-center gap-2 bg-card px-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border-2 border-background"><span className="text-xs font-bold">3</span></div>
                  <span className="text-xs font-medium text-green-400 uppercase">Completed</span>
                </div>
                <div className="flex flex-col items-center gap-2 bg-card px-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border-2 border-background"><span className="text-xs font-bold">4</span></div>
                  <span className="text-xs font-medium text-red-400 uppercase">Cancelled</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Board List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Board</h3>
              <div className="flex items-center gap-2">
                <Input placeholder="Search board..." className="h-8 w-48 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : trips.length === 0 ? (
              <EmptyState icon={Route} title="No trips on board" description="Adjust your filters or dispatch a new trip." />
            ) : (
              <div className="space-y-3">
                {trips.map((t: any) => (
                  <Card key={t.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Route className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold uppercase text-primary">TR-{t.id.slice(0, 4)}</span>
                            <Badge variant={STATUS_VARIANT[t.status as TripStatus]}>{t.status}</Badge>
                          </div>
                          <h4 className="font-medium mt-1">{t.source} → {t.destination}</h4>
                          <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                            <span>Vehicle: {t.vehicle?.registrationNumber || 'None'}</span>
                            <span>Driver: {t.driver?.name || 'None'}</span>
                            <span>{t.plannedDistance} km</span>
                          </div>
                        </div>
                      </div>
                      <Link to={`/trips/${t.id}`}>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Eye className="h-4 w-4" /> View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
