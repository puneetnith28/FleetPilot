import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { exportCSV, exportPDF } from '@/lib/exportUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ScatterChart, Scatter
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, BarChart3, Download, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const CHART_STYLE = {
  contentStyle: { background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', borderRadius: 8 },
  labelStyle: { color: '#f1f5f9' },
};



export function ReportsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.get,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="h-5 w-5" />
        Failed to load reports.
      </div>
    );
  }

  const { vehicleReports, summary } = data;

  // Sort: highest operational cost first
  const byOpCost = [...vehicleReports].sort((a, b) => b.totalOperationalCost - a.totalOperationalCost);
  // Filter those with trips for efficiency chart
  const withTrips = vehicleReports.filter((v: any) => v.totalTrips > 0);

  const csvData = vehicleReports.map((v: any) => ({
    registration: v.registrationNumber,
    name: v.name,
    type: v.type,
    status: v.status,
    region: v.region || '',
    totalTrips: v.totalTrips,
    totalDistance_km: v.totalDistance,
    totalFuel_L: v.totalFuelLiters,
    fuelEfficiency_kmPerL: v.fuelEfficiency,
    fuelCost_GBP: v.fuelCost,
    maintenanceCost_GBP: v.maintenanceCost,
    expenseCost_GBP: v.expenseCost,
    totalOperationalCost_GBP: v.totalOperationalCost,
    totalRevenue_GBP: v.totalRevenue,
    roi_percent: v.roi,
    acquisitionCost_GBP: v.acquisitionCost,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Reports & Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fleet utilization: {summary.fleetUtilization}% · Revenue: {formatCurrency(summary.totalRevenue)} · Costs: {formatCurrency(summary.totalOperationalCost)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportCSV(csvData, 'fleetpilot-report.csv')}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const columns = ['Registration', 'Name', 'Trips', 'Distance', 'Fuel (L)', 'Efficiency (km/L)', 'Op Cost', 'Revenue', 'ROI %'];
              const rows = csvData.map((v: any) => [
                v.registration, v.name, v.totalTrips, v.totalDistance_km, v.totalFuel_L, v.fuelEfficiency_kmPerL, v.totalOperationalCost_GBP, v.totalRevenue_GBP, v.roi_percent
              ]);
              exportPDF('Fleet Analytics Report', columns, rows, 'fleetpilot-report.pdf');
            }}
            className="gap-2"
          >
            <FileText className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Fleet Utilization', value: `${summary.fleetUtilization}%`, icon: TrendingUp, color: 'text-primary bg-primary/15' },
          { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue), icon: DollarSign, color: 'text-green-400 bg-green-500/15' },
          { label: 'Total Op. Cost', value: formatCurrency(summary.totalOperationalCost), icon: DollarSign, color: 'text-red-400 bg-red-500/15' },
          { label: 'Avg Fuel Efficiency', value: `${summary.avgFuelEfficiency} km/L`, icon: BarChart3, color: 'text-amber-400 bg-amber-500/15' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operational Cost Bar Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Operational Cost by Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            {byOpCost.filter(v => v.totalOperationalCost > 0).length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No cost data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byOpCost.filter(v => v.totalOperationalCost > 0)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                  <XAxis dataKey="registrationNumber" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `£${v}`} />
                  <Tooltip
                    {...CHART_STYLE}
                    formatter={(v: any, name: string) => [formatCurrency(v), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="fuelCost" name="Fuel" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="maintenanceCost" name="Maintenance" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="expenseCost" name="Expenses" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fuel Efficiency Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fuel Efficiency (km/L)</CardTitle>
          </CardHeader>
          <CardContent>
            {withTrips.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No completed trips yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={withTrips.filter((v: any) => v.fuelEfficiency > 0)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                  <XAxis dataKey="registrationNumber" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    {...CHART_STYLE}
                    formatter={(v: any) => [`${v} km/L`, 'Fuel Efficiency']}
                  />
                  <Bar dataKey="fuelEfficiency" name="km/L" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Analytics Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Per-Vehicle Analytics</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV(csvData, 'fleetpilot-report.csv')} className="gap-1">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const columns = ['Registration', 'Name', 'Trips', 'Distance', 'Fuel (L)', 'Efficiency (km/L)', 'Op Cost', 'Revenue', 'ROI %'];
              const rows = csvData.map((v: any) => [
                v.registration, v.name, v.totalTrips, v.totalDistance_km, v.totalFuel_L, v.fuelEfficiency_kmPerL, v.totalOperationalCost_GBP, v.totalRevenue_GBP, v.roi_percent
              ]);
              exportPDF('Fleet Analytics Report', columns, rows, 'fleetpilot-report.pdf');
            }} className="gap-1">
              <FileText className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Fuel (L)</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="text-right">Op. Cost</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ROI %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleReports.map((v: any) => (
                  <TableRow key={v.vehicleId}>
                    <TableCell>
                      <span className="font-mono text-primary font-semibold">{v.registrationNumber}</span>
                      <div className="text-xs text-muted-foreground">{v.name}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{v.type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={
                        v.status === 'AVAILABLE' ? 'success' :
                        v.status === 'ON_TRIP' ? 'blue' :
                        v.status === 'IN_SHOP' ? 'orange' : 'gray'
                      }>
                        {v.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{v.totalTrips}</TableCell>
                    <TableCell className="text-right">{v.totalDistance > 0 ? `${v.totalDistance.toLocaleString()} km` : '—'}</TableCell>
                    <TableCell className="text-right">{v.totalFuelLiters > 0 ? `${v.totalFuelLiters} L` : '—'}</TableCell>
                    <TableCell className="text-right">
                      {v.fuelEfficiency > 0 ? (
                        <span className="text-green-400">{v.fuelEfficiency} km/L</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {v.totalOperationalCost > 0 ? (
                        <span className="text-red-400">{formatCurrency(v.totalOperationalCost)}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {v.totalRevenue > 0 ? (
                        <span className="text-green-400">{formatCurrency(v.totalRevenue)}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {v.roi !== 0 ? (
                        <span className={v.roi >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {v.roi > 0 ? '+' : ''}{v.roi}%
                        </span>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
