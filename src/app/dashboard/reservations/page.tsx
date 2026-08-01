'use client';

import * as React from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  UserCheck,
  MessageSquare,
  Users,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/modules/core/components/ui/card';
import { Button } from '@/modules/core/components/ui/button';
import { Badge } from '@/modules/core/components/ui/badge';
import { toast } from '@/modules/core/components/ui/toaster';
import { ConfirmDialog } from '@/modules/core/components/ui/confirm-dialog';
import { Skeleton } from '@/modules/core/components/ui/skeleton';

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [floors, setFloors] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showSmsModal, setShowSmsModal] = React.useState(false);
  const [selectedReservation, setSelectedReservation] = React.useState<any | null>(null);

  // Form states
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [guestCount, setGuestCount] = React.useState('2');
  const [reservationTime, setReservationTime] = React.useState(new Date().toISOString().slice(0, 16));
  const [tableId, setTableId] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);

  const fetchReservationData = React.useCallback(async () => {
    if (!user?.branchId) return;
    try {
      const [resRes, flRes] = await Promise.all([
        fetch(`/api/v1/reservations?branchId=${user.branchId}`),
        fetch(`/api/v1/floors?branchId=${user.branchId}`)
      ]);
      const resData = await resRes.json();
      const flData = await flRes.json();

      if (resData.success) setReservations(resData.data);
      if (flData.success) setFloors(flData.data);
    } catch (err: any) {
      toast(`Failed to load reservations: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId]);

  React.useEffect(() => {
    fetchReservationData();
  }, [fetchReservationData]);

  const availableTables = React.useMemo(() => {
    const list: any[] = [];
    floors.forEach(f => {
      f.tables.forEach((t: any) => {
        if (t.status === 'AVAILABLE' || t.status === 'RESERVED') list.push(t);
      });
    });
    return list;
  }, [floors]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.branchId) return;
    try {
      const res = await fetch('/api/v1/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user.branchId,
          customerName,
          customerPhone,
          guestCount: parseInt(guestCount, 10),
          reservationTime,
          tableId: tableId || undefined,
          notes
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast(`Reservation for ${customerName} confirmed!`, 'success');
      setSelectedReservation(data.data);
      setShowAddModal(false);
      setShowSmsModal(true);
      setCustomerName('');
      setCustomerPhone('');
      fetchReservationData();
    } catch (err: any) {
      toast(`Reservation failed: ${err.message}`, 'error');
    }
  };

  const handleStatusTransition = async (resId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/v1/reservations/${resId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast(`Reservation status set to ${nextStatus}`, 'success');
      fetchReservationData();
    } catch (err: any) {
      toast(`Status update failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteReservation = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/v1/reservations/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast(`Reservation for ${deleteTarget.customerName} cancelled`, 'success');
      fetchReservationData();
    } catch (err: any) {
      toast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Table Reservations & Waitlist Queue</h1>
          <p className="text-xs text-muted-foreground">
            Guest booking calendar, table assignment, walk-ins management & SMS/WhatsApp notification hooks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-1.5 text-xs h-9">
            <Plus className="h-4 w-4" />
            <span>New Reservation / Walk-In</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Total Bookings Today</p>
            <h3 className="text-xl font-bold text-foreground font-mono mt-1">{reservations.length} Guests</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Seated Tables</p>
            <h3 className="text-xl font-bold text-emerald-500 font-mono mt-1">
              {reservations.filter(r => r.status === 'SEATED').length} Parties
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <UserCheck className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Confirmed Waitlist</p>
            <h3 className="text-xl font-bold text-amber-500 font-mono mt-1">
              {reservations.filter(r => r.status === 'CONFIRMED').length} Upcoming
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* RESERVATION LIST TABLE */}
      <Card>
        <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Booking & Waitlist Queue</CardTitle>
            <CardDescription className="text-xs">Manage guest arrival, seating & table assignment</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">{reservations.length} Total</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No reservations found. Click &quot;New Reservation / Walk-In&quot; above to book a table!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Guest Name & Contact</th>
                    <th className="p-3">Party Size</th>
                    <th className="p-3">Time Slot</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reservations.map(res => {
                    const isSeated = res.status === 'SEATED';
                    const isConfirmed = res.status === 'CONFIRMED';

                    return (
                      <tr key={res.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-foreground">{res.customerName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{res.customerPhone}</p>
                        </td>
                        <td className="p-3 font-mono font-bold text-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {res.guestCount} Guests
                          </span>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {new Date(res.reservationTime).toLocaleString()}
                        </td>
                        <td className="p-3 text-muted-foreground italic text-[11px]">
                          {res.notes || 'No special requests'}
                        </td>
                        <td className="p-3 text-center">
                          {isSeated ? (
                            <Badge variant="success" className="text-[10px]">SEATED</Badge>
                          ) : isConfirmed ? (
                            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">CONFIRMED</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">{res.status}</Badge>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {isConfirmed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusTransition(res.id, 'SEATED')}
                              className="h-7 text-[10px] gap-1"
                            >
                              <UserCheck className="h-3 w-3 text-emerald-500" />
                              <span>Seat Guest</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(res)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Reservation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">New Table Reservation / Walk-In</h3>
            <form onSubmit={handleCreateReservation} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Customer Full Name</label>
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                  <input
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+1 (555) 000-1122"
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Guest Count</label>
                  <input
                    type="number"
                    min="1"
                    value={guestCount}
                    onChange={e => setGuestCount(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Date & Time Slot</label>
                <input
                  type="datetime-local"
                  value={reservationTime}
                  onChange={e => setReservationTime(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Assign Table (Optional)</label>
                <select
                  value={tableId}
                  onChange={e => setTableId(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none"
                >
                  <option value="">-- Auto-Assign / Unassigned --</option>
                  {availableTables.map(t => (
                    <option key={t.id} value={t.id}>{t.label} ({t.capacity} Seats)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Special Requests / Notes</label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Window seat, anniversary occasion"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit">Confirm Reservation</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS / WhatsApp Notification Hook Preview Modal */}
      {showSmsModal && selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <MessageSquare className="h-5 w-5" />
              <h3 className="font-bold text-sm text-foreground">SMS & WhatsApp Notification Triggered</h3>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-2 font-mono">
              <p className="text-[10px] text-muted-foreground">Recipient: {selectedReservation.customerPhone}</p>
              <p className="text-foreground italic">
                &quot;Hi {selectedReservation.customerName}, your reservation at Trinetra Bistro for {selectedReservation.guestCount} guests at {new Date(selectedReservation.reservationTime).toLocaleTimeString()} is CONFIRMED!&quot;
              </p>
            </div>
            <Button onClick={() => setShowSmsModal(false)} className="w-full text-xs">
              Done / Close
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Cancel Table Reservation"
        description={`Are you sure you want to cancel reservation for "${deleteTarget?.customerName}"?`}
        confirmLabel="Cancel Booking"
        variant="destructive"
        onConfirm={handleDeleteReservation}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
