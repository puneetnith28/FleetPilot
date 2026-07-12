import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverPortalApi, fuelApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Droplet, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/components/ui/toaster';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function LogFuelPage() {
  const { data: trip, isLoading } = useQuery({
    queryKey: ['driver', 'active-trip'],
    queryFn: driverPortalApi.activeTrip,
  });

  const [liters, setLiters] = useState('');
  const [cost, setCost] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fuelMutation = useMutation({
    mutationFn: fuelApi.create,
    onSuccess: () => {
      setLiters('');
      setCost('');
      toast({ title: 'Fuel logged successfully!' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to log fuel',
        description: err.response?.data?.error || 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    
    const litersVal = parseFloat(liters);
    const costVal = parseFloat(cost);
    
    if (isNaN(litersVal) || isNaN(costVal)) {
      toast({ title: 'Invalid inputs', variant: 'destructive' });
      return;
    }
    
    fuelMutation.mutate({
      vehicleId: trip.vehicleId,
      liters: litersVal,
      cost: costVal,
      date: new Date().toISOString(),
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Info className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">No Active Vehicle</h2>
          <p className="text-muted-foreground mt-2">You must be dispatched on a trip to log fuel for a vehicle.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Droplet className="h-5 w-5 text-blue-500 fill-blue-500/20" />
            Log Fuel Purchase
          </CardTitle>
          <CardDescription>
            Recording fuel for: <span className="font-semibold text-foreground">{trip.vehicle.registrationNumber}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="liters">Volume (Liters)</Label>
              <div className="relative">
                <Droplet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="liters" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  className="pl-9"
                  value={liters} 
                  onChange={e => setLiters(e.target.value)} 
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">Total Cost (£)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">£</span>
                <Input 
                  id="cost" 
                  type="number"
                  step="0.01" 
                  placeholder="0.00" 
                  className="pl-8"
                  value={cost} 
                  onChange={e => setCost(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full h-12 text-md font-bold" disabled={fuelMutation.isPending}>
              {fuelMutation.isPending ? 'Saving...' : 'Save Fuel Log'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 text-blue-700 rounded-lg border border-blue-500/20 text-xs">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Please retain the physical receipt. You may be asked to provide it by the fleet manager for expense reconciliation.</p>
      </div>
    </div>
  );
}
