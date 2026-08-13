"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Receipt, QrCode, CheckCircle, Loader2, AlertCircle } from "lucide-react";
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
      table_number: string;
    } | null;
  };
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

const STATUS_COPY: Record<string, string> = {
  placed: "Order received",
  accepted: "Order confirmed",
  preparing: "Being prepared",
  ready: "Ready to serve",
  served: "Order served",
  closed: "Completed",
  cancelled: "Cancelled",
};

const STEP_ORDER = ["placed", "accepted", "preparing", "ready", "served", "closed"];

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
  const [restaurantInfo, setRestaurantInfo] = useState<{ name: string; upi_id?: string; upi_qr_url?: string } | null>(null);
  const [billRequesting, setBillRequesting] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [billRequestError, setBillRequestError] = useState<string | null>(null);
  const [billToastMessage, setBillToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const sessionToken = window.localStorage.getItem(SESSION_KEY);

    async function loadOrder() {
      if (!sessionToken) {
        setError("This device has no restaurant session for the order.");
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
              ? "Order not found for this session."
              : "Failed to load order.",
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
        if (data.order.table_session_id) {
          window.localStorage.setItem(
            getSessionKey(tableToken),
            data.order.table_session_id,
          );
        }

        // Fetch session context for all orders & bill calculation
        const storedSessionId =
          data.order.table_session_id ??
          window.localStorage.getItem(getSessionKey(tableToken));
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
                if (sess.session.bill_requested_at || sess.session.payment_status === "requested") {
                  setBillRequested(true);
                }
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
          window.localStorage.removeItem(getOrderKey(tableToken));
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load order.",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#0f172a_0%,#111827_45%,#020617_100%)] text-stone-100 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-2xl border-2 border-cyan-300/20 border-t-cyan-300 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
          Tracking your order...
        </p>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center px-6 text-center">
        {error || "Order unavailable."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(99,102,241,0.15),rgba(0,0,0,0))] text-slate-50 font-sans selection:bg-indigo-500/30">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className="rounded-[32px] border border-white/10 bg-[#0d0e12]/80 p-6 md:p-8 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-400 font-extrabold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                Live Order Tracker
              </p>
              <h1 className="mt-2 text-2xl md:text-4xl font-black text-white tracking-tight">
                Table {payload.order.table?.table_number ?? "Unknown"} ·{" "}
                <span className="text-indigo-300">{currentLabel}</span>
              </h1>
              <p className="mt-1.5 text-xs text-slate-400 font-medium">
                Order ID #{payload.order.id.slice(0, 8)} · Realtime updates active
              </p>
            </div>
            <Link
              to={`/r/${tableToken}?browse=1`}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-black text-white hover:bg-white/10 transition-all cursor-pointer shadow-sm"
            >
              Add More Items +
            </Link>
          </div>

          {/* Session Banner */}
          {sessionContext && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-3.5 backdrop-blur">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-indigo-300">
                  Active Table Session
                </p>
                <p className="text-sm font-black text-white mt-0.5">
                  {sessionContext.orders.length} {sessionContext.orders.length === 1 ? "Order Placed" : "Orders Placed"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {sessionContext.paymentStatus === "paid" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1 text-xs font-black text-emerald-300">
                    <CheckCircle2 size={13} />
                    Bill Settled ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3.5 py-1 text-xs font-black text-amber-300">
                    <Clock size={13} />
                    Dining Session Active
                  </span>
                )}
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Session Total</p>
                  <p className="text-lg font-black text-amber-300">
                    {formatCurrency(sessionContext.sessionTotal)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress stepper */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5 shadow-inner">
            <div className="flex items-center justify-between gap-2">
              {STEP_ORDER.map((step, index) => {
                const stepIndex = STEP_ORDER.indexOf(payload.order.status);
                const cancelled = payload.order.status === "cancelled";
                const isReached = !cancelled && stepIndex >= index;
                const isCurrent = !cancelled && stepIndex === index;
                return (
                  <div
                    key={step}
                    className="flex flex-1 items-center gap-2 last:flex-none"
                  >
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-all ${
                          cancelled
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : isCurrent
                              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/20"
                              : isReached
                                ? "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40"
                                : "bg-white/5 text-slate-500 border border-white/5"
                        }`}
                      >
                        {cancelled ? "!" : isReached ? "✓" : index + 1}
                      </div>
                      <span
                        className={`text-center text-[9px] font-black uppercase tracking-wider ${
                          cancelled
                            ? "text-rose-300"
                            : isReached
                              ? "text-slate-200"
                              : "text-slate-500"
                        }`}
                      >
                        {STATUS_COPY[step].split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                    {index !== STEP_ORDER.length - 1 ? (
                      <div
                        className={`mb-5 h-0.5 flex-1 rounded-full transition-all ${
                          cancelled
                            ? "bg-white/5"
                            : isReached && !isCurrent
                              ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                              : "bg-white/5"
                        }`}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <h2 className="text-lg font-semibold">Current Order ({payload.order.id.slice(0, 8)})</h2>
              <div className="mt-4 space-y-3">
                {(payload.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-slate-400">Qty {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-slate-100">
                      {formatCurrency(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              {payload.order.notes ? (
                <p className="mt-4 rounded-2xl border border-white/8 px-4 py-3 text-sm text-slate-300">
                  Notes: {payload.order.notes}
                </p>
              ) : null}
              <div className="mt-4 border-t border-white/10 pt-4 text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Order Total
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatCurrency(payload.order.total_amount)}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <h2 className="text-lg font-semibold">Status timeline</h2>
              <div className="mt-5 space-y-4">
                {(payload.events || []).map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-cyan-300" />
                      {index !== (payload.events || []).length - 1 ? (
                        <div className="mt-2 h-full w-px bg-white/10" />
                      ) : null}
                    </div>
                    <div className="pb-5">
                      <p className="font-medium text-white">
                        {STATUS_COPY[event.to_status] ?? event.to_status}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {event.actor_role || "system"} ·{" "}
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ALL SESSION ORDERS SECTION */}
          {sessionContext && sessionContext.orders.length > 0 && (
            <div className="mt-8 rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    All Orders in this Session ({sessionContext.orders.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Items placed across all orders for this table
                  </p>
                </div>
                <span className="text-sm font-bold text-cyan-300">
                  Subtotal: {formatCurrency(sessionContext.sessionTotal)}
                </span>
              </div>

              <div className="space-y-4">
                {sessionContext.orders.map((ord, index) => (
                  <div
                    key={ord.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      ord.id === orderId
                        ? "border-cyan-400/40 bg-cyan-400/5 shadow-md shadow-cyan-400/10"
                        : "border-white/8 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Order #{index + 1}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({ord.id.slice(0, 8)})
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                            ord.status === "closed" || ord.status === "served"
                              ? "bg-emerald-400/15 text-emerald-300 border border-emerald-500/20"
                              : ord.status === "cancelled"
                                ? "bg-rose-400/15 text-rose-300 border border-rose-500/20"
                                : "bg-cyan-400/15 text-cyan-200 border border-cyan-500/20"
                          }`}
                        >
                          {STATUS_COPY[ord.status] ?? ord.status}
                        </span>
                        {ord.id === orderId && (
                          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300">
                            CURRENTLY VIEWING
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">
                          {formatCurrency(ord.total_amount)}
                        </span>
                        {ord.id !== orderId && (
                          <Link
                            to={`/r/${tableToken}/order/${ord.id}`}
                            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-cyan-200 hover:bg-white/20"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(ord.items || []).map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-xs"
                        >
                          <span className="font-medium text-slate-200">
                            {it.name} <span className="text-slate-400">x{it.quantity}</span>
                          </span>
                          <span className="font-semibold text-slate-300">
                            {formatCurrency(Number(it.price) * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TABLE SESSION BILL & SETTLEMENT SUMMARY */}
          {sessionContext && (
            <div className="mt-8 rounded-[24px] border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-transparent p-5 backdrop-blur">
              <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 mb-4">
                <Receipt className="h-5 w-5 text-amber-300" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {sessionContext.bill ? "Final Table Bill Breakdown" : "Estimated Session Bill"}
                  </h3>
                  <p className="text-xs text-amber-200/80">
                    {sessionContext.bill
                      ? "Official tax invoice generated by restaurant"
                      : "Total bill calculated across all live session orders"}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Subtotal ({sessionContext.orders.length} orders)</span>
                  <span className="font-medium text-white">
                    {formatCurrency(sessionContext.bill?.subtotal ?? sessionContext.sessionTotal)}
                  </span>
                </div>

                {sessionContext.bill && sessionContext.bill.discount_amount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>
                      Discount ({sessionContext.bill.discount_type === "percentage" ? `${sessionContext.bill.discount_value}%` : "Flat"})
                      {sessionContext.bill.discount_reason ? ` - ${sessionContext.bill.discount_reason}` : ""}
                    </span>
                    <span className="font-medium">
                      -{formatCurrency(sessionContext.bill.discount_amount)}
                    </span>
                  </div>
                )}

                {sessionContext.bill && sessionContext.bill.tax_amount > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Taxes & GST</span>
                    <span className="font-medium text-white">
                      +{formatCurrency(sessionContext.bill.tax_amount)}
                    </span>
                  </div>
                )}

                {sessionContext.bill && sessionContext.bill.service_charge > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Service Charge</span>
                    <span className="font-medium text-white">
                      +{formatCurrency(sessionContext.bill.service_charge)}
                    </span>
                  </div>
                )}

                <div className="border-t border-white/15 pt-3 mt-3 flex items-center justify-between text-lg font-extrabold text-white">
                  <span>{sessionContext.bill ? "Grand Total" : "Subtotal Payable"}</span>
                  <span className="text-2xl text-amber-300">
                    {formatCurrency(sessionContext.bill?.grand_total ?? sessionContext.sessionTotal)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-black/40 px-4 py-3 border border-white/10">
                  <span className="text-xs uppercase tracking-wider text-slate-400">
                    Payment Status
                  </span>
                  {sessionContext.paymentStatus === "paid" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 size={14} /> PAID & SETTLED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Clock size={14} /> PAYMENT PENDING
                    </span>
                  )}
                </div>

                {/* ONLINE PAYMENT & BILL REQUEST BUTTONS */}
                {sessionContext.paymentStatus !== "paid" ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={billRequesting || billRequested}
                        onClick={async () => {
                          if (!sessionContext?.sessionId || billRequesting || billRequested) return;
                          setBillRequesting(true);
                          setBillRequestError(null);
                          try {
                            const res = await fetch(`/api/r/${tableToken}/session/request-bill`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ sessionId: sessionContext.sessionId }),
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              setBillRequested(true);
                              setBillToastMessage(data.message || "Bill request sent to staff. A waiter will bring your bill.");
                            } else {
                              setBillRequestError(data.error || "Couldn't send bill request. Please retry.");
                            }
                          } catch (err: any) {
                            setBillRequestError(err?.message || "Couldn't send bill request. Please retry.");
                          } finally {
                            setBillRequesting(false);
                          }
                        }}
                        className={`flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-bold transition active:scale-[0.98] ${
                          billRequested
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 cursor-not-allowed opacity-90"
                            : billRequesting
                            ? "border-amber-500/30 bg-amber-500/15 text-amber-300 cursor-wait"
                            : "border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                        }`}
                      >
                        {billRequested ? (
                          <>
                            <CheckCircle size={18} className="text-emerald-400" /> Bill Requested ✓
                          </>
                        ) : billRequesting ? (
                          <>
                            <Loader2 size={18} className="animate-spin text-amber-400" /> Requesting...
                          </>
                        ) : (
                          <>
                            <Receipt size={18} className="text-amber-400" /> Request Bill from Waiter
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(true)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-400 transition active:scale-[0.98] cursor-pointer"
                      >
                        <QrCode size={18} /> Pay Bill Online (UPI / QR / Cash) →
                      </button>
                    </div>

                    {billToastMessage && (
                      <div className="flex items-center justify-between gap-3 p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-bold backdrop-blur">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                          <span>{billToastMessage}</span>
                        </div>
                        <button onClick={() => setBillToastMessage(null)} className="text-emerald-400 hover:text-white text-xs font-extrabold px-2 py-0.5 cursor-pointer">✕</button>
                      </div>
                    )}

                    {billRequestError && (
                      <div className="flex items-center justify-between gap-3 p-3.5 bg-rose-950/70 border border-rose-500/40 rounded-2xl text-rose-200 text-xs font-bold backdrop-blur">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-rose-400 shrink-0" />
                          <span>{billRequestError}</span>
                        </div>
                        <button onClick={() => setBillRequestError(null)} className="text-rose-300 hover:text-white underline text-xs font-extrabold cursor-pointer">Dismiss</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 py-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                  >
                    <QrCode size={16} /> View Online Payment QR & Details
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ONLINE PAYMENT MODAL */}
          {showPaymentModal && sessionContext && (
            <CustomerPaymentModal
              tableToken={tableToken}
              tableNumber={payload?.order?.table?.table_number}
              restaurantName={restaurantInfo?.name || "The Restaurant"}
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
      </div>
    </div>
  );
}
