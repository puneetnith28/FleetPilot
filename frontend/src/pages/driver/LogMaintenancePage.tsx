import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverPortalApi, maintenanceApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/components/ui/toaster';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function LogMaintenancePage() {
  const { data: trip, isLoading } = useQuery({
    queryKey: ['driver', 'active-trip'],
    queryFn: driverPortalApi.activeTrip,
  });

  const [description, setDescription] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const maintenanceMutation = useMutation({
    mutationFn: maintenanceApi.create,
    onSuccess: () => {
      setDescription('');
      toast({ title: 'Maintenance issue reported successfully!' });
      // This will also invalidate because of SSE, but doing it manually just in case
      queryClient.invalidateQueries({ queryKey: ['driver', 'active-trip'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to report issue',
        description: err.response?.data?.error || 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    
    if (description.trim().length < 10) {
      toast({ title: 'Please provide more details', variant: 'destructive' });
      return;
    }
    
    maintenanceMutation.mutate({
      vehicleId: trip.vehicleId,
      description: description,
      cost: 0, // Driver doesn't know the cost, Fleet Manager will update it
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
          <p className="text-muted-foreground mt-2">You must be dispatched on a trip to report an issue for a vehicle.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600 fill-amber-600/20" />
            Report Vehicle Issue
          </CardTitle>
          <CardDescription>
            Reporting an issue for: <span className="font-semibold text-foreground">{trip.vehicle.registrationNumber}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="desc">Issue Description</Label>
              <Textarea 
                id="desc"
                placeholder="Describe the problem in detail (e.g., Check engine light came on, strange noise from brakes)..." 
                className="min-h-[120px] resize-none"
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                required
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {description.length} characters
              </p>
            </div>
            
            <Button type="submit" variant="destructive" className="w-full h-12 text-md font-bold" disabled={maintenanceMutation.isPending}>
              {maintenanceMutation.isPending ? 'Reporting...' : 'Submit Issue Report'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="flex items-start gap-3 p-3 bg-amber-500/10 text-amber-700 rounded-lg border border-amber-500/20 text-xs">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <p><strong>Warning:</strong> Submitting this report will notify the fleet manager and immediately mark this vehicle as <strong>IN SHOP</strong>. Only report issues that affect safety or operability.</p>
      </div>
    </div>
  );
}
