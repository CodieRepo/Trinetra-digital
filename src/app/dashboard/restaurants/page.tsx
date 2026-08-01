'use client';

import * as React from 'react';
import { Store, MapPin, Plus, Phone } from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/modules/core/components/ui/card';
import { Button } from '@/modules/core/components/ui/button';
import { Badge } from '@/modules/core/components/ui/badge';
import { toast } from '@/modules/core/components/ui/toaster';

export default function RestaurantManagementPage() {
  const { user, can } = useAuth();
  const [restaurants, setRestaurants] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showRestModal, setShowRestModal] = React.useState(false);
  const [showBranchModal, setShowBranchModal] = React.useState<string | null>(null);

  const fetchRestaurants = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/restaurants');
      const data = await res.json();
      if (data.success) setRestaurants(data.data);
    } catch (err: any) {
      toast(`Failed to load restaurants: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Restaurant & Branch Management</h1>
          <p className="text-xs text-muted-foreground">Manage multi-tenant brand structures and physical outlet locations</p>
        </div>

        {can('settings:manage') && (
          <Button onClick={() => setShowRestModal(true)} className="gap-2 text-xs h-9">
            <Plus className="h-4 w-4" />
            <span>Add Restaurant Brand</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading restaurant hierarchy...</div>
      ) : restaurants.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Store className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-foreground">No Restaurants Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create a restaurant brand to start setting up floors, tables, and menu items.</p>
          <Button onClick={() => setShowRestModal(true)} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            <span>Create First Restaurant</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {restaurants.map(rest => (
            <Card key={rest.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{rest.name}</CardTitle>
                    <CardDescription className="text-xs">{rest.cuisineType || 'General Dining'} • ID: {rest.id.slice(0, 8)}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setShowBranchModal(rest.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Outlet Branch</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configured Outlet Branches ({rest.branches.length})</div>
                {rest.branches.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-3 rounded border border-dashed border-border text-center">No outlet branches configured for this restaurant.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rest.branches.map((br: any) => (
                      <div key={br.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm text-foreground">{br.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">{br.currency}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{br.address}</p>
                        {br.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{br.phone}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Restaurant Modal */}
      {showRestModal && (
        <CreateRestaurantModal
          onClose={() => setShowRestModal(false)}
          onSuccess={() => {
            setShowRestModal(false);
            fetchRestaurants();
          }}
          organizationId={user.organizationId}
        />
      )}

      {/* Add Branch Modal */}
      {showBranchModal && (
        <CreateBranchModal
          restaurantId={showBranchModal}
          onClose={() => setShowBranchModal(null)}
          onSuccess={() => {
            setShowBranchModal(null);
            fetchRestaurants();
          }}
        />
      )}
    </div>
  );
}

function CreateRestaurantModal({ onClose, onSuccess, organizationId }: { onClose: () => void; onSuccess: () => void; organizationId: string }) {
  const [name, setName] = React.useState('');
  const [cuisineType, setCuisineType] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, name, cuisineType })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast(`Restaurant "${name}" created`, 'success');
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
        <h3 className="text-base font-bold text-foreground">Add New Restaurant Brand</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Restaurant Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Saffron Fine Dining"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Cuisine Type</label>
            <input
              value={cuisineType}
              onChange={e => setCuisineType(e.target.value)}
              placeholder="e.g. Indian Fusion & North Indian"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Restaurant'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateBranchModal({ restaurantId, onClose, onSuccess }: { restaurantId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [currency, setCurrency] = React.useState('USD');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, name, address, phone, currency })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast(`Branch "${name}" created`, 'success');
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
        <h3 className="text-base font-bold text-foreground">Add New Outlet Branch</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Branch Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Park Street Outlet"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Address</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 104 Park Street Ave"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Currency Code</label>
              <input
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                placeholder="USD / INR"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Branch'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
