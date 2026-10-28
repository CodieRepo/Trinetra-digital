'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  Send,
  Printer,
  CheckCircle2,
  Leaf,
  X,
  Loader2,
  AlertCircle,
  Hash,
  ChevronDown,
} from 'lucide-react';

export interface PosTable {
  id: string;
  table_number: string;
  floor_id?: string | null;
  floor_name?: string | null;
  is_active: boolean;
}

export interface PosCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface PosMenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_veg: boolean;
  display_order: number;
}

export interface CartItem {
  item: PosMenuItem;
  quantity: number;
  notes?: string;
}

interface PosRegisterWorkspaceProps {
  tables: PosTable[];
  categories: PosCategory[];
  menuItems: PosMenuItem[];
  currency: string;
  taxRate: number;
  taxLabel: string;
  initialTableId?: string | null;
  onPunchOrder: (payload: {
    tableId: string;
    items: Array<{ menu_item_id: string; quantity: number; notes?: string }>;
    notes?: string;
  }) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  onPunchAndSettle?: (payload: {
    tableId: string;
    items: Array<{ menu_item_id: string; quantity: number; notes?: string }>;
    notes?: string;
    paymentMethod: 'cash' | 'upi' | 'card';
  }) => Promise<{ success: boolean; orderId?: string; error?: string }>;
}

export const PosRegisterWorkspace: React.FC<PosRegisterWorkspaceProps> = ({
  tables,
  categories,
  menuItems,
  currency,
  taxRate,
  taxLabel,
  initialTableId,
  onPunchOrder,
  onPunchAndSettle,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || (tables.length > 0 ? tables[0].id : ''));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync initialTableId when provided
  useEffect(() => {
    if (initialTableId) {
      setSelectedTableId(initialTableId);
    }
  }, [initialTableId]);

  // Keyboard shortcut listener: "/" to focus search, "Esc" to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (searchQuery) {
          setSearchQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Active categories sorted by display_order
  const activeCategories = useMemo(() => {
    return categories
      .filter((c) => c.is_active !== false)
      .sort((a, b) => a.display_order - b.display_order);
  }, [categories]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.is_available === false) return false;
      if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false;
      if (vegOnly && !item.is_veg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategory, vegOnly, searchQuery]);

  // Cart operations
  const addToCart = (item: PosMenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.item.id === itemId) {
            const nextQty = c.quantity + delta;
            return nextQty > 0 ? { ...c, quantity: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, notes } : c))
    );
  };

  const clearCart = () => {
    setCart([]);
    setOrderNotes('');
    setErrorMessage(null);
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    return (subtotal * taxRate) / 100;
  }, [subtotal, taxRate]);

  const grandTotal = useMemo(() => {
    return Math.round(subtotal + taxAmount);
  }, [subtotal, taxAmount]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  };

  // Punch KOT (Kitchen Order Ticket)
  const handlePunchKot = async () => {
    if (!selectedTableId) {
      setErrorMessage('Please select a dining table for this order.');
      return;
    }
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Select items to punch.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await onPunchOrder({
        tableId: selectedTableId,
        items: cart.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.quantity,
          notes: c.notes?.trim() || undefined,
        })),
        notes: orderNotes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to send KOT.');
        return;
      }

      setSuccessMessage('KOT sent to kitchen successfully!');
      clearCart();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error submitting order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Settle & Settle Now
  const handleQuickSettle = async () => {
    if (!selectedTableId) {
      setErrorMessage('Please select a dining table for this order.');
      return;
    }
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Select items to settle.');
      return;
    }
    if (!onPunchAndSettle) {
      return handlePunchKot();
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await onPunchAndSettle({
        tableId: selectedTableId,
        items: cart.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.quantity,
          notes: c.notes?.trim() || undefined,
        })),
        notes: orderNotes.trim() || undefined,
        paymentMethod,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to settle order.');
        return;
      }

      setSuccessMessage(`Order placed & settled (${paymentMethod.toUpperCase()})!`);
      clearCart();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error settling order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-150">
      {/* ── Left Column: Menu Catalog & Quick Picker ────────────────────── */}
      <div className="flex-1 w-full space-y-4">
        {/* Top Control Bar: Search & Category Chips */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search menu items... (press '/' to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Veg Only Toggle */}
            <button
              type="button"
              onClick={() => setVegOnly(!vegOnly)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer border ${
                vegOnly
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Leaf className={`h-3.5 w-3.5 ${vegOnly ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Veg Only</span>
            </button>
          </div>

          {/* Category Chips Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              <span>All Items</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {menuItems.filter((m) => m.is_available !== false).length}
              </span>
            </button>

            {activeCategories.map((cat) => {
              const count = menuItems.filter((m) => m.category_id === cat.id && m.is_available !== false).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const inCart = cart.find((c) => c.item.id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`group relative rounded-2xl border p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                    inCart
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-slate-200/90 bg-white hover:border-amber-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            item.is_veg
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                              : 'border-rose-500 bg-rose-50 text-rose-600'
                          }`}
                          title={item.is_veg ? 'Pure Vegetarian' : 'Non-Vegetarian'}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-amber-800 transition">
                          {item.name}
                        </h4>
                      </div>

                      {inCart && (
                        <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-amber-600 text-[11px] font-black font-mono text-white shadow-2xs">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-black font-mono text-slate-900">
                      {formatPrice(item.price)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-white px-2 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <UtensilsCrossed className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-2 text-sm font-bold text-slate-700">No Matching Dishes Found</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Try adjusting your category filter, clearing your search, or toggling veg/non-veg.
            </p>
          </div>
        )}
      </div>

      {/* ── Right Column: Active Order Ticket / Billing Cart ─────────────── */}
      <div className="w-full lg:w-[380px] shrink-0 sticky top-4 space-y-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
          {/* Ticket Header & Table Selector */}
          <div className="border-b border-slate-100 bg-slate-50/80 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
                  <Hash className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">Order Ticket {selectedTable ? `• Table ${selectedTable.table_number}` : ""}</h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Table Dropdown */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Dining Table <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none shadow-2xs appearance-none pr-8 cursor-pointer"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.table_number} {t.floor_name ? `• ${t.floor_name}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 flex items-start gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-start gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px]">
            {cart.length > 0 ? (
              cart.map((c) => (
                <div
                  key={c.item.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-slate-900 leading-snug">{c.item.name}</h5>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatPrice(c.item.price)} each
                      </p>
                    </div>
                    <span className="font-mono font-black text-slate-900">
                      {formatPrice(c.item.price * c.quantity)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {/* Cooking Notes Input */}
                    <input
                      type="text"
                      placeholder="Special note (e.g. less spice)"
                      value={c.notes || ''}
                      onChange={(e) => updateItemNotes(c.item.id, e.target.value)}
                      className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                    />

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => updateQuantity(c.item.id, -1)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        title="Reduce quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-slate-900 text-xs">
                        {c.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(c.item.id, 1)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(c.item.id)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer ml-1 border-l border-slate-100"
                        title="Remove item"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <UtensilsCrossed className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-600">Ticket is Empty</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tap any menu item on the left to add it to this dining ticket.
                </p>
              </div>
            )}
          </div>

          {/* Ticket Footer: Notes, Financials, Primary Action Buttons */}
          <div className="border-t border-slate-100 bg-slate-50/90 p-4 space-y-3">
            {/* General Order Notes */}
            <input
              type="text"
              placeholder="Order remarks (e.g. rush order, serve starters first)..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />

            {/* Bill Summary */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({cart.reduce((n, c) => n + c.quantity, 0)} items):</span>
                <span className="font-mono font-semibold text-slate-800">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Taxes ({taxRate}% {taxLabel}):</span>
                <span className="font-mono">{formatPrice(taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-amber-800">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            {/* Quick Payment Method Selector */}
            {onPunchAndSettle && (
              <div className="grid grid-cols-3 gap-1 pt-1">
                {(['cash', 'upi', 'card'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-lg py-1 px-2 text-[10px] font-bold uppercase transition border cursor-pointer ${
                      paymentMethod === m
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m === 'cash' && '💵 '}
                    {m === 'upi' && '📱 '}
                    {m === 'card' && '💳 '}
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={cart.length === 0 || isSubmitting}
                onClick={handlePunchKot}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send to Kitchen (KOT)</span>
                  </>
                )}
              </button>

              {onPunchAndSettle && (
                <button
                  type="button"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={handleQuickSettle}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Printer className="h-3.5 w-3.5 text-amber-400" />
                  <span>Settle & Print Receipt</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
