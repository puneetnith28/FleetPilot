import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverPortalApi, tripsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { MapPin, Navigation, Map, Package, Box, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/components/ui/toaster';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { queueAction } from '@/lib/offlineQueue';

export function ActiveTripPage() {
  const { data: trip, isLoading } = useQuery({
    queryKey: ['driver', 'active-trip'],
    queryFn: driverPortalApi.activeTrip,
  });

  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [odometer, setOdometer] = useState('');
  const [fuel, setFuel] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const completeMutation = useMutation({
    mutationFn: (data: { id: string; finalOdometer: number; actualDistance: number; fuelConsumed: number }) => 
      tripsApi.complete(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'active-trip'] });
      setIsCompleteOpen(false);
      toast({ title: 'Trip completed successfully!' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to complete trip',
        description: err.response?.data?.error || 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const handleComplete = () => {
    if (!trip) return;
    
    // basic validation
    const odo = parseFloat(odometer);
    const fuelVal = parseFloat(fuel);
    
    if (isNaN(odo) || isNaN(fuelVal)) {
      toast({ title: 'Invalid inputs', variant: 'destructive' });
      return;
    }
    
    const distance = odo - trip.vehicle.odometer;
    
    const payload = {
      id: trip.id,
      finalOdometer: odo,
      actualDistance: distance,
      fuelConsumed: fuelVal,
    };

    if (!navigator.onLine) {
      queueAction('TRIP_COMPLETE', payload).then(() => {
        setIsCompleteOpen(false);
        toast({
          title: 'Saved offline',
          description: 'Trip completion will sync when you regain connectivity.',
          variant: 'default',
        });
      });
      return;
    }
    
    completeMutation.mutate(payload);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading trip...</div>;
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Map className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">No Active Trip</h2>
          <p className="text-muted-foreground mt-2">You are not currently dispatched on any trips. Enjoy your break!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
              Active Dispatch
            </CardTitle>
            <span className="text-xs font-mono bg-background px-2 py-1 rounded border">
              {trip.id.slice(0, 8)}
            </span>
          </div>
          <CardDescription>
            Assigned Vehicle: <span className="font-semibold text-foreground">{trip.vehicle.registrationNumber}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="relative">
            <div className="absolute left-2.5 top-3 h-full w-px bg-border" />
            <div className="flex items-start gap-4 relative">
              <div className="bg-background border-2 border-primary rounded-full p-1 z-10 mt-0.5">
                <MapPin className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 pb-6">
                <p className="text-sm font-semibold">{trip.source}</p>
                <p className="text-xs text-muted-foreground">Starting Point</p>
              </div>
            </div>
            <div className="flex items-start gap-4 relative">
              <div className="bg-primary rounded-full p-1.5 z-10 mt-0.5 shadow-sm shadow-primary/40">
                <Navigation className="h-3 w-3 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{trip.destination}</p>
                <p className="text-xs text-muted-foreground">Destination</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="flex flex-col gap-1 bg-muted/30 p-3 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" /> Cargo
              </span>
              <span className="font-semibold">{trip.cargoWeight} kg</span>
            </div>
            <div className="flex flex-col gap-1 bg-muted/30 p-3 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Map className="h-3 w-3" /> Distance
              </span>
              <span className="font-semibold">{trip.plannedDistance} km</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button className="w-full h-12 text-md font-bold" size="lg" onClick={() => setIsCompleteOpen(true)}>
            Complete Trip
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>Complete Trip</DialogTitle>
            <DialogDescription>
              Enter the final vehicle statistics to close out this trip.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>The vehicle's starting odometer was <strong>{trip.vehicle.odometer} km</strong>.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="odo">Final Odometer Reading (km)</Label>
              <Input 
                id="odo" 
                type="number" 
                placeholder="e.g. 45200" 
                value={odometer} 
                onChange={e => setOdometer(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fuel">Fuel Consumed (Liters)</Label>
              <Input 
                id="fuel" 
                type="number" 
                placeholder="e.g. 45" 
                value={fuel} 
                onChange={e => setFuel(e.target.value)} 
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setIsCompleteOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={completeMutation.isPending} className="w-full sm:w-auto">
              {completeMutation.isPending ? 'Submitting...' : 'Confirm Completion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
