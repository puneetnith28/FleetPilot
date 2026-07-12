import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

export function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.get,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState icon={AlertCircle} title="Failed to load analytics" description="An error occurred while fetching the report." />
      </div>
    );
  }

  const { vehicleReports, summary, monthlyRevenue } = data;

  // Top Costliest Vehicles
  const topCostliest = [...vehicleReports]
    .sort((a, b) => b.totalOperationalCost - a.totalOperationalCost)
    .slice(0, 5);

  const COST_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#22c55e', '#a855f7'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2 uppercase tracking-wide">
          <BarChart3 className="h-6 w-6 text-primary" /> Reports & Analytics
        </h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* KPI Cards */}
        <Card className="border-t-4 border-t-blue-500 rounded-lg">
          <CardContent className="p-4">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">FUEL EFFICIENCY</h3>
            <p className="text-3xl font-light">{summary.avgFuelEfficiency} <span className="text-lg">km/l</span></p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500 rounded-lg">
          <CardContent className="p-4">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">FLEET UTILIZATION</h3>
            <p className="text-3xl font-light">{summary.fleetUtilization}%</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500 rounded-lg">
          <CardContent className="p-4">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">OPERATIONAL COST</h3>
            <p className="text-3xl font-light">{formatCurrency(summary.totalOperationalCost)}</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-yellow-500 rounded-lg">
          <CardContent className="p-4">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">VEHICLE ROI</h3>
            <p className="text-3xl font-light">{summary.avgRoi}%</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground font-mono">
        ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
      </p>

      <div className="grid grid-cols-2 gap-8 mt-6">
        {/* Monthly Revenue Chart */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">MONTHLY REVENUE</h3>
          <div className="h-64 border border-border/50 rounded-lg p-4 bg-card/20">
            {monthlyRevenue && monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No revenue data</div>
            )}
          </div>
        </div>

        {/* Top Costliest Vehicles */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">TOP COSTLIEST VEHICLES</h3>
          <div className="h-64 p-4 flex flex-col justify-center gap-4">
            {topCostliest.map((v: any, index: number) => {
              const maxCost = topCostliest[0]?.totalOperationalCost || 1;
              const percentage = Math.max(5, (v.totalOperationalCost / maxCost) * 100);
              
              return (
                <div key={v.vehicleId} className="flex items-center gap-4">
                  <span className="w-20 text-xs font-semibold uppercase text-muted-foreground">{v.registrationNumber}</span>
                  <div className="flex-1 bg-muted/30 h-4 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: COST_COLORS[index % COST_COLORS.length] 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
