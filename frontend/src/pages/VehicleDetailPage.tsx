import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vehiclesApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2, ArrowLeft, Truck, Wrench, Fuel, DollarSign, Calendar, Navigation, FileText, Upload, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.get(id!),
    enabled: !!id,
  });

  const uploadDocMutation = useMutation({
    mutationFn: (data: { title: string; documentData: string }) => vehiclesApi.uploadDocument(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle', id] });
      setDocDialogOpen(false);
      setDocTitle('');
      setDocFile(null);
    },
  });

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      uploadDocMutation.mutate({ title: docTitle, documentData: base64String });
    };
    reader.readAsDataURL(docFile);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-8 text-center text-red-400">
        <p>Failed to load vehicle details.</p>
        <Button variant="link" onClick={() => navigate('/vehicles')}>Go Back</Button>
      </div>
    );
  }

  const STATUS_VARIANT: Record<string, any> = {
    AVAILABLE: 'success',
    ON_TRIP: 'blue',
    IN_SHOP: 'orange',
    RETIRED: 'gray',
  };

  const totalFuelCost = vehicle.fuelLogs?.reduce((sum: number, log: any) => sum + log.cost, 0) || 0;
  const totalMaintenanceCost = vehicle.maintenanceLogs?.reduce((sum: number, log: any) => sum + log.cost, 0) || 0;
  const totalExpenses = vehicle.expenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost + totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> {vehicle.registrationNumber}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            {vehicle.name} <Badge variant="outline" className="ml-2">{vehicle.type}</Badge>
            <Badge variant={STATUS_VARIANT[vehicle.status]}>{vehicle.status.replace('_', ' ')}</Badge>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-blue-400 bg-blue-500/15">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Odometer</p>
              <p className="text-xl font-bold">{vehicle.odometer.toLocaleString()} km</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-red-400 bg-red-500/15">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Op. Cost</p>
              <p className="text-xl font-bold">{formatCurrency(totalOperationalCost)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-amber-400 bg-amber-500/15">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maintenance Logs</p>
              <p className="text-xl font-bold">{vehicle.maintenanceLogs?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-green-400 bg-green-500/15">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fuel Logs</p>
              <p className="text-xl font-bold">{vehicle.fuelLogs?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Trips */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="h-4 w-4" /> Recent Trips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {vehicle.trips?.length === 0 ? (
                <p className="text-muted-foreground text-sm p-6 text-center">No trips recorded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.trips?.slice(0, 5).map((trip: any) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">
                          {trip.source} → {trip.destination}
                        </TableCell>
                        <TableCell>{trip.driver?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{trip.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {formatDate(trip.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="p-4 border-t border-border/50 text-center">
                <Button variant="link" size="sm" onClick={() => navigate('/trips')}>View All Trips</Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Documents
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setDocDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {vehicle.documents?.length === 0 ? (
                <p className="text-muted-foreground text-sm p-6 text-center">No documents uploaded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.documents?.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(doc.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={async () => {
                              try {
                                const fullDoc = await vehiclesApi.getDocument(vehicle.id, doc.id);
                                const newWindow = window.open();
                                if (newWindow) {
                                  newWindow.document.write(`<iframe src="${fullDoc.documentData}" width="100%" height="100%" style="border:none;"></iframe>`);
                                }
                              } catch (e) {
                                console.error('Failed to load document');
                              }
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Maintenance & Fuel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Recent Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {vehicle.maintenanceLogs?.length === 0 ? (
                <p className="text-muted-foreground text-sm p-6 text-center">No maintenance records</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.maintenanceLogs?.slice(0, 3).map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.description}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'OPEN' ? 'orange' : 'success'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-400 font-medium">
                          {formatCurrency(log.cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Fuel className="h-4 w-4" /> Recent Fuel Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {vehicle.fuelLogs?.length === 0 ? (
                <p className="text-muted-foreground text-sm p-6 text-center">No fuel records</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Liters</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.fuelLogs?.slice(0, 3).map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.date)}</TableCell>
                        <TableCell>{log.liters} L</TableCell>
                        <TableCell className="text-right text-red-400 font-medium">
                          {formatCurrency(log.cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDocSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Title *</Label>
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Insurance 2024" required />
            </div>
            <div className="space-y-2">
              <Label>File (Image or PDF) *</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setDocFile(e.target.files?.[0] || null)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploadDocMutation.isPending || !docFile || !docTitle}>
                {uploadDocMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
