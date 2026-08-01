'use client';

import * as React from 'react';
import { Grid, Plus, Trash2, Users, Layers } from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/modules/core/components/ui/card';
import { Button } from '@/modules/core/components/ui/button';
import { Badge } from '@/modules/core/components/ui/badge';
import { toast } from '@/modules/core/components/ui/toaster';

export default function TableManagementPage() {
  const { user, can } = useAuth();
  const [floors, setFloors] = React.useState<any[]>([]);
  const [activeFloorId, setActiveFloorId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showFloorModal, setShowFloorModal] = React.useState(false);
  const [showTableModal, setShowTableModal] = React.useState(false);

  const fetchFloors = React.useCallback(async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/v1/floors?branchId=${user.branchId}`);
      const data = await res.json();
      if (data.success) {
        setFloors(data.data);
        if (data.data.length > 0 && !activeFloorId) {
          setActiveFloorId(data.data[0].id);
        }
      }
    } catch (err: any) {
      toast(`Failed to load floors: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId, activeFloorId]);

  React.useEffect(() => {
    fetchFloors();
  }, [fetchFloors]);

  const activeFloor = React.useMemo(() => {
    return floors.find(f => f.id === activeFloorId) || floors[0];
  }, [floors, activeFloorId]);

  const handleDeleteFloor = async (floorId: string) => {
    if (!confirm('Are you sure you want to delete this floor and all its tables?')) return;
    try {
      const res = await fetch(`/api/v1/floors/${floorId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast('Floor deleted', 'success');
      setActiveFloorId(null);
      fetchFloors();
    } catch (err: any) {
      toast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Delete table?')) return;
    try {
      const res = await fetch(`/api/v1/tables/${tableId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast('Table deleted', 'success');
      fetchFloors();
    } catch (err: any) {
      toast(`Delete failed: ${err.message}`, 'error');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Floor & Table Management</h1>
          <p className="text-xs text-muted-foreground">
            Configure floorplan layout, dining sections, table capacities and 2D positions for <span className="font-semibold text-foreground">{user.branchName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can('settings:manage') && (
            <>
              <Button variant="outline" onClick={() => setShowFloorModal(true)} className="gap-1.5 text-xs h-9">
                <Layers className="h-4 w-4" />
                <span>New Floor Section</span>
              </Button>
              <Button onClick={() => setShowTableModal(true)} disabled={!activeFloor} className="gap-1.5 text-xs h-9">
                <Plus className="h-4 w-4" />
                <span>Add Dining Table</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading floorplan data...</div>
      ) : floors.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Grid className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-foreground">No Floors Configured</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create a floor section (e.g., &quot;Ground Floor&quot;, &quot;Rooftop Terrace&quot;) to start adding dining tables.</p>
          <Button onClick={() => setShowFloorModal(true)} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            <span>Create First Floor</span>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Floor Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {floors.map(fl => (
                <button
                  key={fl.id}
                  onClick={() => setActiveFloorId(fl.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    activeFloorId === fl.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{fl.name}</span>
                  <Badge variant={activeFloorId === fl.id ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0 font-mono">
                    {fl.tables.length}
                  </Badge>
                </button>
              ))}
            </div>

            {activeFloor && can('settings:manage') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => handleDeleteFloor(activeFloor.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Floor</span>
              </Button>
            )}
          </div>

          {/* 2D Table Layout Grid Canvas */}
          {activeFloor && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border bg-muted/20">
                <div>
                  <CardTitle className="text-sm font-semibold">{activeFloor.name} Floorplan</CardTitle>
                  <CardDescription className="text-xs">{activeFloor.tables.length} dining table(s) configured in this section</CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Occupied</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Reserved</span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {activeFloor.tables.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No tables created on {activeFloor.name}. Click &quot;Add Dining Table&quot; to create one.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {activeFloor.tables.map((tb: any) => {
                      const isAvailable = tb.status === 'AVAILABLE';
                      const isOccupied = tb.status === 'OCCUPIED';
                      return (
                        <div
                          key={tb.id}
                          className={`relative flex flex-col items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${
                            isAvailable
                              ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500'
                              : isOccupied
                                ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500'
                                : 'border-border bg-card'
                          }`}
                        >
                          {/* Status Badge */}
                          <span
                            className={`absolute top-2 right-2 h-2 w-2 rounded-full ${
                              isAvailable ? 'bg-emerald-500' : isOccupied ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                          />

                          <div className="text-center my-2">
                            <span className="font-extrabold text-base text-foreground">{tb.label}</span>
                            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mt-1">
                              <Users className="h-3 w-3" />
                              <span>{tb.capacity} Seats</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 mt-2 w-full justify-between pt-2 border-t border-border/50 text-[10px]">
                            <span className="font-mono text-muted-foreground">{tb.shape}</span>
                            {can('settings:manage') && (
                              <button
                                onClick={() => handleDeleteTable(tb.id)}
                                className="text-destructive hover:text-destructive/80 p-1"
                                title="Delete table"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create Floor Modal */}
      {showFloorModal && (
        <CreateFloorModal
          branchId={user.branchId}
          onClose={() => setShowFloorModal(false)}
          onSuccess={() => {
            setShowFloorModal(false);
            fetchFloors();
          }}
        />
      )}

      {/* Create Table Modal */}
      {showTableModal && activeFloor && (
        <CreateTableModal
          floorId={activeFloor.id}
          onClose={() => setShowTableModal(false)}
          onSuccess={() => {
            setShowTableModal(false);
            fetchFloors();
          }}
        />
      )}
    </div>
  );
}

function CreateFloorModal({ branchId, onClose, onSuccess }: { branchId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, name })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast(`Floor "${name}" created`, 'success');
      onSuccess();
    } catch (err: any) {
      toast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-foreground">Create Floor Section</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Floor Section Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ground Floor, Main Dining Room, VIP Terrace"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Floor'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateTableModal({ floorId, onClose, onSuccess }: { floorId: string; onClose: () => void; onSuccess: () => void }) {
  const [label, setLabel] = React.useState('');
  const [capacity, setCapacity] = React.useState(4);
  const [shape, setShape] = React.useState<'SQUARE' | 'ROUND' | 'RECTANGLE'>('SQUARE');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floorId, label, capacity, shape })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast(`Table "${label}" added`, 'success');
      onSuccess();
    } catch (err: any) {
      toast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-foreground">Add Dining Table</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Table Label / Identifier</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. T-01, Table 12, Booth 4"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Seat Capacity</label>
              <input
                type="number"
                min="1"
                max="20"
                value={capacity}
                onChange={e => setCapacity(parseInt(e.target.value) || 1)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Table Shape</label>
              <select
                value={shape}
                onChange={e => setShape(e.target.value as any)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none"
              >
                <option value="SQUARE">Square</option>
                <option value="ROUND">Round</option>
                <option value="RECTANGLE">Rectangle</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Add Table'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
