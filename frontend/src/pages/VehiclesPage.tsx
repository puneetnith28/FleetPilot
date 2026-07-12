import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Loader2, AlertCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate } from '@/lib/utils';

type VehicleStatus = 'AVAILABLE' | 'ON_TRIP' | 'IN_SHOP' | 'RETIRED';

const STATUS_VARIANT: Record<VehicleStatus, any> = {
  AVAILABLE: 'success',
  ON_TRIP: 'blue',
  IN_SHOP: 'orange',
  RETIRED: 'gray',
};

const VEHICLE_TYPES = ['VAN', 'TRUCK', 'BUS', 'CAR', 'TRAILER', 'OTHER'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

interface VehicleForm {
  registrationNumber: string;
  name: string;
  type: string;
  maxLoadCapacity: string;
  odometer: string;
  acquisitionCost: string;
  status: string;
  region: string;
}

const emptyForm: VehicleForm = {
  registrationNumber: '',
  name: '',
  type: 'VAN',
  maxLoadCapacity: '',
  odometer: '0',
  acquisitionCost: '',
  status: 'AVAILABLE',
  region: '',
};

export function VehiclesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['vehicles', page, search, filterStatus, filterType],
    queryFn: () => vehiclesApi.list({ page, limit: 10, search, status: filterStatus, type: filterType }),
    refetchInterval: 15000,
  });
  const vehicles = response?.data || [];
  const total = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingId ? vehiclesApi.update(editingId, data) : vehiclesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDialogOpen(false);
      toast({ title: editingId ? 'Vehicle updated' : 'Vehicle added', variant: 'success' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to save vehicle',
        description: err?.response?.data?.error || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteConfirm(null);
      toast({ title: 'Vehicle deleted', variant: 'default' });
    },
    onError: (err: any) => {
      toast({ title: 'Cannot delete vehicle', description: err?.response?.data?.error, variant: 'destructive' });
      setDeleteConfirm(null);
    },
  });



  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type,
      maxLoadCapacity: String(v.maxLoadCapacity),
      odometer: String(v.odometer),
      acquisitionCost: String(v.acquisitionCost),
      status: v.status,
      region: v.region || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const maxLoadCapacity = parseFloat(form.maxLoadCapacity);
    const odometer = parseFloat(form.odometer);
    const acquisitionCost = parseFloat(form.acquisitionCost);

    if (maxLoadCapacity <= 0) {
      toast({ title: 'Invalid Capacity', description: 'Max load capacity must be greater than zero.', variant: 'destructive' });
      return;
    }
    if (odometer < 0) {
      toast({ title: 'Invalid Odometer', description: 'Odometer cannot be negative.', variant: 'destructive' });
      return;
    }
    if (acquisitionCost <= 0) {
      toast({ title: 'Invalid Cost', description: 'Acquisition cost must be greater than zero.', variant: 'destructive' });
      return;
    }

    saveMutation.mutate({
      ...form,
      maxLoadCapacity,
      odometer,
      acquisitionCost,
      region: form.region || undefined,
    });
  };

  const uniqueTypes = [...new Set(vehicles.map((v: any) => v.type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Vehicle Registry
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{total} vehicles in fleet</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Vehicle
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search registration, name..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="ON_TRIP">On Trip</SelectItem>
              <SelectItem value="IN_SHOP">In Shop</SelectItem>
              <SelectItem value="RETIRED">Retired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {uniqueTypes.map((t: any) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
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
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Truck className="h-10 w-10 opacity-30" />
              <p>No vehicles found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Name / Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Max Load</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead>Acq. Cost</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-semibold text-primary">{v.registrationNumber}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{v.type}</Badge>
                    </TableCell>
                    <TableCell>{v.maxLoadCapacity.toLocaleString()} kg</TableCell>
                    <TableCell>{v.odometer.toLocaleString()} km</TableCell>
                    <TableCell>{formatCurrency(v.acquisitionCost)}</TableCell>
                    <TableCell className="text-muted-foreground">{v.region || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[v.status as VehicleStatus]}>{v.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="View Details"
                          onClick={() => navigate(`/vehicles/${v.id}`)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => openEdit(v)}
                          disabled={v.status === 'ON_TRIP'}
                          title={v.status === 'ON_TRIP' ? "Cannot edit while on trip" : "Edit"}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="hover:text-red-400"
                          onClick={() => setDeleteConfirm(v.id)}
                          disabled={v.status === 'ON_TRIP'}
                          title={v.status === 'ON_TRIP' ? "Cannot delete while on trip" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Registration Number *</Label>
                <Input
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })}
                  placeholder="VAN-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name / Model *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ford Transit"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Max Load Capacity (kg) *</Label>
                <Input
                  type="number"
                  value={form.maxLoadCapacity}
                  onChange={(e) => setForm({ ...form, maxLoadCapacity: e.target.value })}
                  placeholder="1000"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Odometer (km)</Label>
                <Input
                  type="number"
                  value={form.odometer}
                  onChange={(e) => setForm({ ...form, odometer: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Acquisition Cost (£) *</Label>
                <Input
                  type="number"
                  value={form.acquisitionCost}
                  onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
                  placeholder="35000"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select value={form.region || 'NONE'} onValueChange={(v) => setForm({ ...form, region: v === 'NONE' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No region</SelectItem>
                    {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="ON_TRIP">On Trip</SelectItem>
                  <SelectItem value="IN_SHOP">In Shop</SelectItem>
                  <SelectItem value="RETIRED">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? 'Save Changes' : 'Add Vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Vehicle?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The vehicle and all related data will be removed.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
