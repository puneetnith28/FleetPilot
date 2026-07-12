import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, vehiclesApi } from '@/lib/api';
import { Plus, Trash2, Loader2, AlertCircle, Receipt, Download, FileText } from 'lucide-react';
import { exportCSV, exportPDF } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate } from '@/lib/utils';

const TYPE_VARIANT: Record<string, any> = {
  TOLL: 'blue',
  MISC: 'gray',
  MAINTENANCE: 'orange',
};

export function ExpensesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({ vehicleId: '', type: 'MISC', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
  const [filterVehicle, setFilterVehicle] = useState('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => expensesApi.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehiclesApi.list });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setDialogOpen(false);
      toast({ title: 'Expense logged', variant: 'success' });
    },
    onError: (err: any) => toast({
      title: 'Failed to log expense',
      description: err?.response?.data?.error || 'An unexpected error occurred.',
      variant: 'destructive',
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setDeleteConfirm(null);
      toast({ title: 'Expense deleted' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Expense amount must be greater than zero.', variant: 'destructive' });
      return;
    }
    createMutation.mutate({ ...form, amount });
  };

  const filtered = filterVehicle === 'ALL' ? expenses : expenses.filter((e: any) => e.vehicleId === filterVehicle);
  const totalAmount = filtered.reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Expenses
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {expenses.length} entries · Total: {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            const csvData = filtered.map((e: any) => ({
              id: e.id,
              vehicle: e.vehicle?.registrationNumber,
              date: e.date,
              type: e.type,
              description: e.description,
              amount: e.amount,
            }));
            exportCSV(csvData, 'expenses.csv');
          }}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={() => {
            const columns = ['ID', 'Vehicle', 'Date', 'Type', 'Description', 'Amount (£)'];
            const rows = filtered.map((e: any) => [
              e.id.slice(0, 8),
              e.vehicle?.registrationNumber,
              formatDate(e.date),
              e.type,
              e.description,
              e.amount,
            ]);
            exportPDF('Expenses Report', columns, rows, 'expenses.pdf');
          }}>
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button onClick={() => { setForm({ vehicleId: '', type: 'MISC', amount: '', date: new Date().toISOString().split('T')[0], description: '' }); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Log Expense
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
              <Receipt className="h-10 w-10 opacity-30" />
              <p>No expenses found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((exp: any) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <span className="font-mono text-primary text-sm">{exp.vehicle?.registrationNumber}</span>
                      <div className="text-xs text-muted-foreground">{exp.vehicle?.name}</div>
                    </TableCell>
                    <TableCell>{formatDate(exp.date)}</TableCell>
                    <TableCell><Badge variant={TYPE_VARIANT[exp.type] || 'gray'}>{exp.type}</Badge></TableCell>
                    <TableCell className="max-w-xs"><p className="truncate">{exp.description}</p></TableCell>
                    <TableCell className="font-medium">{formatCurrency(exp.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="hover:text-red-400" onClick={() => setDeleteConfirm(exp.id)}>
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
          <DialogHeader><DialogTitle>Log Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOLL">Toll</SelectItem>
                    <SelectItem value="MISC">Miscellaneous</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (£) *</Label>
                <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="50" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. M1 Motorway toll" required />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !form.vehicleId}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Log Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Expense?</DialogTitle></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
