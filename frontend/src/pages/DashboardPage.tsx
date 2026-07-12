import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Truck, Users, Route, AlertCircle, CheckCircle2,
  Wrench, TrendingUp, Clock, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Fleet Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time overview of your fleet operations</p>
      </div>

      {/* KPI Cards — row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        {/* Fleet Status Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Fleet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicles by Type Bar Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Vehicles by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vehiclesByType} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="count" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Trips */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Recent Trips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTrips.length === 0 && (
              <p className="text-muted-foreground text-sm">No trips yet.</p>
            )}
            {recentTrips.map((trip: any) => (
              <div key={trip.id} className="flex items-start justify-between gap-2 py-2 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {trip.source} → {trip.destination}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trip.vehicle?.registrationNumber} · {trip.driver?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(trip.createdAt)}</p>
                </div>
                <Badge variant={STATUS_BADGE_MAP[trip.status] || 'gray'} className="flex-shrink-0">
                  {trip.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
