import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Truck, Users, Route, AlertCircle, CheckCircle2,
  Wrench, TrendingUp, Clock, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

function KpiCard({
  title, value, subtitle, icon: Icon, color, pulse,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  pulse?: boolean;
}) {
  return (
    <Card className="hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} flex-shrink-0`}>
            <Icon className={`h-6 w-6 ${pulse ? 'animate-pulse-slow' : ''}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_BADGE_MAP: Record<string, any> = {
  DRAFT: 'gray',
  DISPATCHED: 'blue',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#6b7280'];

export function DashboardPage() {
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', filterType, filterStatus, filterRegion],
    queryFn: () => dashboardApi.get({ type: filterType, status: filterStatus, region: filterRegion }),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="h-5 w-5" />
        Failed to load dashboard data.
      </div>
    );
  }

  const { kpis, vehiclesByType, recentTrips } = data;

  const pieData = [
    { name: 'Available', value: kpis.availableVehicles },
    { name: 'On Trip', value: kpis.activeVehicles },
    { name: 'In Shop', value: kpis.inShopVehicles },
    { name: 'Retired', value: kpis.retiredVehicles },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Filters (Mockup specific) */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Filters</span>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Vehicle Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Vehicle Type: All</SelectItem>
            <SelectItem value="VAN">Van</SelectItem>
            <SelectItem value="TRUCK">Truck</SelectItem>
            <SelectItem value="MINI">Mini</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Status: All</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="ON_TRIP">On Trip</SelectItem>
            <SelectItem value="IN_SHOP">In Shop</SelectItem>
            <SelectItem value="RETIRED">Retired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Region: All</SelectItem>
            <SelectItem value="North">North</SelectItem>
            <SelectItem value="South">South</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fleet Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time overview of your fleet operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/trips">
            <Button size="sm" className="gap-2">
              <Route className="h-4 w-4" /> Dispatch Trip
            </Button>
          </Link>
          <Link to="/maintenance">
            <Button size="sm" variant="outline" className="gap-2">
              <Wrench className="h-4 w-4" /> Log Maintenance
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards — row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Fleet Utilization"
          value={`${kpis.fleetUtilization}%`}
          subtitle="Active + In Shop / Total"
          icon={TrendingUp}
          color="bg-primary/15 text-primary"
          pulse
        />
        <KpiCard
          title="Available Vehicles"
          value={kpis.availableVehicles}
          subtitle="Ready to dispatch"
          icon={CheckCircle2}
          color="bg-green-500/15 text-green-400"
        />
        <KpiCard
          title="Active Trips"
          value={kpis.activeTrips}
          subtitle="Currently dispatched"
          icon={Route}
          color="bg-blue-500/15 text-blue-400"
          pulse
        />
        <KpiCard
          title="Pending Trips"
          value={kpis.pendingTrips}
          subtitle="Awaiting dispatch"
          icon={Clock}
          color="bg-amber-500/15 text-amber-400"
        />
      </div>

      {/* KPI Cards — row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="On Trip"
          value={kpis.activeVehicles}
          subtitle="Vehicles in transit"
          icon={Truck}
          color="bg-blue-500/15 text-blue-400"
        />
        <KpiCard
          title="In Shop"
          value={kpis.inShopVehicles}
          subtitle="Under maintenance"
          icon={Wrench}
          color="bg-orange-500/15 text-orange-400"
        />
        <KpiCard
          title="Drivers On Duty"
          value={kpis.driversOnDuty}
          subtitle={`of ${kpis.totalDrivers} active drivers`}
          icon={Users}
          color="bg-purple-500/15 text-purple-400"
          pulse
        />
        <KpiCard
          title="Total Vehicles"
          value={kpis.totalVehicles}
          subtitle={`${kpis.retiredVehicles} retired`}
          icon={Activity}
          color="bg-muted text-muted-foreground"
        />
      </div>

      {/* Charts + Recent Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Status Progress Bars */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Vehicle Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Available</span>
                <span className="text-muted-foreground">{kpis.availableVehicles}</span>
              </div>
              <div className="h-4 w-full bg-muted rounded-md overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${(kpis.availableVehicles / (kpis.totalVehicles || 1)) * 100}%` }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">On Trip</span>
                <span className="text-muted-foreground">{kpis.activeVehicles}</span>
              </div>
              <div className="h-4 w-full bg-muted rounded-md overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${(kpis.activeVehicles / (kpis.totalVehicles || 1)) * 100}%` }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">In Shop</span>
                <span className="text-muted-foreground">{kpis.inShopVehicles}</span>
              </div>
              <div className="h-4 w-full bg-muted rounded-md overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${(kpis.inShopVehicles / (kpis.totalVehicles || 1)) * 100}%` }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Retired</span>
                <span className="text-muted-foreground">{kpis.retiredVehicles}</span>
              </div>
              <div className="h-4 w-full bg-muted rounded-md overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${(kpis.retiredVehicles / (kpis.totalVehicles || 1)) * 100}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Trips Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">Recent Trips</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentTrips.length === 0 ? (
              <div className="py-8">
                <EmptyState icon={Route} title="No trips found" description="Your recent trips will appear here." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Trip</th>
                    <th className="py-3 px-4 text-left font-medium">Vehicle</th>
                    <th className="py-3 px-4 text-left font-medium">Driver</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-left font-medium">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentTrips.map((trip: any) => {
                    const etaHours = Math.round(trip.plannedDistance / 60);
                    const etaString = trip.status === 'COMPLETED' ? '—' : trip.status === 'DRAFT' ? 'Awaiting vehicle' : `${etaHours || 1}h 10m`;
                    return (
                      <tr key={trip.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium uppercase tracking-wider">{trip.id.slice(0, 5)}</td>
                        <td className="py-3 px-4 uppercase">{trip.vehicle?.registrationNumber || '—'}</td>
                        <td className="py-3 px-4">{trip.driver?.name || '—'}</td>
                        <td className="py-3 px-4">
                          <Badge variant={STATUS_BADGE_MAP[trip.status]}>{trip.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{etaString}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
