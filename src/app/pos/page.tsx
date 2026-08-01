'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  Sliders,
  Printer,
  X
} from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Button } from '@/modules/core/components/ui/button';
import { Badge } from '@/modules/core/components/ui/badge';
import { toast } from '@/modules/core/components/ui/toaster';
import { ThemeToggle } from '@/modules/core/components/theme-toggle';

export default function POSBillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = React.useState<any[]>([]);
  const [menuItems, setMenuItems] = React.useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [cart, setCart] = React.useState<Array<{ menuItemId: string; name: string; unitPriceCents: number; quantity: number; notes?: string }>>([]);
  const [discountCents, setDiscountCents] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = React.useState(false);
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);
  const [completedOrder, setCompletedOrder] = React.useState<any | null>(null);

  const fetchMenu = React.useCallback(async () => {
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
      toast(`Failed to load menu: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId]);

  React.useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // POS Keyboard Shortcuts (F1, F2, F3, F4)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) setShowSplitPaymentModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const filteredItems = React.useMemo(() => {
    return menuItems.filter(item => {
      const matchesCat = selectedCategoryId === 'ALL' || item.categoryId === selectedCategoryId;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  const handleAddToCart = (dish: any) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(i => i.menuItemId === dish.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      }
      return [...prev, { menuItemId: dish.id, name: dish.name, unitPriceCents: dish.basePriceCents, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (menuItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.menuItemId === menuItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as typeof prev;
    });
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountCents(0);
  };

  // Financial minor unit calculations
  const subtotalCents = React.useMemo(() => {
    return cart.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0);
  }, [cart]);

  const taxCents = React.useMemo(() => Math.round((subtotalCents * 8) / 100), [subtotalCents]);
  const totalAmountCents = React.useMemo(() => Math.max(0, subtotalCents + taxCents - discountCents), [subtotalCents, taxCents, discountCents]);

  const handleSinglePayment = async (paymentMethod: 'CASH' | 'CARD' | 'UPI') => {
    if (cart.length === 0 || !user) return;
    try {
      // 1. Create Order
      const ordRes = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user.branchId,
          orderType: 'TAKEAWAY',
          items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
        })
      });
      const ordData = await ordRes.json();
      if (!ordData.success) throw new Error(ordData.error);

      // 2. Process Payment
      const payRes = await fetch(`/api/v1/orders/${ordData.data.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          amountCents: totalAmountCents
        })
      });
      const payData = await payRes.json();
      if (!payData.success) throw new Error(payData.error);

      toast(`POS Order #${ordData.data.orderNumber} Paid via ${paymentMethod}`, 'success');
      setCompletedOrder(payData.data.order);
      setShowReceiptModal(true);
      handleClearCart();
    } catch (err: any) {
      toast(`Checkout failed: ${err.message}`, 'error');
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* POS Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} title="Back to Dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-foreground">POS Terminal — {user.branchName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs hidden sm:flex">
            Shortcut Keys: [F2] Search • [F4] Checkout
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      {/* Main POS Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: DISH CATALOG */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              id="pos-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search dish or press [F2]..."
              className="flex h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategoryId === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-accent border border-border'
              }`}
            >
              All Items ({menuItems.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card text-muted-foreground hover:bg-accent border border-border'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Dishes Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading menu items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No available dishes found.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredItems.map(dish => (
                  <button
                    key={dish.id}
                    onClick={() => handleAddToCart(dish)}
                    className="flex flex-col justify-between p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-accent transition-all text-left shadow-sm group"
                  >
                    <div>
                      <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">{dish.name}</span>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{dish.description}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-primary">${(dish.basePriceCents / 100).toFixed(2)}</span>
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS CASHIER CART & CHECKOUT PANEL */}
        <div className="w-80 sm:w-96 flex flex-col bg-card shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Cashier Checkout Cart</h3>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearCart} className="h-7 text-xs text-destructive gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </Button>
            )}
          </div>

          {/* Cart Item Lines */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                Cart is empty. Select dishes on the left to build POS bill.
              </div>
            ) : (
              cart.map(item => (
                <div key={item.menuItemId} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
                  <div className="truncate pr-2">
                    <p className="font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">${(item.unitPriceCents / 100).toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md border border-border bg-card">
                      <button onClick={() => handleUpdateQuantity(item.menuItemId, -1)} className="p-1 hover:bg-accent text-muted-foreground">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 font-mono font-bold">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.menuItemId, 1)} className="p-1 hover:bg-accent text-muted-foreground">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="font-mono font-bold text-foreground w-12 text-right">
                      ${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* POS Bill Summary & Direct Payment Actions */}
          <div className="p-4 border-t border-border bg-muted/10 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono">${(subtotalCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (8%):</span>
                <span className="font-mono">${(taxCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                <span>Total Amount:</span>
                <span className="font-mono text-primary text-base">${(totalAmountCents / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => handleSinglePayment('CASH')} disabled={cart.length === 0} className="gap-1 text-xs h-10">
                <Banknote className="h-3.5 w-3.5" />
                <span>Cash</span>
              </Button>
              <Button onClick={() => handleSinglePayment('CARD')} disabled={cart.length === 0} variant="secondary" className="gap-1 text-xs h-10">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Card</span>
              </Button>
              <Button onClick={() => handleSinglePayment('UPI')} disabled={cart.length === 0} variant="outline" className="gap-1 text-xs h-10">
                <QrCode className="h-3.5 w-3.5" />
                <span>UPI</span>
              </Button>
            </div>

            <Button
              onClick={() => setShowSplitPaymentModal(true)}
              disabled={cart.length === 0}
              variant="ghost"
              className="w-full text-xs h-8 gap-1.5"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Split Payment across Methods</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Split Payment Modal */}
      {showSplitPaymentModal && (
        <SplitPaymentModal
          totalCents={totalAmountCents}
          onClose={() => setShowSplitPaymentModal(false)}
          onSuccess={async (payments) => {
            setShowSplitPaymentModal(false);
            // Submit Order with Split Payment
            try {
              const ordRes = await fetch('/api/v1/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  branchId: user.branchId,
                  orderType: 'TAKEAWAY',
                  items: cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
                })
              });
              const ordData = await ordRes.json();
              if (!ordData.success) throw new Error(ordData.error);

              const splitRes = await fetch(`/api/v1/orders/${ordData.data.id}/split-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payments })
              });
              const splitData = await splitRes.json();
              if (!splitData.success) throw new Error(splitData.error);

              toast(`Split Payment processed for Order #${ordData.data.orderNumber}`, 'success');
              setCompletedOrder(splitData.data.order);
              setShowReceiptModal(true);
              handleClearCart();
            } catch (err: any) {
              toast(`Split Checkout failed: ${err.message}`, 'error');
            }
          }}
        />
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && completedOrder && (
        <POSReceiptModal order={completedOrder} onClose={() => setShowReceiptModal(false)} />
      )}
    </div>
  );
}

function SplitPaymentModal({ totalCents, onClose, onSuccess }: { totalCents: number; onClose: () => void; onSuccess: (payments: Array<{ paymentMethod: 'CASH' | 'CARD' | 'UPI'; amountCents: number }>) => void }) {
  const halfCents = Math.floor(totalCents / 2);
  const remainingCents = totalCents - halfCents;

  const [cashDollars, setCashDollars] = React.useState((halfCents / 100).toFixed(2));
  const [cardDollars, setCardDollars] = React.useState((remainingCents / 100).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cashCents = Math.round(parseFloat(cashDollars) * 100);
    const cardCents = Math.round(parseFloat(cardDollars) * 100);

    const payments: Array<{ paymentMethod: 'CASH' | 'CARD' | 'UPI'; amountCents: number }> = [];
    if (cashCents > 0) payments.push({ paymentMethod: 'CASH', amountCents: cashCents });
    if (cardCents > 0) payments.push({ paymentMethod: 'CARD', amountCents: cardCents });

    onSuccess(payments);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-foreground">Split Bill Payment Across Methods</h3>
        <p className="text-xs text-muted-foreground">Total Bill Required: <span className="font-mono font-bold text-primary">${(totalCents / 100).toFixed(2)}</span></p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Cash Portion ($)</label>
            <input
              type="number"
              step="0.01"
              value={cashDollars}
              onChange={e => setCashDollars(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Card / UPI Portion ($)</label>
            <input
              type="number"
              step="0.01"
              value={cardDollars}
              onChange={e => setCardDollars(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Process Split Checkout</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function POSReceiptModal({ order, onClose }: { order: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-sm text-foreground uppercase">Trinetra POS Receipt</h3>
            <p className="text-[10px] text-muted-foreground">Thermal Print Preview</p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] space-y-1 text-muted-foreground">
          <p>Order #: {order.orderNumber}</p>
          <p>Type: {order.orderType}</p>
          <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
        </div>

        <div className="space-y-1.5 border-t border-b border-border py-2 text-xs">
          {order.items?.map((i: any) => (
            <div key={i.id} className="flex justify-between">
              <span>{i.quantity}x {i.menuItem.name}</span>
              <span>${(i.totalPriceCents / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span>Subtotal:</span><span>${(order.subtotalCents / 100).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax:</span><span>${(order.taxCents / 100).toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-border"><span>TOTAL PAID:</span><span>${(order.totalAmountCents / 100).toFixed(2)}</span></div>
        </div>

        <Button onClick={() => window.print()} className="w-full gap-2 text-xs">
          <Printer className="h-4 w-4" />
          <span>Print Thermal POS Receipt</span>
        </Button>
      </div>
    </div>
  );
}
