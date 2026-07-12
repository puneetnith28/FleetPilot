import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fuelApi, expensesApi, vehiclesApi, maintenanceApi } from '@/lib/api';
import { Loader2, Fuel, Receipt, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function FuelAndExpensesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  const [fuelForm, setFuelForm] = useState({ vehicleId: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0] });
  const [expenseForm, setExpenseForm] = useState({ vehicleId: '', type: 'TOLL', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const { data: fuelRes, isLoading: fuelLoading } = useQuery({ queryKey: ['fuel'], queryFn: () => fuelApi.list({ limit: 100 }) });
  const { data: expenseRes, isLoading: expenseLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => expensesApi.list({ limit: 100 }) });
  const { data: maintRes, isLoading: maintLoading } = useQuery({ queryKey: ['maintenance'], queryFn: () => maintenanceApi.list({ limit: 100 }) });
  
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehiclesApi.list });

  const fuelLogs = fuelRes?.data || [];
  const expenses = expenseRes?.data || [];
  const maintenanceLogs = maintRes?.data || [];

  const fuelMutation = useMutation({
    mutationFn: fuelApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel'] });
      setFuelDialogOpen(false);
      setFuelForm({ vehicleId: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0] });
      toast({ title: 'Fuel logged', variant: 'success' });
    }
  });

  const expenseMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setExpenseDialogOpen(false);
      setExpenseForm({ vehicleId: '', type: 'TOLL', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      toast({ title: 'Expense added', variant: 'success' });
    }
  });

  // Calculate totals
  const totalFuelCost = fuelLogs.reduce((acc: number, log: any) => acc + log.cost, 0);
  const totalMaintenanceCost = maintenanceLogs.reduce((acc: number, log: any) => acc + log.cost, 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  // Group expenses by vehicle
  const aggregatedExpenses = vehicles.map((v: any) => {
    const vExpenses = expenses.filter((e: any) => e.vehicleId === v.id);
    const vMaint = maintenanceLogs.filter((m: any) => m.vehicleId === v.id);
    
    const toll = vExpenses.filter((e: any) => e.type === 'TOLL').reduce((a: number, c: any) => a + c.amount, 0);
    const other = vExpenses.filter((e: any) => e.type === 'MISC').reduce((a: number, c: any) => a + c.amount, 0);
    const maint = vMaint.reduce((a: number, c: any) => a + c.cost, 0);
    
    return {
      vehicle: v,
      toll,
      other,
      maint,
      total: toll + other + maint
    };
  }).filter((x: any) => x.total > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2 uppercase tracking-wide">
          <Fuel className="h-6 w-6 text-primary" /> Fuel & Expenses
        </h1>
        <div className="flex gap-3">
          <Button onClick={() => setFuelDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-md">
            <Plus className="h-4 w-4" /> Log Fuel
          </Button>
          <Button onClick={() => setExpenseDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-md">
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* FUEL LOGS SECTION */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">FUEL LOGS</h2>
          <Card className="border-border/50 bg-card/20 shadow-sm">
            <CardContent className="p-0">
              {fuelLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : fuelLogs.length === 0 ? (
                <div className="py-12"><EmptyState icon={Fuel} title="No fuel logs" description="Log fuel records to see them here." /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs uppercase font-semibold">VEHICLE</TableHead>
                      <TableHead className="text-xs uppercase font-semibold">DATE</TableHead>
                      <TableHead className="text-xs uppercase font-semibold">LITERS</TableHead>
                      <TableHead className="text-xs uppercase font-semibold text-right">FUEL COST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelLogs.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-primary uppercase">{log.vehicle?.registrationNumber || 'UNKNOWN'}</TableCell>
                        <TableCell>{formatDateTime(log.date).split(',')[0]}</TableCell>
                        <TableCell>{log.liters} L</TableCell>
                        <TableCell className="text-right">{formatCurrency(log.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* EXPENSES SECTION */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">OTHER EXPENSES (TOLL / MISC)</h2>
          <Card className="border-border/50 bg-card/20 shadow-sm">
            <CardContent className="p-0">
              {expenseLoading || maintLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : aggregatedExpenses.length === 0 ? (
                <div className="py-12"><EmptyState icon={Receipt} title="No expenses" description="Add expenses to see them here." /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs uppercase font-semibold">VEHICLE</TableHead>
                      <TableHead className="text-xs uppercase font-semibold text-right">TOLL</TableHead>
                      <TableHead className="text-xs uppercase font-semibold text-right">OTHER</TableHead>
                      <TableHead className="text-xs uppercase font-semibold text-right">MAINT. (LINKED)</TableHead>
                      <TableHead className="text-xs uppercase font-semibold text-right">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedExpenses.map((exp: any, i: number) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium uppercase">{exp.vehicle.registrationNumber}</TableCell>
                        <TableCell className="text-right">{formatCurrency(exp.toll)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(exp.other)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(exp.maint)}</TableCell>
                        <TableCell className="text-right">
                           <Badge className="bg-green-500 hover:bg-green-600 text-white border-transparent font-bold tabular-nums">
                             {formatCurrency(exp.total)}
                           </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* TOTAL FOOTER */}
        <div className="border-t-2 border-primary/20 pt-6 pb-12 flex justify-between items-center">
          <h2 className="text-lg font-bold uppercase tracking-wider text-foreground">TOTAL OPERATIONAL COST (AUTO) = FUEL + MAINT</h2>
          <span className="text-3xl font-black text-orange-500 tabular-nums">{formatCurrency(totalOperationalCost)}</span>
        </div>
      </div>

      {/* Fuel Dialog */}
      <Dialog open={fuelDialogOpen} onOpenChange={setFuelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Fuel</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Vehicle</Label>
               <Select value={fuelForm.vehicleId} onValueChange={(v) => setFuelForm({ ...fuelForm, vehicleId: v })}>
                 <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                 <SelectContent>
                   {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.registrationNumber}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Liters</Label>
               <Input type="number" value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} />
             </div>
             <div className="space-y-2">
               <Label>Cost</Label>
               <Input type="number" value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} />
             </div>
          </div>
          <DialogFooter>
            <Button onClick={() => fuelMutation.mutate({ ...fuelForm, liters: parseFloat(fuelForm.liters), cost: parseFloat(fuelForm.cost) })} disabled={fuelMutation.isPending || !fuelForm.vehicleId}>
              Save Fuel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Vehicle</Label>
               <Select value={expenseForm.vehicleId} onValueChange={(v) => setExpenseForm({ ...expenseForm, vehicleId: v })}>
                 <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                 <SelectContent>
                   {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.registrationNumber}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Type</Label>
               <Select value={expenseForm.type} onValueChange={(v) => setExpenseForm({ ...expenseForm, type: v })}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="TOLL">Toll</SelectItem>
                   <SelectItem value="MISC">Miscellaneous</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Amount</Label>
               <Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
             </div>
          </div>
          <DialogFooter>
            <Button onClick={() => expenseMutation.mutate({ ...expenseForm, amount: parseFloat(expenseForm.amount) })} disabled={expenseMutation.isPending || !expenseForm.vehicleId}>
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
