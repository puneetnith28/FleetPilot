import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi, vehiclesApi } from '@/lib/api';
import { Loader2, Wrench, CheckCircle2, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';

export function MaintenancePage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '', date: new Date().toISOString().split('T')[0], status: 'Active' });

  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ['maintenance', 1, 'ALL'],
    queryFn: () => maintenanceApi.list({ page: 1, limit: 100 }),
  });
  const logs = logsResponse?.data || [];

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
      setForm({ ...form, vehicleId: '', description: '', cost: '' });
      toast({ title: 'Maintenance log created', description: 'Vehicle is now In Shop.', variant: 'success' });
    },
    onError: (err: any) => toast({
      title: 'Failed to create log',
      description: err?.response?.data?.error || 'An unexpected error occurred.',
      variant: 'destructive',
    }),
  });

  const closeMutation = useMutation({
    mutationFn: maintenanceApi.close,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Maintenance closed', description: 'Vehicle is now Available.', variant: 'success' });
    },
    onError: (err: any) =>
      toast({ title: 'Failed to close', description: err?.response?.data?.error, variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(form.cost);
    if (!form.vehicleId) {
      toast({ title: 'Vehicle required', variant: 'destructive' });
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast({ title: 'Invalid Cost', variant: 'destructive' });
      return;
    }
    createMutation.mutate({ vehicleId: form.vehicleId, description: form.description, cost });
  };

  const eligibleVehicles = vehicles.filter((v: any) => v.status !== 'ON_TRIP' && v.status !== 'RETIRED');

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6">
      
      {/* Left Pane: Form */}
      <Card className="w-[450px] shrink-0 border-border/50 bg-card/40 flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-card/60">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Wrench className="h-4 w-4" /> LOG SERVICE RECORD
          </h2>
        </div>
        <CardContent className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">VEHICLE</Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleVehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">SERVICE TYPE</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Oil Change" required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">COST</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="2500" required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">DATE</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">STATUS</Label>
              <Input value={form.status} disabled className="bg-muted/50 cursor-not-allowed text-muted-foreground" />
            </div>

            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-md transition-all active:scale-[0.98] mt-2" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </form>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-500 font-medium min-w-[80px]">Available</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground text-center line-through decoration-muted-foreground/50 flex-1">creating active record</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-orange-500 font-medium min-w-[80px] text-right">In Shop</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <span className="text-orange-500 font-medium min-w-[80px]">In Shop</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground text-center line-through decoration-muted-foreground/50 flex-1">closing record. Get retired</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-green-500 font-medium min-w-[80px] text-right">Available</span>
            </div>
            
            <p className="text-xs font-medium text-orange-500/80 mt-4">Note: In Shop vehicles are removed from the dispatch pool.</p>
          </div>
        </CardContent>
      </Card>

      {/* Right Pane: Logs Table */}
      <Card className="flex-1 flex flex-col border-border/50 bg-card/20 overflow-hidden h-full">
        <div className="p-6 border-b border-border/50 bg-card/40">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">SERVICE LOG</h2>
        </div>
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8"><EmptyState icon={Wrench} title="No maintenance logs" description="Service records will appear here." /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-xs uppercase font-semibold">VEHICLE</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">SERVICE</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">COST</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{log.vehicle?.registrationNumber || 'Unknown'}</TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>{formatCurrency(log.cost)}</TableCell>
                    <TableCell>
                      {log.status === 'OPEN' ? (
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="bg-orange-500 text-white border-transparent hover:bg-orange-600 cursor-default px-3 py-1">In Shop</Badge>
                           <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-green-500" onClick={() => closeMutation.mutate(log.id)} disabled={closeMutation.isPending} title="Mark as Completed">
                             {closeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                           </Button>
                         </div>
                      ) : (
                        <Badge variant="outline" className="bg-green-500 text-white border-transparent hover:bg-green-600 cursor-default px-3 py-1">Completed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
      
    </div>
  );
}
