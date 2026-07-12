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
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="h-6 w-6 text-primary" /> Trip Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{total} trips total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            const csvData = trips.map((t: any) => ({
              id: t.id,
              source: t.source,
              destination: t.destination,
              vehicle: t.vehicle?.registrationNumber,
              driver: t.driver?.name,
              cargoWeight: t.cargoWeight,
              plannedDistance: t.plannedDistance,
              status: t.status,
              createdAt: t.createdAt,
            }));
            exportCSV(csvData, 'trips.csv');
          }}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={() => {
            const columns = ['ID', 'Route', 'Vehicle', 'Driver', 'Cargo (kg)', 'Dist (km)', 'Status', 'Date'];
            const rows = trips.map((t: any) => [
              t.id.slice(0, 8),
              `${t.source} to ${t.destination}`,
              t.vehicle?.registrationNumber,
              t.driver?.name,
              t.cargoWeight,
              t.plannedDistance,
              t.status,
              formatDate(t.createdAt),
            ]);
            exportPDF('Trips Report', columns, rows, 'trips.pdf');
          }}>
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Trip
          </Button>
        </div>
      </div>
      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search source, destination, vehicle..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="DISPATCHED">Dispatched</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateStart} onChange={(e) => { setDateStart(e.target.value); setPage(1); }} />
            <span className="text-muted-foreground">-</span>
            <Input type="date" value={dateEnd} onChange={(e) => { setDateEnd(e.target.value); setPage(1); }} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : trips.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                icon={Route} 
                title="No trips found" 
                description="Adjust your filters or create a new trip to get started." 
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Planned Dist.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.source}</div>
                      <div className="text-muted-foreground text-xs">→ {t.destination}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-primary text-sm">{t.vehicle?.registrationNumber}</span>
                      <div className="text-xs text-muted-foreground">{t.vehicle?.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{t.driver?.name}</span>
                    </TableCell>
                    <TableCell>{t.cargoWeight.toLocaleString()} kg</TableCell>
                    <TableCell>{t.plannedDistance} km</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status as TripStatus]}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(t.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link to={`/trips/${t.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Trip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Source / Origin *</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="London" required />
              </div>
              <div className="space-y-1.5">
                <Label>Destination *</Label>
                <div className="flex gap-2">
                  <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Manchester" required className="flex-1" />
                  <Button type="button" onClick={handleCalculateRoute} disabled={isCalculatingRoute || !form.source || !form.destination}>
                    {isCalculatingRoute ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                  </Button>
                </div>
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
                    Est. Fuel: {((routingResult.distanceKm / 100) * (selectedVehicle.maxLoadCapacity / 1000) * 8).toFixed(1)} L
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cargo Weight (kg) *</Label>
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
                {selectedVehicle && (
                  <p className={`text-xs ${isOverCapacity ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                    {isOverCapacity
                      ? `⚠ Exceeds max capacity of ${selectedVehicle.maxLoadCapacity.toLocaleString()} kg`
                      : `Max capacity: ${selectedVehicle.maxLoadCapacity.toLocaleString()} kg`}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Planned Distance (km) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.plannedDistance}
                  onChange={(e) => setForm({ ...form, plannedDistance: e.target.value })}
                  placeholder="320"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Expected Revenue (£) <span className="text-muted-foreground text-xs">optional</span></Label>
              <Input
                type="number"
                min="0"
                value={form.revenue}
                onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                placeholder="2500"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !form.vehicleId || !form.driverId}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Trip
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
