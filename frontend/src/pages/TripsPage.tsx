import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tripsApi, vehiclesApi, driversApi } from '@/lib/api';
import { Plus, Search, Eye, Loader2, AlertCircle, Route, X } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TripForm>(emptyForm);
  const [formError, setFormError] = useState('');

  const { data: trips = [], isLoading } = useQuery({ queryKey: ['trips'], queryFn: tripsApi.list });
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
      setFormError(err?.response?.data?.error || 'Failed to create trip');
    },
  });

  const filtered = trips.filter((t: any) => {
    const matchSearch =
      t.source?.toLowerCase().includes(search.toLowerCase()) ||
      t.destination?.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicle?.registrationNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (isOverCapacity) {
      setFormError(`Cargo weight (${cargoWeight} kg) exceeds this vehicle's max load capacity (${selectedVehicle.maxLoadCapacity} kg)`);
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
          <p className="text-muted-foreground text-sm mt-1">{trips.length} trips total</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setFormError(''); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Trip
        </Button>
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Route className="h-10 w-10 opacity-30" />
              <p>No trips found</p>
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
                {filtered.map((t: any) => (
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
        </CardContent>
      </Card>

      {/* Create Trip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Source / Origin *</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="London" required />
              </div>
              <div className="space-y-1.5">
                <Label>Destination *</Label>
                <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Manchester" required />
              </div>
            </div>

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
