import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Loader2, AlertCircle, Users, AlertTriangle, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatDate, isLicenseExpired, isLicenseExpiringSoon } from '@/lib/utils';

type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'SUSPENDED';

const STATUS_VARIANT: Record<DriverStatus, any> = {
  AVAILABLE: 'success',
  ON_TRIP: 'blue',
  OFF_DUTY: 'gray',
  SUSPENDED: 'destructive',
};

const LICENSE_CATEGORIES = ['B', 'B+E', 'C', 'C+E', 'D', 'D+E', 'C1', 'D1'];

interface DriverForm {
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: string;
  status: string;
}

const emptyForm: DriverForm = {
  name: '',
  licenseNumber: '',
  licenseCategory: 'B',
  licenseExpiryDate: '',
  contactNumber: '',
  safetyScore: '100',
  status: 'AVAILABLE',
};

export function DriversPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverForm>(emptyForm);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['drivers', page, search, filterStatus],
    queryFn: () => driversApi.list({ page, limit: 10, search, status: filterStatus }),
  });
  const drivers = response?.data || [];
  const total = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingId ? driversApi.update(editingId, data) : driversApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDialogOpen(false);
      toast({ title: editingId ? 'Driver updated' : 'Driver added', variant: 'success' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to save driver',
        description: err?.response?.data?.error || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: driversApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      setDeleteConfirm(null);
      toast({ title: 'Driver deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Cannot delete driver', description: err?.response?.data?.error, variant: 'destructive' });
      setDeleteConfirm(null);
    },
  });



  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory,
      licenseExpiryDate: d.licenseExpiryDate.split('T')[0],
      contactNumber: d.contactNumber,
      safetyScore: String(d.safetyScore),
      status: d.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safetyScore = parseFloat(form.safetyScore);
    if (safetyScore < 0 || safetyScore > 100) {
      toast({ title: 'Invalid Score', description: 'Safety score must be between 0 and 100.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({
      ...form,
      safetyScore,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Driver Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} drivers registered ·{' '}
            <span className="text-red-400">
              {drivers.filter((d: any) => isLicenseExpired(d.licenseExpiryDate)).length} expired licenses
            </span>
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Driver
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, license number..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="ON_TRIP">On Trip</SelectItem>
              <SelectItem value="OFF_DUTY">Off Duty</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Users className="h-10 w-10 opacity-30" />
              <p>No drivers found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>License #</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>License Expiry</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Safety Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d: any) => {
                  const expired = isLicenseExpired(d.licenseExpiryDate);
                  const expiringSoon = isLicenseExpiringSoon(d.licenseExpiryDate);
                  return (
                    <TableRow key={d.id} className={d.status === 'SUSPENDED' ? 'opacity-75' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{d.name}</span>
                          {d.status === 'SUSPENDED' && (
                            <ShieldOff className="h-3.5 w-3.5 text-red-400" aria-label="Suspended" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{d.licenseNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.licenseCategory}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {expired ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                          ) : expiringSoon ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          ) : null}
                          <span className={expired ? 'text-red-400 font-medium' : expiringSoon ? 'text-amber-400' : ''}>
                            {formatDate(d.licenseExpiryDate)}
                            {expired && ' (EXPIRED)'}
                            {expiringSoon && !expired && ' (soon)'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.contactNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${d.safetyScore >= 80 ? 'bg-green-500' : d.safetyScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${d.safetyScore}%` }}
                            />
                          </div>
                          <span className="text-sm">{d.safetyScore}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[d.status as DriverStatus]}>
                          {d.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="View Details"
                            onClick={() => navigate(`/drivers/${d.id}`)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => openEdit(d)}
                            disabled={d.status === 'ON_TRIP'}
                            title={d.status === 'ON_TRIP' ? "Cannot edit while on trip" : "Edit"}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:text-red-400"
                            onClick={() => setDeleteConfirm(d.id)}
                            disabled={d.status === 'ON_TRIP'}
                            title={d.status === 'ON_TRIP' ? "Cannot delete while on trip" : "Delete"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" required />
              </div>
              <div className="space-y-1.5">
                <Label>License Number *</Label>
                <Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="DL-UK-001" required />
              </div>
              <div className="space-y-1.5">
                <Label>License Category *</Label>
                <Select value={form.licenseCategory} onValueChange={(v) => setForm({ ...form, licenseCategory: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LICENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>License Expiry Date *</Label>
                <Input type="date" value={form.licenseExpiryDate} onChange={(e) => setForm({ ...form, licenseExpiryDate: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Number *</Label>
                <Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="+44 7700 900000" required />
              </div>
              <div className="space-y-1.5">
                <Label>Safety Score (0–100)</Label>
                <Input type="number" min="0" max="100" value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="ON_TRIP">On Trip</SelectItem>
                    <SelectItem value="OFF_DUTY">Off Duty</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? 'Save Changes' : 'Add Driver'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Driver?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the driver record.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
