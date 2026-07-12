import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fuelApi, vehiclesApi } from '@/lib/api';
import { Plus, Trash2, Loader2, AlertCircle, Fuel, Download, FileText } from 'lucide-react';
import { exportCSV, exportPDF } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate } from '@/lib/utils';

export function FuelPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ vehicleId: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0] });
  const [filterVehicle, setFilterVehicle] = useState('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery({ queryKey: ['fuel'], queryFn: () => fuelApi.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehiclesApi.list });

  const createMutation = useMutation({
    mutationFn: fuelApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel'] });
      setDialogOpen(false);
      toast({ title: 'Fuel log added', variant: 'success' });
    },
    onError: (err: any) => setFormError(err?.response?.data?.error || 'Failed to add fuel log'),
  });

  const deleteMutation = useMutation({
    mutationFn: fuelApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel'] });
      setDeleteConfirm(null);
      toast({ title: 'Fuel log deleted' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    createMutation.mutate({ ...form, liters: parseFloat(form.liters), cost: parseFloat(form.cost) });
  };

  const filtered = filterVehicle === 'ALL' ? logs : logs.filter((l: any) => l.vehicleId === filterVehicle);

  const totalLiters = filtered.reduce((s: number, l: any) => s + l.liters, 0);
  const totalCost = filtered.reduce((s: number, l: any) => s + l.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-6 w-6 text-primary" /> Fuel Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {logs.length} entries · {Math.round(totalLiters * 10) / 10} L total · {formatCurrency(totalCost)} spent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            const csvData = filtered.map((l: any) => ({
              id: l.id,
              vehicle: l.vehicle?.registrationNumber,
              date: l.date,
              liters: l.liters,
              cost: l.cost,
            }));
            exportCSV(csvData, 'fuel-logs.csv');
          }}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={() => {
            const columns = ['ID', 'Vehicle', 'Date', 'Liters', 'Cost (£)'];
            const rows = filtered.map((l: any) => [
              l.id.slice(0, 8),
              l.vehicle?.registrationNumber,
              formatDate(l.date),
              l.liters.toFixed(1),
              l.cost,
            ]);
            exportPDF('Fuel Logs Report', columns, rows, 'fuel-logs.pdf');
          }}>
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button onClick={() => { setForm({ vehicleId: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0] }); setFormError(''); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Fuel Log
          </Button>
        </div>
      </div>

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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Fuel className="h-10 w-10 opacity-30" />
              <p>No fuel logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Liters</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Cost / Liter</TableHead>
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
                    <TableCell>{formatDate(log.date)}</TableCell>
                    <TableCell>{log.liters.toFixed(1)} L</TableCell>
                    <TableCell>{formatCurrency(log.cost)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      £{(log.cost / log.liters).toFixed(2)}/L
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon" variant="ghost" className="hover:text-red-400"
                        onClick={() => setDeleteConfirm(log.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Fuel Log</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Vehicle *</Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Liters *</Label>
                <Input type="number" min="0.1" step="0.1" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} placeholder="50" required />
              </div>
              <div className="space-y-1.5">
                <Label>Cost (£) *</Label>
                <Input type="number" min="0.01" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="100" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !form.vehicleId}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Add Log
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Fuel Log?</DialogTitle></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
