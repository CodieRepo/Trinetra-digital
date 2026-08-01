'use client';

import * as React from 'react';
import {
  Utensils,
  Receipt,
  ArrowRightLeft,
  Sparkles,
  Printer,
  X
} from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/modules/core/components/ui/card';
import { Button } from '@/modules/core/components/ui/button';
import { Badge } from '@/modules/core/components/ui/badge';
import { toast } from '@/modules/core/components/ui/toaster';

const ORDER_STATUS_FLOW: Array<{ key: string; label: string; color: string }> = [
  { key: 'DRAFT', label: 'Draft', color: 'bg-slate-500' },
  { key: 'PLACED', label: 'Placed', color: 'bg-blue-500' },
  { key: 'PREPARING', label: 'Preparing', color: 'bg-amber-500' },
  { key: 'READY_TO_SERVE', label: 'Ready', color: 'bg-purple-500' },
  { key: 'SERVED', label: 'Served', color: 'bg-emerald-500' },
  { key: 'BILLING', label: 'Billing', color: 'bg-indigo-500' },
  { key: 'PAID', label: 'Paid', color: 'bg-teal-500' },
  { key: 'CLOSED', label: 'Closed', color: 'bg-slate-700' }
];

export default function OrderEnginePage() {
  const { user, can } = useAuth();
  const [floors, setFloors] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [activeOrders, setActiveOrders] = React.useState<any[]>([]);
  const [selectedTable, setSelectedTable] = React.useState<any | null>(null);
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
  const [cart, setCart] = React.useState<Array<{ menuItemId: string; name: string; unitPriceCents: number; quantity: number }>>([]);
  const [discountCents, setDiscountCents] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);

  const loadWorkbenchData = React.useCallback(async () => {
    if (!user?.branchId) return;
    try {
      const [flRes, catRes, ordRes] = await Promise.all([
        fetch(`/api/v1/floors?branchId=${user.branchId}`),
        fetch(`/api/v1/categories?branchId=${user.branchId}`),
        fetch(`/api/v1/orders?branchId=${user.branchId}`)
      ]);
      const flData = await flRes.json();
      const catData = await catRes.json();
      const ordData = await ordRes.json();

      if (flData.success) setFloors(flData.data);
      if (catData.success) setCategories(catData.data);
      if (ordData.success) setActiveOrders(ordData.data);
    } catch (err: any) {
      toast(`Failed to load workbench: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId]);

  React.useEffect(() => {
    loadWorkbenchData();
  }, [loadWorkbenchData]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/v1/seed', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast('Demo restaurant data seeded successfully!', 'success');
      loadWorkbenchData();
    } catch (err: any) {
      toast(`Seed failed: ${err.message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSelectTable = (table: any) => {
    setSelectedTable(table);
    // Check if table has active order
    const existing = activeOrders.find(o => o.tableId === table.id && o.status !== 'CLOSED' && o.status !== 'CANCELLED');
    if (existing) {
      setSelectedOrder(existing);
      setDiscountCents(existing.discountCents || 0);
    } else {
      setSelectedOrder(null);
      setCart([]);
    }
  };

  const handleAddToCart = (item: any) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(i => i.menuItemId === item.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      }
      return [...prev, { menuItemId: item.id, name: item.name, unitPriceCents: item.basePriceCents, quantity: 1 }];
    });
  };

  const handleCreateDineInOrder = async () => {
    if (cart.length === 0 || !selectedTable) return;
    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user!.branchId,
          tableId: selectedTable.id,
          orderType: 'DINE_IN',
          items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast(`Order ${data.data.orderNumber} created for Table ${selectedTable.label}`, 'success');
      setSelectedOrder(data.data);
      setCart([]);
      loadWorkbenchData();
    } catch (err: any) {
      toast(`Order creation failed: ${err.message}`, 'error');
    }
  };

  const handleStatusTransition = async (nextStatus: string) => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, discountCents })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast(`Order status changed to ${nextStatus}`, 'success');
      setSelectedOrder(data.data);
      loadWorkbenchData();
    } catch (err: any) {
      toast(`Status update failed: ${err.message}`, 'error');
    }
  };

  const handleProcessPayment = async (paymentMethod: 'CASH' | 'CARD' | 'UPI') => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          amountCents: selectedOrder.totalAmountCents
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast(`Payment processed via ${paymentMethod}. Order closed!`, 'success');
      setSelectedOrder(data.data.order);
      setShowReceiptModal(true);
      loadWorkbenchData();
    } catch (err: any) {
      toast(`Payment failed: ${err.message}`, 'error');
    }
  };

  // Minor unit financial calculations
  const cartSubtotalCents = React.useMemo(() => {
    if (selectedOrder) return selectedOrder.subtotalCents;
    return cart.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0);
  }, [selectedOrder, cart]);

  const cartTaxCents = React.useMemo(() => {
    if (selectedOrder) return selectedOrder.taxCents;
    return Math.round((cartSubtotalCents * 8) / 100);
  }, [selectedOrder, cartSubtotalCents]);

  const cartTotalCents = React.useMemo(() => {
    if (selectedOrder) return selectedOrder.totalAmountCents;
    return Math.max(0, cartSubtotalCents + cartTaxCents - discountCents);
  }, [selectedOrder, cartSubtotalCents, cartTaxCents, discountCents]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Order Engine & Table Operations</h1>
          <p className="text-xs text-muted-foreground">
            Dine-in lifecycle, table session management, item modifiers & minor-unit receipt generation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedData}
            disabled={isSeeding}
            className="gap-1.5 text-xs h-9"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{isSeeding ? 'Seeding Data...' : 'Seed Presentation Data'}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── COLUMN 1 & 2: TABLE GRID & MENU SELECTION ────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Table Sessions Selector */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Select Table Session</CardTitle>
                <CardDescription className="text-xs">Click a table to manage session or create a new order</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">{floors.reduce((a, f) => a + f.tables.length, 0)} Tables</Badge>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Loading tables...</div>
              ) : floors.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No floor sections found. Click &quot;Seed Presentation Data&quot; to auto-generate tables!
                </div>
              ) : (
                <div className="space-y-4">
                  {floors.map(fl => (
                    <div key={fl.id} className="space-y-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{fl.name}</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {fl.tables.map((tb: any) => {
                          const isSelected = selectedTable?.id === tb.id;
                          const isOccupied = tb.status === 'OCCUPIED';
                          const isBilling = tb.status === 'BILLING';
                          return (
                            <button
                              key={tb.id}
                              onClick={() => handleSelectTable(tb)}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs transition-all ${
                                isSelected
                                  ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-md'
                                  : isOccupied
                                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                                    : isBilling
                                      ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-500'
                                      : 'border-emerald-500/40 bg-emerald-500/5 text-foreground hover:border-emerald-500'
                              }`}
                            >
                              <span className="font-extrabold text-sm">{tb.label}</span>
                              <span className="text-[10px] opacity-80 mt-0.5">{tb.status}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Menu Item Catalog Selection */}
          {selectedTable && (
            <Card>
              <CardHeader className="p-4 pb-2 border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-semibold">Select Menu Dishes for {selectedTable.label}</CardTitle>
                <CardDescription className="text-xs">Click items to add to order cart</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {categories.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No menu categories available.</div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="space-y-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat.name}</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cat.items.map((dish: any) => (
                          <button
                            key={dish.id}
                            disabled={selectedOrder && selectedOrder.status === 'CLOSED'}
                            onClick={() => handleAddToCart(dish)}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left disabled:opacity-50"
                          >
                            <div>
                              <p className="font-semibold text-xs text-foreground">{dish.name}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{dish.description}</p>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs font-bold shrink-0 ml-2">
                              ${(dish.basePriceCents / 100).toFixed(2)}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── COLUMN 3: ACTIVE ORDER SESSION & CHECKOUT PANEL ──────── */}
        <div>
          <Card className="sticky top-6">
            <CardHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">
                  {selectedTable ? `Session: ${selectedTable.label}` : 'Select a Table'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedOrder ? `Order #${selectedOrder.orderNumber}` : 'New Order Session'}
                </CardDescription>
              </div>

              {selectedOrder && can('pos:order:create') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTransferModal(true)}
                  className="h-7 text-xs gap-1"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>Transfer</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {!selectedTable ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Select a table on the left to begin an order session.</div>
              ) : (
                <>
                  {/* Order Status Stepper Bar */}
                  {selectedOrder && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order Lifecycle Phase</label>
                      <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {ORDER_STATUS_FLOW.map(st => {
                          const isActive = selectedOrder.status === st.key;
                          return (
                            <button
                              key={st.key}
                              onClick={() => handleStatusTransition(st.key)}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all whitespace-nowrap ${
                                isActive ? `${st.color} text-white shadow-sm ring-1 ring-white/50` : 'bg-muted text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              {st.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cart / Order Items List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Itemized Cart Breakdown</label>
                    {selectedOrder ? (
                      selectedOrder.items.map((i: any) => (
                        <div key={i.id} className="flex items-center justify-between p-2 rounded border border-border bg-muted/20 text-xs">
                          <div>
                            <p className="font-semibold text-foreground">{i.menuItem.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{i.quantity} x ${(i.unitPriceCents / 100).toFixed(2)}</p>
                          </div>
                          <span className="font-mono font-bold">${(i.totalPriceCents / 100).toFixed(2)}</span>
                        </div>
                      ))
                    ) : cart.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded">Cart is empty. Click dishes to add items.</div>
                    ) : (
                      cart.map((i, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded border border-border bg-card text-xs">
                          <div>
                            <p className="font-semibold text-foreground">{i.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{i.quantity} x ${(i.unitPriceCents / 100).toFixed(2)}</p>
                          </div>
                          <span className="font-mono font-bold">${((i.unitPriceCents * i.quantity) / 100).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="space-y-1.5 pt-3 border-t border-border text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-mono">${(cartSubtotalCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (8%):</span>
                      <span className="font-mono">${(cartTaxCents / 100).toFixed(2)}</span>
                    </div>
                    {discountCents > 0 && (
                      <div className="flex justify-between text-emerald-500 font-semibold">
                        <span>Discount Applied:</span>
                        <span className="font-mono">-${(discountCents / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                      <span>Total Amount:</span>
                      <span className="font-mono text-primary">${(cartTotalCents / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Order Actions */}
                  {!selectedOrder ? (
                    <Button onClick={handleCreateDineInOrder} disabled={cart.length === 0} className="w-full gap-2 mt-2">
                      <Utensils className="h-4 w-4" />
                      <span>Place Dine-in Order</span>
                    </Button>
                  ) : selectedOrder.status !== 'CLOSED' ? (
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-3 gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleProcessPayment('CASH')} className="text-xs">Cash</Button>
                        <Button variant="outline" size="sm" onClick={() => handleProcessPayment('CARD')} className="text-xs">Card</Button>
                        <Button variant="outline" size="sm" onClick={() => handleProcessPayment('UPI')} className="text-xs">UPI</Button>
                      </div>
                      <Button onClick={() => setShowReceiptModal(true)} variant="secondary" className="w-full gap-2 text-xs">
                        <Receipt className="h-4 w-4" />
                        <span>View Printable Receipt</span>
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="success" className="w-full justify-center py-2 text-xs">
                      Session Closed & Paid
                    </Badge>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table Transfer Modal */}
      {showTransferModal && selectedOrder && (
        <TransferModal
          orderId={selectedOrder.id}
          floors={floors}
          currentTableId={selectedTable.id}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            loadWorkbenchData();
          }}
        />
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && selectedOrder && (
        <ReceiptModal
          order={selectedOrder}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}

function TransferModal({ orderId, floors, currentTableId, onClose, onSuccess }: { orderId: string; floors: any[]; currentTableId: string; onClose: () => void; onSuccess: () => void }) {
  const [targetTableId, setTargetTableId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const availableTables = React.useMemo(() => {
    const list: any[] = [];
    floors.forEach(f => {
      f.tables.forEach((t: any) => {
        if (t.id !== currentTableId && t.status === 'AVAILABLE') list.push(t);
      });
    });
    return list;
  }, [floors, currentTableId]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTableId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast('Order transferred to target table', 'success');
      onSuccess();
    } catch (err: any) {
      toast(`Transfer failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-foreground">Transfer Table Session</h3>
        <form onSubmit={handleTransfer} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Select Destination Table</label>
            <select
              value={targetTableId}
              onChange={e => setTargetTableId(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none"
              required
            >
              <option value="">-- Choose Available Table --</option>
              {availableTables.map(t => (
                <option key={t.id} value={t.id}>{t.label} ({t.capacity} Seats)</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Transferring...' : 'Confirm Transfer'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReceiptModal({ order, onClose }: { order: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-sm text-foreground uppercase">Trinetra Bistro</h3>
            <p className="text-[10px] text-muted-foreground">Tax Invoice / Receipt</p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] space-y-1 text-muted-foreground">
          <p>Receipt #: {order.orderNumber}</p>
          <p>Table: {order.table ? order.table.label : 'N/A'}</p>
          <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
        </div>

        <div className="space-y-1.5 border-t border-b border-border py-2 text-xs">
          {order.items.map((i: any) => (
            <div key={i.id} className="flex justify-between">
              <span>{i.quantity}x {i.menuItem.name}</span>
              <span>${(i.totalPriceCents / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span>Subtotal:</span><span>${(order.subtotalCents / 100).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax:</span><span>${(order.taxCents / 100).toFixed(2)}</span></div>
          {order.discountCents > 0 && <div className="flex justify-between text-emerald-500"><span>Discount:</span><span>-${(order.discountCents / 100).toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-border"><span>TOTAL:</span><span>${(order.totalAmountCents / 100).toFixed(2)}</span></div>
        </div>

        <Button onClick={() => window.print()} className="w-full gap-2 text-xs">
          <Printer className="h-4 w-4" />
          <span>Print Thermal Receipt</span>
        </Button>
      </div>
    </div>
  );
}
