import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  Truck, Users, MapPin, Package, Gauge, Fuel, Calendar, XCircle, SendHorizonal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type TripStatus = 'DRAFT' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';

const STATUS_VARIANT: Record<TripStatus, any> = {
  DRAFT: 'gray',
  DISPATCHED: 'blue',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 flex items-start justify-between gap-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-right">{value}</span>
      </div>
    </div>
  );
}

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [completeForm, setCompleteForm] = useState({
    actualDistance: '',
    fuelConsumed: '',
    finalOdometer: '',
  });

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.get(id!),
    enabled: !!id,
  });

  const dispatchMutation = useMutation({
    mutationFn: () => tripsApi.dispatch(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip', id] });
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: '🚀 Trip dispatched! Vehicle and driver set to ON_TRIP.', variant: 'success' });
    },
    onError: (err: any) => {
      toast({ title: 'Dispatch failed', description: err?.response?.data?.error, variant: 'destructive' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (data: any) => tripsApi.complete(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip', id] });
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['fuel'] });
      setCompleteOpen(false);
      toast({ title: '✅ Trip completed! Vehicle and driver restored to AVAILABLE.', variant: 'success' });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.error || 'Failed to complete trip');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => tripsApi.cancel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip', id] });
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setCancelOpen(false);
      toast({ title: 'Trip cancelled. Resources restored.', variant: 'default' });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.error || 'Failed to cancel trip');
      setCancelOpen(false);
      toast({ title: 'Cancel failed', description: err?.response?.data?.error, variant: 'destructive' });
    },
  });

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    completeMutation.mutate({
      actualDistance: parseFloat(completeForm.actualDistance),
      fuelConsumed: parseFloat(completeForm.fuelConsumed),
      finalOdometer: parseFloat(completeForm.finalOdometer),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="h-5 w-5" />
        Trip not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/trips')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {trip.source} → {trip.destination}
            </h1>
            <Badge variant={STATUS_VARIANT[trip.status as TripStatus]} className="text-sm px-3 py-1">
              {trip.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">Trip ID: {trip.id}</p>
        </div>

        {/* Action buttons based on status */}
        <div className="flex gap-2">
          {trip.status === 'DRAFT' && (
            <>
              <Button
                onClick={() => dispatchMutation.mutate()}
                disabled={dispatchMutation.isPending}
                className="gap-2"
              >
                {dispatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
                Dispatch Trip
              </Button>
              <Button variant="outline" className="gap-2 hover:text-red-400 hover:border-red-600" onClick={() => { setActionError(''); setCancelOpen(true); }}>
                <XCircle className="h-4 w-4" /> Cancel
              </Button>
            </>
          )}
          {trip.status === 'DISPATCHED' && (
            <>
              <Button
                variant="success"
                onClick={() => { setActionError(''); setCompleteForm({ actualDistance: String(trip.plannedDistance), fuelConsumed: '', finalOdometer: String(trip.vehicle?.odometer || 0) }); setCompleteOpen(true); }}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Complete Trip
              </Button>
              <Button variant="outline" className="gap-2 hover:text-red-400 hover:border-red-600" onClick={() => { setActionError(''); setCancelOpen(true); }}>
                <XCircle className="h-4 w-4" /> Cancel Trip
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trip Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Trip Details</CardTitle></CardHeader>
          <CardContent className="space-y-0">
            <InfoRow icon={MapPin} label="Source" value={trip.source} />
            <InfoRow icon={MapPin} label="Destination" value={trip.destination} />
            <InfoRow icon={Package} label="Cargo Weight" value={`${trip.cargoWeight.toLocaleString()} kg`} />
            <InfoRow icon={Gauge} label="Planned Distance" value={`${trip.plannedDistance} km`} />
            {trip.actualDistance != null && (
              <InfoRow icon={Gauge} label="Actual Distance" value={`${trip.actualDistance} km`} />
            )}
            {trip.fuelConsumed != null && (
              <InfoRow icon={Fuel} label="Fuel Consumed" value={`${trip.fuelConsumed} L`} />
            )}
            {trip.revenue != null && (
              <InfoRow icon={Package} label="Revenue" value={formatCurrency(trip.revenue)} />
            )}
          </CardContent>
        </Card>

        {/* Vehicle + Driver */}
        <Card>
          <CardHeader><CardTitle className="text-base">Resources</CardTitle></CardHeader>
          <CardContent className="space-y-0">
            <InfoRow icon={Truck} label="Vehicle" value={
              <span className="font-mono text-primary">{trip.vehicle?.registrationNumber}</span>
            } />
            <InfoRow icon={Truck} label="Vehicle Name" value={trip.vehicle?.name} />
            <InfoRow icon={Package} label="Max Load" value={`${trip.vehicle?.maxLoadCapacity?.toLocaleString()} kg`} />
            <InfoRow icon={Users} label="Driver" value={trip.driver?.name} />
            <InfoRow icon={Users} label="License" value={`${trip.driver?.licenseNumber} (${trip.driver?.licenseCategory})`} />
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <TimelineItem label="Created" date={trip.createdAt} active />
              <TimelineArrow />
              <TimelineItem label="Dispatched" date={trip.dispatchedAt} active={!!trip.dispatchedAt} />
              <TimelineArrow />
              <TimelineItem label="Completed" date={trip.completedAt} active={!!trip.completedAt} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complete Trip Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Complete Trip</DialogTitle></DialogHeader>
          <form onSubmit={handleComplete} className="space-y-4">
            {actionError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {actionError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Actual Distance Travelled (km) *</Label>
              <Input
                type="number" min="1" step="0.1"
                value={completeForm.actualDistance}
                onChange={(e) => setCompleteForm({ ...completeForm, actualDistance: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fuel Consumed (liters) *</Label>
              <Input
                type="number" min="0.1" step="0.1"
                value={completeForm.fuelConsumed}
                onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumed: e.target.value })}
                placeholder="Enter liters consumed"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Final Odometer Reading (km) *</Label>
              <Input
                type="number" min="0" step="0.1"
                value={completeForm.finalOdometer}
                onChange={(e) => setCompleteForm({ ...completeForm, finalOdometer: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Current odometer: {trip.vehicle?.odometer?.toLocaleString()} km
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-400">
              <p className="font-medium">On completion:</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>• Vehicle "{trip.vehicle?.registrationNumber}" → AVAILABLE</li>
                <li>• Driver "{trip.driver?.name}" → AVAILABLE</li>
                <li>• A fuel log entry will be auto-created</li>
              </ul>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
              <Button type="submit" variant="success" disabled={completeMutation.isPending}>
                {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Complete Trip
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Trip?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {trip.status === 'DISPATCHED'
              ? 'This will restore the vehicle and driver to AVAILABLE status.'
              : 'The draft trip will be cancelled.'}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Trip</Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimelineItem({ label, date, active }: { label: string; date?: string | null; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[100px]">
      <div className={`h-3 w-3 rounded-full border-2 ${active ? 'bg-primary border-primary' : 'border-border bg-background'}`} />
      <p className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
      {date && <p className="text-xs text-muted-foreground">{formatDateTime(date)}</p>}
    </div>
  );
}

function TimelineArrow() {
  return <div className="flex-1 h-px bg-border min-w-[20px]" />;
}
