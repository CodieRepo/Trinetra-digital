"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, QrCode, ShoppingBag, User } from "lucide-react";
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
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created =
    window.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const randomValue = Math.floor(Math.random() * 16);
      const nextValue = char === "x" ? randomValue : (randomValue & 0x3) | 0x8;
      return nextValue.toString(16);
    });
  window.localStorage.setItem(SESSION_KEY, created);
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
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // --- Identity gate state ---
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityName, setIdentityName] = useState("");
  const [identityPhone, setIdentityPhone] = useState("");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  // Whether this session already has identity set (loaded from API)
  const [hasIdentity, setHasIdentity] = useState(false);
  // Whether the session is marked as paid (blocks new orders)
  const [sessionPaid, setSessionPaid] = useState(false);

  const clearStoredSession = useCallback(() => {
    window.localStorage.removeItem(getOrderKey(tableToken));
    window.localStorage.removeItem(getSessionKey(tableToken));
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
              ? "This table QR is inactive."
              : "Failed to load menu.",
          );
        }

        const data = (await res.json()) as MenuPayload;
        if (!active) return;

        const sessionToken = getOrCreateSessionToken();
        const existingOrderId = window.localStorage.getItem(
          getOrderKey(tableToken),
        );
        const storedSessionId = window.localStorage.getItem(
          getSessionKey(tableToken),
        );

        // --- Session-aware order detection ---
        // Try to load session summary first (covers multi-order case)
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
            // Valid active session with orders
            window.localStorage.setItem(
              getSessionKey(tableToken),
              sess.session.id,
            );

            // Track identity state from server
            if (sess.session.customer_name) {
              setHasIdentity(true);
            }
            if (sess.session.payment_status === "paid") {
              setSessionPaid(true);
            }

            // Find the latest non-closed/cancelled order
            const latestActive = [...sess.orders]
              .reverse()
              .find(
                (o: SessionOrderSummary) =>
                  o.status !== "closed" && o.status !== "cancelled",
              );

            if (latestActive && !browseMode) {
              // Active order exists + not browsing → redirect to order tracking
              window.localStorage.setItem(
                getOrderKey(tableToken),
                latestActive.id,
              );
              router.replace(`/r/${tableToken}/order/${latestActive.id}`);
              return;
            }

            // Browse mode (or all orders are closed/served) → show session bar
            if (latestActive || sess.orders.length > 0) {
              setSessionData({
                sessionId: sess.session.id,
                orders: sess.orders,
                sessionTotal: Number(sess.session_total ?? 0),
                latestOrderId:
                  latestActive?.id ??
                  sess.orders[sess.orders.length - 1]?.id ??
                  null,
              });
            }
          } else if (sess.session && sess.session.status === "closed") {
            // Session was closed — clear stale references
            window.localStorage.removeItem(getSessionKey(tableToken));
            window.localStorage.removeItem(getOrderKey(tableToken));
          } else if (
            sess.session &&
            sess.session.status === "active" &&
            (!sess.orders || sess.orders.length === 0)
          ) {
            // Session exists with no orders yet (identity might be set)
            window.localStorage.setItem(
              getSessionKey(tableToken),
              sess.session.id,
            );
            if (sess.session.customer_name) {
              setHasIdentity(true);
            }
            if (sess.session.payment_status === "paid") {
              setSessionPaid(true);
            }
          } else {
            // No session found — might have a stale single order from before sessions existed
            // Fall back to single-order check for backward compat
            if (existingOrderId) {
              const orderRes = await fetch(
                `/api/r/orders/${existingOrderId}?session_token=${sessionToken}`,
                { cache: "no-store" },
              );
              if (orderRes.ok) {
                const orderData = await orderRes.json();
                const status = orderData?.order?.status;
                const orderTableId = orderData?.order?.table_id;

                if (
                  !status ||
                  !orderTableId ||
                  orderTableId !== data.table.id
                ) {
                  window.localStorage.removeItem(getOrderKey(tableToken));
                } else if (status === "closed" || status === "cancelled") {
                  window.localStorage.removeItem(getOrderKey(tableToken));
                } else if (!browseMode) {
                  router.replace(`/r/${tableToken}/order/${existingOrderId}`);
                  return;
                } else {
                  // Legacy single-order browse mode: wrap as session format
                  const items = Array.isArray(orderData.items)
                    ? orderData.items.map(
                        (it: {
                          id: string;
                          name: string;
                          price: number;
                          quantity: number;
                          notes: string | null;
                        }) => ({
                          id: it.id,
                          name: it.name,
                          price: Number(it.price),
                          quantity: it.quantity,
                          notes: it.notes ?? null,
                        }),
                      )
                    : [];
                  setSessionData({
                    sessionId: "",
                    orders: [
                      {
                        id: existingOrderId,
                        status,
                        notes: orderData.order?.notes ?? null,
                        total_amount: Number(
                          orderData.order?.total_amount ?? 0,
                        ),
                        created_at: orderData.order?.created_at ?? "",
                        items,
                      },
                    ],
                    sessionTotal: Number(orderData.order?.total_amount ?? 0),
                    latestOrderId: existingOrderId,
                  });
                }
              } else {
                window.localStorage.removeItem(getOrderKey(tableToken));
              }
            }
          }
        } else {
          // Session API failed — fall back to clearing stale data
          window.localStorage.removeItem(getSessionKey(tableToken));
        }

        setPayload(data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load menu.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMenu();
    return () => {
      active = false;
    };
  }, [browseMode, router, tableToken]);

  // Poll session summary every 30s in browse mode
  useEffect(() => {
    if (!sessionData || !payload) return;

    const interval = window.setInterval(async () => {
      const sessionToken = window.localStorage.getItem(SESSION_KEY);
      if (!sessionToken) return;
      try {
        const params = new URLSearchParams({ session_token: sessionToken });
        if (sessionData.sessionId) {
          params.set("table_session_id", sessionData.sessionId);
        }
        const res = await fetch(
          `/api/r/${tableToken}/session?${params.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          clearStoredSession();
          return;
        }
        const sess = await res.json();

        if (!sess.session || sess.session.status === "closed") {
          clearStoredSession();
          return;
        }

        if (!Array.isArray(sess.orders) || sess.orders.length === 0) {
          clearStoredSession();
          return;
        }

        // Check if all orders are terminal
        const allTerminal = sess.orders.every(
          (o: SessionOrderSummary) =>
            o.status === "closed" || o.status === "cancelled",
        );
        if (allTerminal) {
          clearStoredSession();
          return;
        }

        const latestActive = [...sess.orders]
          .reverse()
          .find(
            (o: SessionOrderSummary) =>
              o.status !== "closed" && o.status !== "cancelled",
          );

        setSessionData({
          sessionId: sess.session.id,
          orders: sess.orders,
          sessionTotal: Number(sess.session_total ?? 0),
          latestOrderId:
            latestActive?.id ?? sess.orders[sess.orders.length - 1]?.id ?? null,
        });

        // Sync payment state from poll
        if (sess.session.payment_status === "paid") {
          setSessionPaid(true);
        } else {
          setSessionPaid(false);
        }
      } catch {
        // Network error — keep current state, retry next interval
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [sessionData, payload, tableToken, clearStoredSession]);

  const groupedItems = useMemo(() => {
    const items = payload?.menu.items ?? [];
    return (payload?.menu.categories ?? []).map((category) => ({
      ...category,
      items: items.filter((item) => item.category_id === category.id),
    }));
  }, [payload]);

  const total = useMemo(() => {
    if (!payload) return 0;
    return payload.menu.items.reduce((sum, item) => {
      const quantity = cart[item.id]?.quantity ?? 0;
      return sum + Number(item.price) * quantity;
    }, 0);
  }, [cart, payload]);

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
      const storedSessionId = window.localStorage.getItem(
        getSessionKey(tableToken),
      );
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

      // Store session id if newly created
      if (data.session_id) {
        window.localStorage.setItem(getSessionKey(tableToken), data.session_id);
      }
      setHasIdentity(true);
      setShowIdentityModal(false);

      // Now proceed to place the order
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
      setError("Add at least one item before placing the order.");
      return;
    }

    // Gate: if identity not yet set, show modal instead
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
      setError("Add at least one item before placing the order.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const sessionToken = getOrCreateSessionToken();
      const storedSessionId = window.localStorage.getItem(
        getSessionKey(tableToken),
      );
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
        // If server says identity required (race condition / stale state)
        if (data.requires_identity) {
          setHasIdentity(false);
          setShowIdentityModal(true);
          return;
        }
        // If server says session is paid
        if (data.session_paid) {
          setSessionPaid(true);
          setError(
            "This table's bill has been settled. No new orders allowed.",
          );
          return;
        }
        throw new Error(data.error || "Failed to place order.");
      }

      window.localStorage.setItem(getOrderKey(tableToken), data.order_id);
      if (data.table_session_id) {
        window.localStorage.setItem(
          getSessionKey(tableToken),
          data.table_session_id,
        );
      }
      router.push(`/r/${tableToken}/order/${data.order_id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to place order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        Loading menu...
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center px-6 text-center">
        {error || "Menu unavailable."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),transparent_36%),linear-gradient(180deg,#140f0a_0%,#1f160d_45%,#0c0a09_100%)] text-stone-50">
      <div
        className={`mx-auto max-w-6xl px-4 py-8 md:px-8${sessionData ? " pb-24" : ""}`}
      >
        <div className="mb-8 rounded-[28px] border border-amber-300/20 bg-black/25 p-6 backdrop-blur md:flex md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">
              Akuafi Restaurant
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
              {payload.restaurant.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-stone-300 md:text-base">
              Table {payload.table.table_number} is live. Scan, order, and track
              status without an app.
            </p>
          </div>
          <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-stone-200 md:mt-0">
            <QrCode className="h-4 w-4 text-amber-200" />
            {payload.restaurant.currency || "INR"} menu
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.7fr]">
          <div className="space-y-6">
            {groupedItems.map((category) => (
              <section
                key={category.id}
                className="rounded-[26px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    {category.name}
                  </h2>
                  <span className="text-xs uppercase tracking-[0.32em] text-stone-400">
                    Fresh now
                  </span>
                </div>
                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-white/8 bg-stone-950/35 p-4 md:flex md:items-center md:justify-between"
                    >
                      <div className="md:max-w-[75%]">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium text-white">
                            {item.name}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.25em] ${item.is_veg ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}
                          >
                            {item.is_veg ? "Veg" : "Non-Veg"}
                          </span>
                        </div>
                        {item.description ? (
                          <p className="mt-2 text-sm text-stone-400">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="mt-3 text-sm font-semibold text-amber-200">
                          {formatCurrency(
                            Number(item.price),
                            payload.restaurant.currency,
                          )}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center gap-3 md:mt-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="rounded-full border border-white/10 bg-white/5 p-2 text-stone-200 hover:bg-white/10"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="min-w-10 text-center text-lg font-semibold text-white">
                          {cart[item.id]?.quantity ?? 0}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="rounded-full border border-amber-200/20 bg-amber-300/10 p-2 text-amber-100 hover:bg-amber-300/20"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="sticky top-6 h-fit rounded-[28px] border border-amber-300/20 bg-black/30 p-5 backdrop-blur">
            <div className="flex items-center gap-3 text-white">
              <ShoppingBag className="h-5 w-5 text-amber-200" />
              <h2 className="text-xl font-semibold">
                {browseMode ? "New Order" : "Current Order"}
              </h2>
            </div>
            <p className="mt-2 text-sm text-stone-400">
              {browseMode
                ? "Add more items to place a new order for this table."
                : "Your items stay linked to this table on this device until the order is closed."}
            </p>

            <div className="mt-5 space-y-3">
              {Object.entries(cart).length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/12 px-4 py-6 text-center text-sm text-stone-400">
                  Your cart is empty.
                </div>
              ) : (
                payload.menu.items
                  .filter((item) => cart[item.id]?.quantity)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-stone-400">
                          Qty {cart[item.id]?.quantity ?? 0}
                        </p>
                      </div>
                      <p className="font-semibold text-amber-100">
                        {formatCurrency(
                          Number(item.price) * (cart[item.id]?.quantity ?? 0),
                          payload.restaurant.currency,
                        )}
                      </p>
                    </div>
                  ))
              )}
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes for the kitchen, allergies, or serving requests"
              className="mt-5 min-h-28 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500"
            />

            {error ? (
              <p className="mt-3 text-sm text-rose-300">{error}</p>
            ) : null}

            {sessionPaid && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center text-sm text-emerald-200">
                Your bill has been settled. Thank you for dining with us!
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-stone-400">
                  Estimated total
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {formatCurrency(total, payload.restaurant.currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={placeOrder}
                disabled={submitting || sessionPaid}
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sessionPaid
                  ? "Bill Settled"
                  : submitting
                    ? "Placing..."
                    : "Place Order"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {sessionData && payload && sessionData.orders.length > 0 && (
        <SessionSummaryBar
          orders={sessionData.orders}
          sessionTotal={sessionData.sessionTotal}
          currency={payload.restaurant.currency}
          tableToken={tableToken}
          latestOrderId={sessionData.latestOrderId}
        />
      )}

      {/* ------- Identity gate modal ------- */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-[28px] border border-amber-300/20 bg-stone-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-white">
              <User className="h-5 w-5 text-amber-200" />
              <h2 className="text-xl font-semibold">Before you order</h2>
            </div>
            <p className="mt-2 text-sm text-stone-400">
              Let us know who&apos;s at the table so the kitchen can serve you
              better.
            </p>

            <label className="mt-5 block text-xs uppercase tracking-[0.3em] text-stone-400">
              Your name
            </label>
            <input
              type="text"
              value={identityName}
              onChange={(e) => setIdentityName(e.target.value)}
              placeholder="e.g. Arun"
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500 focus:border-amber-300/40"
              autoFocus
            />

            <label className="mt-4 block text-xs uppercase tracking-[0.3em] text-stone-400">
              Phone number
            </label>
            <input
              type="tel"
              value={identityPhone}
              onChange={(e) => setIdentityPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500 focus:border-amber-300/40"
            />

            {identityError && (
              <p className="mt-3 text-sm text-rose-300">{identityError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowIdentityModal(false);
                  setIdentityError(null);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-stone-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitIdentity}
                disabled={identitySubmitting}
                className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {identitySubmitting ? "Saving..." : "Continue & Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
