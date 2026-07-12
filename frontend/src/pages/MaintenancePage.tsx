import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi, vehiclesApi } from '@/lib/api';
import { Plus, Loader2, AlertCircle, Wrench, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function MaintenancePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '' });
  const [filterVehicle, setFilterVehicle] = useState('ALL');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceApi.list(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: maintenanceApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDialogOpen(false);
      toast({ title: '🔧 Maintenance log created. Vehicle set to IN_SHOP.', variant: 'success' });
    },
    onError: (err: any) => setFormError(err?.response?.data?.error || 'Failed to create log'),
  });

  const closeMutation = useMutation({
    mutationFn: maintenanceApi.close,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: '✅ Maintenance closed. Vehicle restored to AVAILABLE.', variant: 'success' });
    },
    onError: (err: any) =>
      toast({ title: 'Failed to close', description: err?.response?.data?.error, variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    createMutation.mutate({ vehicleId: form.vehicleId, description: form.description, cost: parseFloat(form.cost) });
  };

  const eligibleVehicles = vehicles.filter((v: any) => v.status !== 'ON_TRIP' && v.status !== 'RETIRED');

  const filtered = filterVehicle === 'ALL'
    ? logs
    : logs.filter((l: any) => l.vehicleId === filterVehicle);

  const openLogs = logs.filter((l: any) => l.status === 'OPEN').length;
  const totalCost = logs.reduce((s: number, l: any) => s + l.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" /> Maintenance Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {openLogs} open · Total cost: {formatCurrency(totalCost)}
          </p>
        </div>
        <Button onClick={() => { setForm({ vehicleId: '', description: '', cost: '' }); setFormError(''); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Log
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-400"><Clock className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold">{openLogs}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/15 flex items-center justify-center text-green-400"><CheckCircle2 className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Closed</p><p className="text-2xl font-bold">{logs.length - openLogs}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary"><Wrench className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Total Cost</p><p className="text-2xl font-bold">{formatCurrency(totalCost)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterVehicle} onValueChange={setFilterVehicle}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Vehicles</SelectItem>
            {vehicles.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Wrench className="h-10 w-10 opacity-30" />
              <p>No maintenance logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="font-mono text-primary text-sm">{log.vehicle?.registrationNumber}</span>
                      <div className="text-xs text-muted-foreground">{log.vehicle?.name}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{log.description}</p>
                    </TableCell>
                    <TableCell>{formatCurrency(log.cost)}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'OPEN' ? 'orange' : 'success'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.closedAt ? formatDateTime(log.closedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.status === 'OPEN' && (
                        <Button
                          size="sm"
                          variant="success"
                          className="gap-1"
                          onClick={() => closeMutation.mutate(log.id)}
                          disabled={closeMutation.isPending}
                        >
                          {closeMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Close
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Maintenance Log</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400">
              ⚠ Creating an open maintenance log will set the vehicle status to <strong>IN_SHOP</strong> and remove it from dispatch selection.
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle *</Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                <SelectContent>
                  {eligibleVehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber} — {v.name} ({v.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Oil Change & Filter Replacement"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Cost (£) *</Label>
              <Input
                type="number" min="0" step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="120"
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !form.vehicleId}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Log
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
