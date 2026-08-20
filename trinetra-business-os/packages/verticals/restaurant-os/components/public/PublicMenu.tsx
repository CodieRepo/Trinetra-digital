"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  User,
  Search,
  Check,
  AlertCircle,
  X,
  Sparkles,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";
import SessionSummaryBar, {
  type SessionOrderSummary,
} from "./SessionSummaryBar";

type MenuCategory = {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_veg: boolean;
  display_order: number;
};

type MenuPayload = {
  restaurant: {
    id: string;
    name: string;
    address: string | null;
    currency: string;
  };
  table: {
    id: string;
    table_number: string;
    table_token: string;
    floor_id?: string | null;
    floor_name?: string | null;
  };
  menu: {
    categories: MenuCategory[];
    items: MenuItem[];
  };
};

type CartEntry = {
  quantity: number;
};

const SESSION_KEY = "akuafi:restaurant:session-token";

function getOrCreateSessionToken() {
  const existing = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
  if (existing) return existing;
  const created =
    typeof window !== "undefined" && window.crypto?.randomUUID?.()
      ? window.crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
          const randomValue = Math.floor(Math.random() * 16);
          const nextValue = char === "x" ? randomValue : (randomValue & 0x3) | 0x8;
          return nextValue.toString(16);
        });
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, created);
  }
  return created;
}

function getOrderKey(tableToken: string) {
  return `akuafi:restaurant:table:${tableToken}:order`;
}

function getSessionKey(tableToken: string) {
  return `akuafi:restaurant:table:${tableToken}:session`;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export default function PublicRestaurantMenu({
  tableToken,
}: {
  tableToken: string;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const browseMode = searchParams.get("browse") === "1";
  const [payload, setPayload] = useState<MenuPayload | null>(null);
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    orders: SessionOrderSummary[];
    sessionTotal: number;
    latestOrderId: string | null;
  } | null>(null);

  // Mobile cart drawer state
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Category filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  // Search and Dietary filters
  const [searchQuery, setSearchQuery] = useState("");
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");

  // --- Identity gate state ---
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityName, setIdentityName] = useState("");
  const [identityPhone, setIdentityPhone] = useState("");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [hasIdentity, setHasIdentity] = useState(false);
  const [sessionPaid, setSessionPaid] = useState(false);

  // Placement success toast
  const [placedSuccessInfo, setPlacedSuccessInfo] = useState<{
    orderId: string;
    tableNumber: string;
    itemsCount: number;
    total: number;
  } | null>(null);

  const clearStoredSession = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(getOrderKey(tableToken));
      window.localStorage.removeItem(getSessionKey(tableToken));
    }
    setSessionData(null);
  }, [tableToken]);

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/r/${tableToken}`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "This table QR is inactive or not found."
              : "Failed to load menu.",
          );
        }

        const data = (await res.json()) as MenuPayload;
        if (!active) return;

        const sessionToken = getOrCreateSessionToken();
        const existingOrderId = typeof window !== "undefined" ? window.localStorage.getItem(getOrderKey(tableToken)) : null;
        const storedSessionId = typeof window !== "undefined" ? window.localStorage.getItem(getSessionKey(tableToken)) : null;

        // Session-aware order detection
        const sessionParams = new URLSearchParams({
          session_token: sessionToken,
        });
        if (storedSessionId) {
          sessionParams.set("table_session_id", storedSessionId);
        }

        const sessionRes = await fetch(
          `/api/r/${tableToken}/session?${sessionParams.toString()}`,
          { cache: "no-store" },
        );

        if (sessionRes.ok) {
          const sess = await sessionRes.json();
          if (
            sess.session &&
            sess.session.status === "active" &&
            Array.isArray(sess.orders) &&
            sess.orders.length > 0
          ) {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(getSessionKey(tableToken), sess.session.id);
            }

            if (sess.session.customer_name) {
              setHasIdentity(true);
            }
            if (sess.session.payment_status === "paid") {
              setSessionPaid(true);
            }

            const latestActive = [...sess.orders]
              .reverse()
              .find(
                (o: SessionOrderSummary) =>
                  o.status !== "closed" && o.status !== "cancelled",
              );

            if (latestActive && !browseMode) {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(getOrderKey(tableToken), latestActive.id);
              }
              navigate(`/r/${tableToken}/order/${latestActive.id}`, { replace: true });
              return;
            }

            if (latestActive || sess.orders.length > 0) {
              setSessionData({
                sessionId: sess.session.id,
                orders: sess.orders,
                sessionTotal: Number(
                  sess.session?.session_total ?? sess.session_total ?? 0,
                ),
                latestOrderId:
                  latestActive?.id ??
                  sess.orders[sess.orders.length - 1]?.id ??
                  null,
              });
            }
          } else if (sess.session && sess.session.status === "closed") {
            clearStoredSession();
          } else if (
            sess.session &&
            sess.session.status === "active" &&
            (!sess.orders || sess.orders.length === 0)
          ) {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(getSessionKey(tableToken), sess.session.id);
            }
            if (sess.session.customer_name) {
              setHasIdentity(true);
            }
            if (sess.session.payment_status === "paid") {
              setSessionPaid(true);
            }
          } else {
            if (existingOrderId) {
              const orderRes = await fetch(
                `/api/r/orders/${existingOrderId}?session_token=${sessionToken}`,
                { cache: "no-store" },
              );
              if (orderRes.ok) {
                const orderData = await orderRes.json();
                const status = orderData?.order?.status;
                const orderTableId = orderData?.order?.table_id;

                if (!status || !orderTableId || orderTableId !== data.table.id) {
                  if (typeof window !== "undefined") window.localStorage.removeItem(getOrderKey(tableToken));
                } else if (status === "closed" || status === "cancelled") {
                  if (typeof window !== "undefined") window.localStorage.removeItem(getOrderKey(tableToken));
                } else if (!browseMode) {
                  navigate(`/r/${tableToken}/order/${existingOrderId}`, { replace: true });
                  return;
                }
              } else {
                if (typeof window !== "undefined") window.localStorage.removeItem(getOrderKey(tableToken));
              }
            }
          }
        }

        setPayload(data);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load menu.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMenu();
    return () => {
      active = false;
    };
  }, [browseMode, clearStoredSession, navigate, tableToken]);

  // Group and filter items
  const groupedItems = useMemo(() => {
    let items = payload?.menu.items ?? [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)),
      );
    }

    if (vegFilter === "veg") {
      items = items.filter((item) => item.is_veg);
    } else if (vegFilter === "non-veg") {
      items = items.filter((item) => !item.is_veg);
    }

    const categories = (payload?.menu.categories ?? []).map((category) => ({
      ...category,
      items: items.filter((item) => item.category_id === category.id),
    }));

    if (selectedCategoryId === "all") {
      return categories.filter((cat) => cat.items.length > 0);
    }

    return categories.filter(
      (cat) => cat.id === selectedCategoryId && cat.items.length > 0,
    );
  }, [payload, searchQuery, vegFilter, selectedCategoryId]);

  const total = useMemo(() => {
    if (!payload) return 0;
    return payload.menu.items.reduce((sum, item) => {
      const quantity = cart[item.id]?.quantity ?? 0;
      return sum + Number(item.price) * quantity;
    }, 0);
  }, [cart, payload]);

  const cartItemsCount = useMemo(
    () => Object.values(cart).reduce((sum, entry) => sum + entry.quantity, 0),
    [cart],
  );

  function updateQuantity(itemId: string, delta: number) {
    setCart((current) => {
      const nextQty = Math.max(0, (current[itemId]?.quantity ?? 0) + delta);
      if (nextQty === 0) {
        const cloned = { ...current };
        delete cloned[itemId];
        return cloned;
      }
      return {
        ...current,
        [itemId]: { quantity: nextQty },
      };
    });
  }

  async function submitIdentity() {
    if (!identityName.trim() || identityName.trim().length < 2) {
      setIdentityError("Please enter your name (min 2 characters).");
      return;
    }
    const digitsOnly = identityPhone.replace(/[^0-9+]/g, "");
    if (!digitsOnly || digitsOnly.length < 10) {
      setIdentityError("Please enter a valid phone number (min 10 digits).");
      return;
    }

    try {
      setIdentitySubmitting(true);
      setIdentityError(null);
      const sessionToken = getOrCreateSessionToken();
      const storedSessionId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(getSessionKey(tableToken))
          : null;
      const res = await fetch(`/api/r/${tableToken}/session/identify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          table_session_id: storedSessionId || undefined,
          customer_name: identityName.trim(),
          customer_phone: digitsOnly,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save identity.");
      }

      if (data.session_id && typeof window !== "undefined") {
        window.localStorage.setItem(getSessionKey(tableToken), data.session_id);
      }
      setHasIdentity(true);
      setShowIdentityModal(false);

      await placeOrderInner();
    } catch (identityErr) {
      setIdentityError(
        identityErr instanceof Error
          ? identityErr.message
          : "Failed to save identity.",
      );
    } finally {
      setIdentitySubmitting(false);
    }
  }

  async function placeOrder() {
    if (!payload) return;

    const items = Object.entries(cart).map(([menu_item_id, entry]) => ({
      menu_item_id,
      quantity: entry.quantity,
    }));

    if (!items.length) {
      setError("Add at least one item before placing your order.");
      return;
    }

    if (!hasIdentity) {
      setShowIdentityModal(true);
      return;
    }

    await placeOrderInner();
  }

  async function placeOrderInner() {
    if (!payload) return;

    const items = Object.entries(cart).map(([menu_item_id, entry]) => ({
      menu_item_id,
      quantity: entry.quantity,
    }));

    if (!items.length) {
      setError("Add at least one item before placing your order.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const sessionToken = getOrCreateSessionToken();
      const storedSessionId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(getSessionKey(tableToken))
          : null;
      const res = await fetch(`/api/r/${tableToken}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          table_session_id: storedSessionId || undefined,
          notes: notes.trim() || null,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requires_identity) {
          setHasIdentity(false);
          setShowIdentityModal(true);
          return;
        }
        if (data.session_paid) {
          setSessionPaid(true);
          setError("This table session has already been settled.");
          return;
        }
        throw new Error(data.error || "We couldn't place your order. Please try again.");
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(getOrderKey(tableToken), data.order_id);
        if (data.table_session_id) {
          window.localStorage.setItem(getSessionKey(tableToken), data.table_session_id);
        }
      }

      setPlacedSuccessInfo({
        orderId: data.order_id,
        tableNumber: payload.table.table_number,
        itemsCount: cartItemsCount,
        total,
      });

      // Clear cart
      setCart({});
      setIsCartDrawerOpen(false);

      // Transition to order tracking
      setTimeout(() => {
        navigate(`/r/${tableToken}/order/${data.order_id}`);
      }, 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't place your order. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col items-center justify-center gap-4 px-6">
        <div className="h-10 w-10 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
          Loading Menu...
        </p>
      </div>
    );
  }

  // Error State
  if (error && !payload) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-16 w-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black text-stone-900">Menu Unavailable</h2>
        <p className="mt-1.5 text-sm text-stone-600 max-w-sm">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 min-h-[48px] px-6 py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans antialiased pb-32">
      {/* ── 1. Top Restaurant Header ── */}
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-stone-900 truncate">
              {payload.restaurant.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-black text-amber-950 uppercase tracking-wide">
                Table {payload.table.table_number} • {payload.table.floor_name || "Main Dining"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {cartItemsCount > 0 && (
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(true)}
                className="min-h-[42px] px-3.5 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <ShoppingBag size={15} />
                <span>{cartItemsCount}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4 sm:pt-6 space-y-5">
        {/* ── 2. Compact Welcome & Table Hero ── */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" />
                Digital Dining Table
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">
                Order from your table
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 font-medium mt-1">
                Select your favorite dishes, customize options, and dispatch orders directly to the kitchen.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-black text-stone-800 shrink-0 self-start sm:self-auto">
              <QrCode size={16} className="text-amber-700" />
              <span>Table #{payload.table.table_number} · {payload.restaurant.currency || "INR"}</span>
            </div>
          </div>
        </div>

        {/* ── 3. Search Bar & Dietary Filters ── */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes or ingredients..."
              className="w-full min-h-[48px] rounded-2xl border border-stone-200 bg-white pl-11 pr-4 py-2.5 text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none shadow-xs transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "all" as const, label: "All Dishes", dot: null },
              { id: "veg" as const, label: "Pure Veg", dot: "bg-emerald-600" },
              { id: "non-veg" as const, label: "Non-Veg", dot: "bg-rose-600" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setVegFilter(f.id)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border shrink-0 active:scale-95 flex items-center gap-2 ${
                  vegFilter === f.id
                    ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                }`}
              >
                {f.dot && <span className={`h-2.5 w-2.5 rounded-full ${f.dot}`} />}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. Sticky Category Pills Navigation ── */}
        <div className="sticky top-[61px] z-20 -mx-4 px-4 py-2.5 bg-[#faf8f5]/95 backdrop-blur-md border-y border-stone-200/80">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer border shrink-0 active:scale-95 ${
                selectedCategoryId === "all"
                  ? "bg-amber-500 text-stone-950 border-amber-500 shadow-xs"
                  : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
              }`}
            >
              All Items ({payload.menu.items.length})
            </button>
            {payload.menu.categories.map((cat) => {
              const count = payload.menu.items.filter((i) => i.category_id === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer border shrink-0 active:scale-95 ${
                    selectedCategoryId === cat.id
                      ? "bg-amber-500 text-stone-950 border-amber-500 shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 5. Menu Items Catalog ── */}
        <div className="space-y-6">
          {groupedItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-stone-500 shadow-xs">
              <UtensilsCrossed size={40} className="mx-auto mb-3 text-stone-400" />
              <p className="text-base font-black text-stone-800">No dishes match your selection</p>
              <p className="mt-1 text-xs text-stone-500 font-medium">
                Try searching for something else or switch filters to view available dishes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setVegFilter("all");
                  setSelectedCategoryId("all");
                }}
                className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            groupedItems.map((category) => (
              <section key={category.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-stone-900">
                    {category.name}
                  </h3>
                  <span className="text-xs font-bold text-stone-500">
                    {category.items.length} {category.items.length === 1 ? "dish" : "dishes"}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {category.items.map((item) => {
                    const inCartQty = cart[item.id]?.quantity ?? 0;
                    return (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-stone-200 bg-white p-4.5 sm:p-5 shadow-xs flex flex-col justify-between transition hover:border-amber-300"
                      >
                        <div>
                          {/* Dietary & Title */}
                          <div className="flex items-start gap-2.5 justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-2 ${
                                    item.is_veg ? "border-emerald-600" : "border-rose-600"
                                  }`}
                                  title={item.is_veg ? "Vegetarian" : "Non-Vegetarian"}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      item.is_veg ? "bg-emerald-600" : "bg-rose-600"
                                    }`}
                                  />
                                </span>
                                <h4 className="font-black text-stone-900 text-base sm:text-lg uppercase tracking-tight leading-snug">
                                  {item.name}
                                </h4>
                              </div>

                              {item.description && (
                                <p className="mt-1.5 text-xs text-stone-600 line-clamp-2 font-medium leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price & Add / Stepper Controls */}
                        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                          <p className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                            {formatCurrency(Number(item.price), payload.restaurant.currency)}
                          </p>

                          <div>
                            {!item.is_available ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-black uppercase tracking-wider">
                                Sold Out
                              </span>
                            ) : inCartQty === 0 ? (
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="min-h-[44px] min-w-[96px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider px-4 py-2 transition cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                <Plus size={14} />
                                <span>Add</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-2xl p-1 shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="h-10 w-10 rounded-xl bg-white hover:bg-stone-200 text-stone-900 flex items-center justify-center font-black transition cursor-pointer active:scale-95 shadow-xs"
                                >
                                  <Minus size={15} />
                                </button>
                                <span className="w-8 text-center font-black text-stone-900 text-sm">
                                  {inCartQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="h-10 w-10 rounded-xl bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center font-black transition cursor-pointer active:scale-95 shadow-xs"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* ── 6. Subtle Footer Attribution ── */}
        <footer className="pt-8 pb-12 text-center text-xs font-semibold text-stone-400">
          <p>{payload.restaurant.name} • Table #{payload.table.table_number}</p>
          <p className="mt-1 text-[11px] text-stone-400">Powered by Trinetra Restaurant OS</p>
        </footer>
      </main>

      {/* ── 7. Floating Sticky Mobile Order Bar ── */}
      {cartItemsCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4 bg-gradient-to-t from-[#faf8f5] via-[#faf8f5]/90 to-transparent pointer-events-none">
          <div className="mx-auto max-w-lg pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="w-full min-h-[56px] rounded-2xl bg-stone-900 hover:bg-stone-800 text-white px-5 py-3 shadow-xl flex items-center justify-between gap-3 transition cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="h-9 w-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-sm">
                  {cartItemsCount}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                    {cartItemsCount === 1 ? "1 Dish Selected" : `${cartItemsCount} Dishes Selected`}
                  </p>
                  <p className="text-base font-black text-white">
                    {formatCurrency(total, payload.restaurant.currency)}
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-amber-300">
                <span>View Order</span>
                <ChevronRight size={16} />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── 8. Bottom Sheet / Cart Drawer ── */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-stone-900">
                    Your Table Order
                  </h3>
                  <p className="text-xs font-bold text-amber-800 mt-0.5">
                    Table {payload.table.table_number} • {payload.table.floor_name || "Main Dining"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="h-9 w-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items List */}
              <div className="mt-4 space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                {Object.entries(cart).map(([itemId, entry]) => {
                  const item = payload.menu.items.find((i) => i.id === itemId);
                  if (!item || entry.quantity <= 0) return null;
                  return (
                    <div
                      key={itemId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-stone-50/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-stone-900 text-sm uppercase tracking-tight truncate">
                          {item.name}
                        </p>
                        <p className="text-xs font-bold text-stone-500 mt-0.5">
                          {formatCurrency(Number(item.price) * entry.quantity, payload.restaurant.currency)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-8 w-8 rounded-lg bg-white border border-stone-200 text-stone-900 flex items-center justify-center font-black transition cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center font-black text-stone-900 text-xs">
                          {entry.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-8 w-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-black transition cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Instructions */}
              <div className="mt-4">
                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-600 mb-1.5">
                  Special Instructions
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Less spicy, allergy notice, or serving preference..."
                  rows={2}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Total & Submit */}
            <div className="mt-6 pt-4 border-t border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                  Estimated Total
                </span>
                <span className="text-2xl font-black text-stone-900 tracking-tight">
                  {formatCurrency(total, payload.restaurant.currency)}
                </span>
              </div>

              <button
                type="button"
                disabled={submitting || sessionPaid}
                onClick={placeOrder}
                className="w-full min-h-[52px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {sessionPaid ? (
                  "Bill Settled"
                ) : submitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-stone-950 border-t-transparent animate-spin" />
                    <span>Placing Order…</span>
                  </>
                ) : (
                  <span>Place Order ({formatCurrency(total, payload.restaurant.currency)})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Warm Identity Gate Modal ── */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-stone-900">
                  Welcome to {payload.restaurant.name}
                </h3>
                <p className="text-xs font-medium text-stone-500">
                  May we know your name so we can serve you better?
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-600 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)}
                  placeholder="e.g. Arun Sharma"
                  autoFocus
                  className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-stone-50 px-3.5 text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-600 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={identityPhone}
                  onChange={(e) => setIdentityPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-stone-50 px-3.5 text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              {identityError && (
                <p className="text-xs font-bold text-rose-600">{identityError}</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowIdentityModal(false);
                  setIdentityError(null);
                }}
                className="min-h-[44px] px-4 rounded-xl border border-stone-200 text-stone-700 text-xs font-black uppercase tracking-wider hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={identitySubmitting}
                onClick={submitIdentity}
                className="min-h-[44px] px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {identitySubmitting ? "Saving..." : "Continue & Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 10. Placement Success Toast ── */}
      {placedSuccessInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-2xl">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Check size={28} className="stroke-[3]" />
            </div>
            <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">
              Order Placed!
            </h3>
            <p className="text-xs font-bold text-amber-800 mt-1">
              Table {placedSuccessInfo.tableNumber} • {placedSuccessInfo.itemsCount} Dishes
            </p>
            <p className="text-xs text-stone-500 font-medium mt-1">
              Your ticket has been dispatched to the kitchen.
            </p>
          </div>
        </div>
      )}

      {/* Session Summary Bar if already in session and browsing */}
      {sessionData && payload && sessionData.orders.length > 0 && !isCartDrawerOpen && (
        <SessionSummaryBar
          orders={sessionData.orders}
          sessionTotal={sessionData.sessionTotal}
          currency={payload.restaurant.currency}
          tableToken={tableToken}
          latestOrderId={sessionData.latestOrderId}
        />
      )}
    </div>
  );
}
