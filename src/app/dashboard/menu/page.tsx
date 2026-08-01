'use client';

import * as React from 'react';
import { UtensilsCrossed, Plus, Trash2, Edit3, Search, FolderPlus, Check, X } from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/modules/core/components/ui/card';
import { Button } from '@/modules/core/components/ui/button';
import { Badge } from '@/modules/core/components/ui/badge';
import { toast } from '@/modules/core/components/ui/toaster';

export default function MenuManagementPage() {
  const { user, can } = useAuth();
  const [categories, setCategories] = React.useState<any[]>([]);
  const [menuItems, setMenuItems] = React.useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [showItemModal, setShowItemModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);

  const fetchMenuData = React.useCallback(async () => {
    if (!user?.branchId) return;
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch(`/api/v1/categories?branchId=${user.branchId}`),
        fetch(`/api/v1/menu-items?branchId=${user.branchId}`)
      ]);
      const catData = await catRes.json();
      const itemData = await itemRes.json();

      if (catData.success) setCategories(catData.data);
      if (itemData.success) setMenuItems(itemData.data);
    } catch (err: any) {
      toast(`Failed to load menu data: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId]);

  React.useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  const filteredItems = React.useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategoryId === 'ALL' || item.categoryId === selectedCategoryId;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  const handleToggleAvailability = async (item: any) => {
    // Optimistic UI update
    const newStatus = !item.isAvailable;
    setMenuItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, isAvailable: newStatus } : i))
    );

    try {
      const res = await fetch(`/api/v1/menu-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast(`Availability updated for "${item.name}"`, 'success');
    } catch (err: any) {
      // Revert optimistic update on failure
      setMenuItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i))
      );
      toast(`Update failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete category and all its menu items?')) return;
    try {
      const res = await fetch(`/api/v1/categories/${categoryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast('Category deleted', 'success');
      setSelectedCategoryId('ALL');
      fetchMenuData();
    } catch (err: any) {
      toast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete menu item?')) return;
    try {
      const res = await fetch(`/api/v1/menu-items/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast('Menu item deleted', 'success');
      fetchMenuData();
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
          <h1 className="text-xl font-bold tracking-tight text-foreground">Menu & Pricing Catalog</h1>
          <p className="text-xs text-muted-foreground">
            Manage food categories, dish items, prices in minor units, availability and tax rates for <span className="font-semibold text-foreground">{user.branchName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can('menu:manage') && (
            <>
              <Button variant="outline" onClick={() => setShowCategoryModal(true)} className="gap-1.5 text-xs h-9">
                <FolderPlus className="h-4 w-4" />
                <span>New Category</span>
              </Button>
              <Button onClick={() => setShowItemModal(true)} disabled={categories.length === 0} className="gap-1.5 text-xs h-9">
                <Plus className="h-4 w-4" />
                <span>Add Menu Dish</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Categories List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories ({categories.length})</h3>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                selectedCategoryId === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-foreground hover:bg-accent border border-border'
              }`}
            >
              <span>All Menu Items</span>
              <Badge variant={selectedCategoryId === 'ALL' ? 'secondary' : 'outline'} className="text-[10px] font-mono">
                {menuItems.length}
              </Badge>
            </button>

            {categories.map(cat => (
              <div key={cat.id} className="group relative flex items-center justify-between">
                <button
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card text-foreground hover:bg-accent border border-border'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <Badge variant={selectedCategoryId === cat.id ? 'secondary' : 'outline'} className="text-[10px] font-mono">
                    {cat.items ? cat.items.length : 0}
                  </Badge>
                </button>
                {can('menu:manage') && (
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="ml-1 opacity-0 group-hover:opacity-100 p-1 text-destructive hover:text-destructive/80 transition-opacity"
                    title="Delete Category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items Grid Area */}
        <div className="md:col-span-3 space-y-4">
          {/* Search Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search dishes or description..."
                className="flex h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading menu items...</div>
          ) : filteredItems.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">No Menu Items Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create menu categories and dishes to build your digital restaurant catalog.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className="flex flex-col justify-between overflow-hidden">
                  <CardHeader className="p-4 pb-2 space-y-1">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-bold truncate">{item.name}</CardTitle>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                        ${(item.basePriceCents / 100).toFixed(2)}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-[11px] text-muted-foreground">Category: {item.category?.name || 'Unassigned'}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">Tax: {Number(item.taxRatePercent)}%</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {/* Availability Toggle */}
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          item.isAvailable
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'bg-destructive/15 text-destructive border border-destructive/30'
                        }`}
                      >
                        {item.isAvailable ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{item.isAvailable ? 'In Stock' : '86\'d (Out)'}</span>
                      </button>

                      {can('menu:manage') && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowItemModal(true);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit dish"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-destructive hover:text-destructive/80 transition-colors"
                            title="Delete dish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      {showCategoryModal && (
        <CreateCategoryModal
          branchId={user.branchId}
          onClose={() => setShowCategoryModal(false)}
          onSuccess={() => {
            setShowCategoryModal(false);
            fetchMenuData();
          }}
        />
      )}

      {/* Create / Edit Menu Item Modal */}
      {showItemModal && (
        <CreateOrEditItemModal
          categories={categories}
          initialItem={editingItem}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setShowItemModal(false);
            setEditingItem(null);
            fetchMenuData();
          }}
        />
      )}
    </div>
  );
}

function CreateCategoryModal({ branchId, onClose, onSuccess }: { branchId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, name })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast(`Category "${name}" created`, 'success');
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
        <h3 className="text-base font-bold text-foreground">Add Menu Category</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Category Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Starters, Main Course, Beverages, Desserts"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Category'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateOrEditItemModal({ categories, initialItem, onClose, onSuccess }: { categories: any[]; initialItem?: any; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = React.useState(initialItem?.name || '');
  const [description, setDescription] = React.useState(initialItem?.description || '');
  const [priceDollars, setPriceDollars] = React.useState(initialItem ? (initialItem.basePriceCents / 100).toString() : '12.99');
  const [categoryId, setCategoryId] = React.useState(initialItem?.categoryId || (categories[0] ? categories[0].id : ''));
  const [taxRatePercent, setTaxRatePercent] = React.useState(initialItem ? Number(initialItem.taxRatePercent) : 8.0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const priceCents = Math.round(parseFloat(priceDollars) * 100);
      const url = initialItem ? `/api/v1/menu-items/${initialItem.id}` : '/api/v1/menu-items';
      const method = initialItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          basePriceCents: priceCents,
          categoryId,
          taxRatePercent
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast(`Menu Dish ${initialItem ? 'updated' : 'created'}`, 'success');
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
        <h3 className="text-base font-bold text-foreground">{initialItem ? 'Edit Menu Dish' : 'Add New Menu Dish'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Dish Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Truffle Mushroom Risotto"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none"
              required
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Base Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceDollars}
                onChange={e => setPriceDollars(e.target.value)}
                placeholder="12.99"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={taxRatePercent}
                onChange={e => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Arborio rice, wild forest mushrooms, white truffle oil, and aged parmesan."
              className="mt-1 flex h-20 w-full rounded-md border border-input bg-transparent p-3 text-xs outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Dish'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
