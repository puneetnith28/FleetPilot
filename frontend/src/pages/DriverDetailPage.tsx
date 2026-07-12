import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Loader2, ArrowLeft, Users, Navigation, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driversApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="p-8 text-center text-red-400">
        <p>Failed to load driver details.</p>
        <Button variant="link" onClick={() => navigate('/drivers')}>Go Back</Button>
      </div>
    );
  }

  const STATUS_VARIANT: Record<string, any> = {
    AVAILABLE: 'success',
    ON_TRIP: 'blue',
    OFF_DUTY: 'gray',
    SUSPENDED: 'destructive',
  };

  const getSafetyColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-500/15';
    if (score >= 75) return 'text-amber-400 bg-amber-500/15';
    return 'text-red-400 bg-red-500/15';
  };

  const isLicenseExpired = new Date(driver.licenseExpiryDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/drivers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> {driver.name}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            License: {driver.licenseNumber} <Badge variant="outline" className="ml-2">{driver.licenseCategory}</Badge>
            <Badge variant={STATUS_VARIANT[driver.status]}>{driver.status.replace('_', ' ')}</Badge>
          </p>
        </div>
      </div>

      {isLicenseExpired && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          This driver's license has expired. Please suspend the driver or update their license immediately.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getSafetyColor(driver.safetyScore)}`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Safety Score</p>
              <p className="text-xl font-bold">{driver.safetyScore}/100</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-blue-400 bg-blue-500/15">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Trips</p>
              <p className="text-xl font-bold">{driver.trips?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-green-400 bg-green-500/15">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed Trips</p>
              <p className="text-xl font-bold">
                {driver.trips?.filter((t: any) => t.status === 'COMPLETED').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div>
              <p className="text-xs text-muted-foreground mb-1">License Expiry</p>
              <p className={`text-sm font-bold ${isLicenseExpired ? 'text-red-400' : ''}`}>
                {formatDate(driver.licenseExpiryDate)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Contact: {driver.contactNumber}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" /> Recent Trips (Last 10)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {driver.trips?.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6 text-center">No trips recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Cargo Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driver.trips?.map((trip: any) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">
                      {trip.source} → {trip.destination}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-primary text-sm">{trip.vehicle?.registrationNumber}</span>
                      <div className="text-xs text-muted-foreground">{trip.vehicle?.name}</div>
                    </TableCell>
                    <TableCell>{trip.cargoWeight.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <Badge variant="outline">{trip.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDateTime(trip.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
