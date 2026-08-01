'use client';

import * as React from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  Trash2,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/modules/core/components/ui/card';
import { Button } from '@/modules/core/components/ui/button';
import { Badge } from '@/modules/core/components/ui/badge';
import { toast } from '@/modules/core/components/ui/toaster';
import { ConfirmDialog } from '@/modules/core/components/ui/confirm-dialog';
import { Skeleton } from '@/modules/core/components/ui/skeleton';

export default function InventoryBOMPage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = React.useState<any[]>([]);
  const [menuItems, setMenuItems] = React.useState<any[]>([]);
  const [recipeBoms, setRecipeBoms] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showBomModal, setShowBomModal] = React.useState(false);

  // Form states
  const [ingName, setIngName] = React.useState('');
  const [ingUnit, setIngUnit] = React.useState('KG');
  const [ingStock, setIngStock] = React.useState('50');
  const [ingReorder, setIngReorder] = React.useState('10');

  // BOM Form states
  const [selectedMenuItemId, setSelectedMenuItemId] = React.useState('');
  const [selectedIngredientId, setSelectedIngredientId] = React.useState('');
  const [bomQty, setBomQty] = React.useState('0.25');

  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);

  const fetchInventoryData = React.useCallback(async () => {
    if (!user?.branchId) return;
    try {
      const [ingRes, itemRes, bomRes] = await Promise.all([
        fetch(`/api/v1/ingredients?branchId=${user.branchId}`),
        fetch(`/api/v1/menu-items?branchId=${user.branchId}`),
        fetch(`/api/v1/recipes?branchId=${user.branchId}`)
      ]);
      const ingData = await ingRes.json();
      const itemData = await itemRes.json();
      const bomData = await bomRes.json();

      if (ingData.success) setIngredients(ingData.data);
      if (itemData.success) setMenuItems(itemData.data);
      if (bomData.success) setRecipeBoms(bomData.data);
    } catch (err: any) {
      toast(`Failed to load inventory: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId]);

  React.useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.branchId) return;
    try {
      const res = await fetch('/api/v1/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user.branchId,
          name: ingName,
          unitOfMeasure: ingUnit,
          currentStock: parseFloat(ingStock),
          reorderPoint: parseFloat(ingReorder)
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast(`Ingredient "${ingName}" created`, 'success');
      setShowAddModal(false);
      setIngName('');
      fetchInventoryData();
    } catch (err: any) {
      toast(`Failed to create ingredient: ${err.message}`, 'error');
    }
  };

  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuItemId || !selectedIngredientId) return;
    try {
      const res = await fetch('/api/v1/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: selectedMenuItemId,
          ingredientId: selectedIngredientId,
          quantityUsed: parseFloat(bomQty)
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast('Recipe BOM ingredient linked successfully!', 'success');
      setShowBomModal(false);
      fetchInventoryData();
    } catch (err: any) {
      toast(`Recipe BOM linking failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteIngredient = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/v1/ingredients/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast(`Ingredient "${deleteTarget.name}" deleted`, 'success');
      fetchInventoryData();
    } catch (err: any) {
      toast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const lowStockCount = React.useMemo(() => {
    return ingredients.filter(i => Number(i.currentStock) <= Number(i.reorderPoint)).length;
  }, [ingredients]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Inventory & Recipe Bill of Materials (BOM)</h1>
          <p className="text-xs text-muted-foreground">
            Ingredient stock levels, automated recipe breakdown, food cost per dish & profit margins
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowBomModal(true)} variant="outline" size="sm" className="gap-1.5 text-xs h-9">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Link Recipe BOM</span>
          </Button>
          <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-1.5 text-xs h-9">
            <Plus className="h-4 w-4" />
            <span>Add Ingredient</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Total Raw Ingredients</p>
            <h3 className="text-xl font-bold text-foreground font-mono mt-1">{ingredients.length} SKUs</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Boxes className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Low Stock Alerts</p>
            <h3 className="text-xl font-bold text-rose-500 font-mono mt-1">{lowStockCount} Reorder Items</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Configured Recipe BOMs</p>
            <h3 className="text-xl font-bold text-emerald-500 font-mono mt-1">{recipeBoms.length} Dish Recipes</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* MAIN CONTENT: INGREDIENTS TABLE & RECIPE BOM SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredient Stock Management Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Ingredient Stock Catalog</CardTitle>
                <CardDescription className="text-xs">Realtime stock on hand and reorder thresholds</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">{ingredients.length} Items</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : ingredients.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No ingredients configured. Click &quot;Add Ingredient&quot; above to seed inventory stock.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Ingredient Name</th>
                        <th className="p-3">Stock Unit</th>
                        <th className="p-3">Current Stock</th>
                        <th className="p-3">Reorder Point</th>
                        <th className="p-3 text-right">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ingredients.map(ing => {
                        const stockNum = Number(ing.currentStock);
                        const reorderNum = Number(ing.reorderPoint);
                        const isLow = stockNum <= reorderNum;

                        return (
                          <tr key={ing.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-semibold text-foreground">{ing.name}</td>
                            <td className="p-3 font-mono text-muted-foreground">{ing.unitOfMeasure}</td>
                            <td className="p-3 font-mono font-bold text-foreground">{stockNum.toFixed(2)}</td>
                            <td className="p-3 font-mono text-muted-foreground">{reorderNum.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              {isLow ? (
                                <Badge variant="destructive" className="text-[10px]">Reorder Urgently</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-500">In Stock</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(ing)}
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
        </div>

        {/* Recipe BOM Breakdown Side Panel */}
        <div>
          <Card>
            <CardHeader className="p-4 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold">Recipe Bill of Materials (BOM)</CardTitle>
              <CardDescription className="text-xs">Linked ingredients required per dish</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {recipeBoms.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No recipe BOM linkages found. Click &quot;Link Recipe BOM&quot; above to map dishes to raw ingredients.
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {recipeBoms.map(bom => (
                    <div key={bom.id} className="p-3 rounded-lg border border-border bg-card space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">{bom.menuItem.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          ${(bom.menuItem.basePriceCents / 100).toFixed(2)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>Requires: {bom.ingredient.name}</span>
                        <span className="font-mono font-semibold text-primary">
                          {Number(bom.quantityUsed).toFixed(2)} {bom.ingredient.unitOfMeasure}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Add New Inventory Ingredient</h3>
            <form onSubmit={handleCreateIngredient} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Ingredient Name</label>
                <input
                  value={ingName}
                  onChange={e => setIngName(e.target.value)}
                  placeholder="e.g. San Marzano Tomatoes, Angus Ribeye"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Unit</label>
                  <select
                    value={ingUnit}
                    onChange={e => setIngUnit(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-card px-2 text-xs outline-none"
                  >
                    <option value="KG">KG</option>
                    <option value="GRAM">GRAM</option>
                    <option value="LITER">LITER</option>
                    <option value="ML">ML</option>
                    <option value="PCS">PCS</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Initial Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ingStock}
                    onChange={e => setIngStock(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Reorder Point</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ingReorder}
                    onChange={e => setIngReorder(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none font-mono"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit">Save Ingredient</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Recipe BOM Modal */}
      {showBomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Link Recipe Bill of Materials (BOM)</h3>
            <form onSubmit={handleCreateBom} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Select Menu Dish</label>
                <select
                  value={selectedMenuItemId}
                  onChange={e => setSelectedMenuItemId(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none"
                  required
                >
                  <option value="">-- Choose Menu Dish --</option>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (${(item.basePriceCents / 100).toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Select Raw Ingredient</label>
                <select
                  value={selectedIngredientId}
                  onChange={e => setSelectedIngredientId(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none"
                  required
                >
                  <option value="">-- Choose Ingredient --</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unitOfMeasure})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Quantity Required per Dish Portion</label>
                <input
                  type="number"
                  step="0.001"
                  value={bomQty}
                  onChange={e => setBomQty(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowBomModal(false)}>Cancel</Button>
                <Button type="submit">Save Recipe BOM Link</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Ingredient SKU"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action will remove ingredient stock tracking.`}
        confirmLabel="Delete Ingredient"
        variant="destructive"
        onConfirm={handleDeleteIngredient}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
