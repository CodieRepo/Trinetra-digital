"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Receipt,
  QrCode,
  AlertCircle,
  Plus,
  ChevronRight,
} from "lucide-react";
import CustomerPaymentModal from "./CustomerPaymentModal";

type OrderPayload = {
  order: {
    id: string;
    table_session_id?: string | null;
    status: string;
    notes: string | null;
    total_amount: number;
    created_at: string;
    updated_at: string;
    table?: {
      id?: string;
      table_number: string;
      floor_id?: string | null;
      floor_name?: string | null;
    } | null;
  };
  restaurant?: {
    id: string;
    name: string;
    address: string | null;
    currency: string;
  } | null;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes: string | null;
  }>;
  events: Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    actor_role: string | null;
    created_at: string;
  }>;
};

type SessionOrder = {
  id: string;
  status: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes: string | null;
  }>;
};

type SessionBill = {
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  discount_reason: string | null;
  tax_amount: number;
  service_charge: number;
  round_off: number;
  grand_total: number;
  created_at: string;
};

type SessionContextData = {
  sessionId: string;
  paymentStatus: string;
  sessionTotal: number;
  orders: SessionOrder[];
  bill: SessionBill | null;
};

const SESSION_KEY = "akuafi:restaurant:session-token";

function getOrderKey(tableToken: string) {
  return `akuafi:restaurant:table:${tableToken}:order`;
}

function getSessionKey(tableToken: string) {
  return `akuafi:restaurant:table:${tableToken}:session`;
}

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

const STATUS_COPY: Record<string, string> = {
  placed: "Order Received",
  accepted: "Order Confirmed",
  preparing: "Being Prepared",
  ready: "Ready to Serve",
  served: "Delivered / Served",
  closed: "Completed",
  cancelled: "Cancelled",
};

const STEP_ORDER = ["placed", "accepted", "preparing", "ready", "served"];

export default function RestaurantOrderStatusClient({
  tableToken,
  orderId,
}: {
  tableToken: string;
  orderId: string;
}) {
  const [payload, setPayload] = useState<OrderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContextData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState<{
    name: string;
    upi_id?: string;
    upi_qr_url?: string;
  } | null>(null);

  // Request bill state
  const [requestingBill, setRequestingBill] = useState(false);
  const [billRequestedSuccess, setBillRequestedSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    const urlSessionToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("session_token") : null;
    const storedSessionToken = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
    const sessionToken = storedSessionToken || urlSessionToken;

    if (urlSessionToken && typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_KEY, urlSessionToken);
    }

    async function loadOrder() {
      if (!sessionToken) {
        setError("This device has no active restaurant session for this order.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/r/orders/${orderId}?session_token=${sessionToken}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "We couldn't find this order for your session."
              : "Failed to load order status.",
          );
        }

        const data = (await res.json()) as OrderPayload;
        if (!mounted) return;
        setPayload(data);
        setError(null);

        // Fetch restaurant upi_id and name
        fetch(`/api/r/${tableToken}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.restaurant && mounted) {
              setRestaurantInfo({
                name: d.restaurant.name,
                upi_id: d.restaurant.upi_id,
                upi_qr_url: d.restaurant.upi_qr_url,
              });
            }
          })
          .catch(() => {});

        // Store table_session_id if returned
        if (data.order.table_session_id && typeof window !== "undefined") {
          window.localStorage.setItem(
            getSessionKey(tableToken),
            data.order.table_session_id,
          );
        }

        // Fetch session context for all orders & bill calculation
        const storedSessionId =
          data.order.table_session_id ??
          (typeof window !== "undefined" ? window.localStorage.getItem(getSessionKey(tableToken)) : null);
        if (storedSessionId && sessionToken) {
          try {
            const sessParams = new URLSearchParams({
              session_token: sessionToken,
              table_session_id: storedSessionId,
            });
            const sessRes = await fetch(
              `/api/r/${tableToken}/session?${sessParams.toString()}`,
              { cache: "no-store" },
            );
            if (sessRes.ok && mounted) {
              const sess = await sessRes.json();
              if (sess.session && Array.isArray(sess.orders)) {
                setSessionContext({
                  sessionId: sess.session.id,
                  paymentStatus: sess.session.payment_status || "unpaid",
                  sessionTotal: Number(
                    sess.session.session_total ?? sess.session_total ?? 0,
                  ),
                  orders: sess.orders,
                  bill: sess.bill || null,
                });
              } else {
                setSessionContext(null);
              }
            }
          } catch {
            // Session fetch failed — non-critical, ignore
          }
        }

        if (
          data.order.status === "closed" ||
          data.order.status === "cancelled"
        ) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(getOrderKey(tableToken));
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load order status.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadOrder();
    const interval = window.setInterval(() => {
      void loadOrder();
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [orderId, tableToken]);

  const currentLabel = useMemo(
    () =>
      STATUS_COPY[payload?.order.status || ""] ?? payload?.order.status ?? "",
    [payload],
  );

  const handleRequestBill = async () => {
    if (!sessionContext) return;
    try {
      setRequestingBill(true);
      const res = await fetch(`/api/r/${tableToken}/session/request-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionContext.sessionId }),
      });
      if (res.ok) {
        setBillRequestedSuccess(true);
      }
    } catch {
      setBillRequestedSuccess(true);
    } finally {
      setRequestingBill(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col items-center justify-center gap-4 px-6">
        <div className="h-10 w-10 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
          Tracking your order...
        </p>
      </div>
    );
  }

  // Error State
  if (error || !payload) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-16 w-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black text-stone-900">Order Unavailable</h2>
        <p className="mt-1.5 text-sm text-stone-600 max-w-sm">
          {error || "We couldn't load this order."}
        </p>
        <Link
          to={`/r/${tableToken}?browse=1`}
          className="mt-5 min-h-[48px] px-6 py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm inline-flex items-center gap-2"
        >
          <span>Return to Menu</span>
          <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  const restaurantName =
    payload.restaurant?.name || restaurantInfo?.name || "Spice Garden Fine Dining";
  const tableNum = payload.order.table?.table_number || "T-1";
  const floorName = payload.order.table?.floor_name || "Main Dining";

  const orderStepIndex = STEP_ORDER.indexOf(payload.order.status);
  const isCancelled = payload.order.status === "cancelled";

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans antialiased pb-28">
      {/* ── 1. Restaurant Header ── */}
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-stone-900 truncate">
              {restaurantName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-black text-amber-950 uppercase tracking-wide">
                Table {tableNum} • {floorName}
              </span>
            </div>
          </div>

          <Link
            to={`/r/${tableToken}?browse=1`}
            className="min-h-[42px] px-4 py-1.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Order More</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-5 space-y-6">
        {/* ── 2. Live Status Hero Card ── */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600" />
                </span>
                Live Order Progress
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">
                {currentLabel}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1">
                Order #{payload.order.id.slice(0, 8)} · Dispatched {new Date(payload.order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-black text-stone-800 shrink-0 self-start sm:self-auto">
              <Clock size={16} className="text-amber-700" />
              <span>Table #{tableNum}</span>
            </div>
          </div>

          {/* ── 5-Stage Visual Progress Timeline ── */}
          <div className="mt-6 pt-5 border-t border-stone-100">
            {isCancelled ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
                <p className="text-sm font-black uppercase tracking-wide text-rose-800">
                  This order was cancelled by staff
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {STEP_ORDER.map((step, idx) => {
                  const isReached = orderStepIndex >= idx;
                  const isCurrent = orderStepIndex === idx;
                  return (
                    <div key={step} className="flex flex-col items-center text-center">
                      <div
                        className={`h-9 w-9 sm:h-10 sm:w-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                          isCurrent
                            ? "bg-amber-500 text-stone-950 shadow-md ring-4 ring-amber-100"
                            : isReached
                              ? "bg-stone-900 text-white shadow-xs"
                              : "bg-stone-100 text-stone-400 border border-stone-200/80"
                        }`}
                      >
                        {isReached && !isCurrent ? (
                          <CheckCircle2 size={16} className="stroke-[3]" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <p
                        className={`mt-2 text-[10px] sm:text-xs font-black uppercase tracking-tight leading-tight ${
                          isCurrent
                            ? "text-stone-900 font-extrabold"
                            : isReached
                              ? "text-stone-700"
                              : "text-stone-400"
                        }`}
                      >
                        {STATUS_COPY[step]}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Current Order Details Card ── */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-stone-900">
                Ticket Details
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Order ID #{payload.order.id.slice(0, 8)}
              </p>
            </div>
            <span className="text-base sm:text-lg font-black text-stone-900">
              {formatCurrency(Number(payload.order.total_amount))}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {(payload.items || []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50/70 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-stone-200/80 text-stone-900 font-black text-xs">
                      {item.quantity} ×
                    </span>
                    <p className="font-black text-stone-900 text-sm sm:text-base uppercase tracking-tight truncate">
                      {item.name}
                    </p>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-stone-500 font-medium mt-1 pl-1">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
                <span className="font-black text-stone-900 text-sm sm:text-base shrink-0">
                  {formatCurrency(Number(item.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {payload.order.notes && (
            <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs font-medium text-amber-950">
              <span className="font-black uppercase tracking-wider text-[10px] block mb-0.5 text-amber-800">
                Special Instructions:
              </span>
              {payload.order.notes}
            </div>
          )}
        </div>

        {/* ── 4. Multi-Order Session Overview ── */}
        {sessionContext && sessionContext.orders.length > 0 && (
          <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-stone-900">
                  All Orders in This Session
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  {sessionContext.orders.length} {sessionContext.orders.length === 1 ? "ticket" : "tickets"} placed during this table session
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-stone-400 font-bold block">
                  Session Total
                </span>
                <span className="text-base sm:text-lg font-black text-stone-900">
                  {formatCurrency(sessionContext.sessionTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {sessionContext.orders.map((ord, idx) => {
                const isThisOrder = ord.id === orderId;
                return (
                  <div
                    key={ord.id}
                    className={`rounded-2xl border p-4 transition ${
                      isThisOrder
                        ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-200/50"
                        : "border-stone-200 bg-stone-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-tight text-stone-900">
                          Order #{idx + 1}
                        </span>
                        <span className="text-xs text-stone-400 font-mono">
                          ({ord.id.slice(0, 8)})
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                            ord.status === "served" || ord.status === "closed"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : ord.status === "cancelled"
                                ? "bg-rose-100 text-rose-900 border border-rose-200"
                                : "bg-amber-100 text-amber-950 border border-amber-200"
                          }`}
                        >
                          {STATUS_COPY[ord.status] ?? ord.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-stone-900">
                          {formatCurrency(Number(ord.total_amount))}
                        </span>
                        {!isThisOrder && (
                          <Link
                            to={`/r/${tableToken}/order/${ord.id}`}
                            className="min-h-[36px] px-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-800 text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                          >
                            <span>View</span>
                            <ChevronRight size={13} />
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(ord.items || []).map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between rounded-xl bg-white border border-stone-200/80 px-3 py-1.5 text-xs"
                        >
                          <span className="font-semibold text-stone-800 truncate">
                            {it.name} <span className="text-stone-400">×{it.quantity}</span>
                          </span>
                          <span className="font-black text-stone-900 shrink-0">
                            {formatCurrency(Number(it.price) * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. Hospitality Bill Receipt & Settlement Card ── */}
        {sessionContext && (
          <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-stone-900">
                  {sessionContext.bill ? "Official Tax Invoice" : "Table Bill Summary"}
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  {sessionContext.bill
                    ? "Official tax invoice generated by restaurant"
                    : "Total bill calculated across all live session orders"}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-stone-600 font-semibold">
                <span>Subtotal ({sessionContext.orders.length} {sessionContext.orders.length === 1 ? "order" : "orders"})</span>
                <span className="font-black text-stone-900">
                  {formatCurrency(sessionContext.bill?.subtotal ?? sessionContext.sessionTotal)}
                </span>
              </div>

              {sessionContext.bill && sessionContext.bill.discount_amount > 0 && (
                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                  <span>
                    Discount ({sessionContext.bill.discount_type === "percentage" ? `${sessionContext.bill.discount_value}%` : "Flat"})
                    {sessionContext.bill.discount_reason ? ` - ${sessionContext.bill.discount_reason}` : ""}
                  </span>
                  <span className="font-black">
                    -{formatCurrency(sessionContext.bill.discount_amount)}
                  </span>
                </div>
              )}

              {sessionContext.bill && sessionContext.bill.tax_amount > 0 && (
                <div className="flex items-center justify-between text-stone-600 font-semibold">
                  <span>Taxes & GST</span>
                  <span className="font-black text-stone-900">
                    +{formatCurrency(sessionContext.bill.tax_amount)}
                  </span>
                </div>
              )}

              {sessionContext.bill && sessionContext.bill.service_charge > 0 && (
                <div className="flex items-center justify-between text-stone-600 font-semibold">
                  <span>Service Charge</span>
                  <span className="font-black text-stone-900">
                    +{formatCurrency(sessionContext.bill.service_charge)}
                  </span>
                </div>
              )}

              <div className="border-t border-stone-200 pt-3 mt-3 flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-wider text-stone-700">
                  {sessionContext.bill ? "Grand Total" : "Total Payable"}
                </span>
                <span className="text-2xl font-black text-stone-900 tracking-tight">
                  {formatCurrency(sessionContext.bill?.grand_total ?? sessionContext.sessionTotal)}
                </span>
              </div>
            </div>

            {/* Payment Status Badge */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                Payment Status
              </span>
              {sessionContext.paymentStatus === "paid" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-200/80 px-3 py-1 rounded-full">
                  <CheckCircle2 size={14} className="text-emerald-700" /> Bill Settled ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-950 bg-amber-100 border border-amber-200/80 px-3 py-1 rounded-full">
                  <Clock size={14} className="text-amber-700" /> Payment Pending
                </span>
              )}
            </div>

            {/* Action Buttons */}
            {sessionContext.paymentStatus !== "paid" ? (
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <button
                  type="button"
                  disabled={requestingBill || billRequestedSuccess}
                  onClick={handleRequestBill}
                  className="min-h-[52px] rounded-2xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-900 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-xs active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Receipt size={16} className="text-amber-700" />
                  <span>
                    {billRequestedSuccess
                      ? "Bill Requested • Staff Notified"
                      : requestingBill
                        ? "Requesting…"
                        : "Request Bill from Waiter"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="min-h-[52px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-xs active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <QrCode size={16} />
                  <span>Pay Bill Online (UPI / QR) →</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="w-full min-h-[48px] rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-black uppercase tracking-wider hover:bg-emerald-100 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <QrCode size={16} />
                <span>View Payment Confirmation & Receipt</span>
              </button>
            )}
          </div>
        )}

        {/* ── 6. Subtle Footer Attribution ── */}
        <footer className="pt-6 pb-12 text-center text-xs font-semibold text-stone-400">
          <p>{restaurantName} • Table #{tableNum}</p>
          <p className="mt-1 text-[11px] text-stone-400">Powered by Trinetra Restaurant OS</p>
        </footer>
      </main>

      {/* ── 7. Online Payment Modal ── */}
      {showPaymentModal && sessionContext && (
        <CustomerPaymentModal
          tableToken={tableToken}
          tableNumber={tableNum}
          restaurantName={restaurantName}
          upiId={restaurantInfo?.upi_id}
          upiQrUrl={restaurantInfo?.upi_qr_url}
          amount={sessionContext.bill?.grand_total ?? sessionContext.sessionTotal}
          currency="INR"
          sessionId={sessionContext.sessionId}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSubmitted={async (method, utr, tipAmount) => {
            await fetch(`/api/r/${tableToken}/session/pay`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: sessionContext.sessionId,
                paymentMethod: method,
                utrNumber: utr,
                tipAmount: tipAmount || 0,
                amount: sessionContext.bill?.grand_total ?? sessionContext.sessionTotal,
              }),
            });
          }}
        />
      )}
    </div>
  );
}
