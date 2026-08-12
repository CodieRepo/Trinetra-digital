"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types — orders view
// ---------------------------------------------------------------------------

type StaffOrder = {
  id: string;
  status: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
  table: {
    id: string;
    table_number: string;
  } | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    notes: string | null;
  }>;
};

type StaffPayload = {
  staff: {
    name: string;
    role: "kitchen" | "waiter";
  };
  orders: StaffOrder[];
};

// ---------------------------------------------------------------------------
// Types — session/table view
// ---------------------------------------------------------------------------

type SessionOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    notes: string | null;
  }>;
};

type TableSession = {
  id: string;
  table: { id: string; table_number: string } | null;
  status: string;
  opened_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_status: string;
  paid_at: string | null;
  order_count: number;
  session_total: number;
  all_orders_terminal: boolean;
  orders: SessionOrder[];
};

type SessionsPayload = {
  sessions: TableSession[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIONS: Record<
  "kitchen" | "waiter",
  Record<string, Array<{ label: string; status: string }>>
> = {
  kitchen: {
    placed: [
      { label: "Accept", status: "accepted" },
      { label: "Cancel", status: "cancelled" },
    ],
    accepted: [
      { label: "Preparing", status: "preparing" },
      { label: "Cancel", status: "cancelled" },
    ],
    preparing: [
      { label: "Ready", status: "ready" },
      { label: "Cancel", status: "cancelled" },
    ],
    ready: [],
  },
  waiter: {
    ready: [{ label: "Served", status: "served" }],
    served: [{ label: "Close", status: "closed" }],
  },
};

const STATUS_BADGE: Record<string, string> = {
  placed: "bg-amber-400/10 text-amber-200 border-amber-400/20",
  accepted: "bg-sky-400/10 text-sky-200 border-sky-400/20",
  preparing: "bg-violet-400/10 text-violet-200 border-violet-400/20",
  ready: "bg-emerald-400/10 text-emerald-200 border-emerald-400/20",
  served: "bg-teal-400/10 text-teal-200 border-teal-400/20",
  closed: "bg-slate-400/10 text-slate-300 border-slate-400/20",
  cancelled: "bg-rose-400/10 text-rose-300 border-rose-400/20",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function timeAgo(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function dwellMinutes(isoString: string) {
  return Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 60000,
  );
}

function isUrgent(isoString: string) {
  return dwellMinutes(isoString) >= 5;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffOrdersPanel({
  restaurantId,
  role,
  token,
}: {
  restaurantId: string;
  role: "kitchen" | "waiter";
  token?: string;
}) {
  const effectiveToken =
    token ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") || ""
      : "");

  // Tabs: 'orders' (always) | 'tables' (waiter only)
  const [activeTab, setActiveTab] = useState<"orders" | "tables">("orders");

  // --- Orders state ---
  const [payload, setPayload] = useState<StaffPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // --- Sessions state ---
  const [sessionsPayload, setSessionsPayload] =
    useState<SessionsPayload | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [staffPaymentMethods, setStaffPaymentMethods] = useState<Record<string, string>>({});
  const [staffSettlingId, setStaffSettlingId] = useState<string | null>(null);

  // --- Orders loading ---
  const loadOrders = useCallback(async () => {
    if (!effectiveToken) return;
    try {
      const res = await fetch(
        `/api/staff/orders?restaurant_id=${restaurantId}`,
        { cache: "no-store", headers: { Authorization: `Bearer ${effectiveToken}` } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load orders.");
      setPayload(data as StaffPayload);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }, [restaurantId, effectiveToken]);

  // --- Sessions loading ---
  const loadSessions = useCallback(async () => {
    if (!effectiveToken) return;
    try {
      setSessionsLoading(true);
      const res = await fetch(
        `/api/staff/sessions?restaurant_id=${restaurantId}`,
        { cache: "no-store", headers: { Authorization: `Bearer ${effectiveToken}` } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions.");
      setSessionsPayload(data as SessionsPayload);
      setSessionsError(null);
    } catch (loadError) {
      setSessionsError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load sessions.",
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [restaurantId, effectiveToken]);

  useEffect(() => {
    if (!effectiveToken) {
      setError("Missing access token. Please access using a valid staff link.");
      setLoading(false);
      return;
    }

    void loadOrders();
    if (role === "waiter") void loadSessions();

    const interval = window.setInterval(() => {
      void loadOrders();
      if (role === "waiter") void loadSessions();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [restaurantId, role, effectiveToken, loadOrders, loadSessions]);

  async function updateStatus(orderId: string, status: string) {
    try {
      setUpdatingOrderId(orderId);
      const res = await fetch(`/api/staff/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order.");

      await loadOrders();
      if (role === "waiter") await loadSessions();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update order.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#111827_0%,#0f172a_45%,#172554_100%)] text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {/* Header */}
        <div className="mb-8 rounded-[30px] border border-cyan-300/20 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Restaurant {role}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            {role === "kitchen" ? "Kitchen queue" : "Waiter service board"}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {payload?.staff?.name
              ? `${payload.staff.name} is signed in.`
              : "Live orders update automatically in real-time."}
          </p>
        </div>

        {/* Tabs — waiter gets Orders + Tables */}
        {role === "waiter" && (
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                activeTab === "orders"
                  ? "bg-cyan-400/15 text-cyan-100 border border-cyan-400/30"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tables")}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                activeTab === "tables"
                  ? "bg-cyan-400/15 text-cyan-100 border border-cyan-400/30"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              Tables
              {sessionsPayload && sessionsPayload.sessions.length > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-400/20 px-1.5 text-[11px] text-cyan-200">
                  {sessionsPayload.sessions.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Global errors */}
        {error ? (
          <div className="mb-6 rounded-3xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {/* ============================================================= */}
        {/* ORDERS TAB (existing behavior)                                 */}
        {/* ============================================================= */}
        {activeTab === "orders" && (
          <>
            {loading ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center">
                <div className="h-10 w-10 rounded-2xl border-2 border-cyan-300/20 border-t-cyan-300 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                  Loading orders...
                </p>
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {(payload?.orders ?? []).map((order) => {
                const inKitchen =
                  order.status === "placed" ||
                  order.status === "accepted" ||
                  order.status === "preparing";
                const urgent = inKitchen && isUrgent(order.created_at);
                return (
                <div
                  key={order.id}
                  className={`rounded-[28px] border p-5 shadow-[0_24px_50px_rgba(0,0,0,0.4)] transition-all backdrop-blur-xl ${
                    urgent
                      ? "border-rose-500/80 bg-rose-950/30 shadow-rose-950/50 animate-urgent-dwell"
                      : order.status === "placed"
                      ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-[#0d0e12]/90 shadow-amber-950/30"
                      : order.status === "preparing"
                      ? "border-indigo-500/40 bg-gradient-to-b from-indigo-500/10 to-[#0d0e12]/90 shadow-indigo-950/30"
                      : "border-white/10 bg-[#0d0e12]/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400 font-extrabold">
                        Table Station
                      </p>
                      <div className="mt-1 flex items-center gap-2.5">
                        <h2 className="text-3xl font-black text-white tracking-tight">
                          {order.table?.table_number ?? "Unknown"}
                        </h2>
                        {urgent && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/50 bg-rose-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-200 shadow-md">
                            <span className="h-2 w-2 animate-ping rounded-full bg-rose-400" />
                            {dwellMinutes(order.created_at)} MIN DWELL
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-2xl border px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.2em] shadow-sm ${STATUS_BADGE[order.status] ?? "bg-cyan-500/10 text-cyan-200 border-cyan-500/20"}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-sm text-slate-200"
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`font-black text-white ${role === "kitchen" ? "text-lg md:text-xl text-amber-200" : "text-sm"}`}>
                            {item.name}
                          </p>
                          {item.notes ? (
                            <p className="text-xs text-amber-300 font-bold bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-500/40 mt-1.5 inline-block">
                              Note: {item.notes}
                            </p>
                          ) : null}
                        </div>
                        <span className={`rounded-2xl font-black shrink-0 ${role === "kitchen" ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 text-lg shadow-md" : "bg-white/10 px-2.5 py-1 text-xs"}`}>
                          {item.quantity}x
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes ? (
                    <p className="mt-4 rounded-2xl border border-amber-500/50 bg-amber-950/40 px-4 py-3 text-xs md:text-sm font-black text-amber-200 backdrop-blur">
                      Kitchen Special Note: {order.notes}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>
                      Placed at {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                    <span className="font-extrabold text-white text-sm">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {(ACTIONS[role][order.status] ?? []).map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() => updateStatus(order.id, action.status)}
                        className={`rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer border ${
                          action.status === "accepted"
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40 shadow-indigo-600/30"
                            : action.status === "preparing"
                            ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 shadow-purple-600/30"
                            : action.status === "ready"
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40 shadow-emerald-600/30"
                            : action.status === "served"
                            ? "bg-teal-600 hover:bg-teal-500 text-white border-teal-400/40 shadow-teal-600/30"
                            : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {updatingOrderId === order.id
                          ? "Updating..."
                          : action.label}
                      </button>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>

            {!loading && !payload?.orders.length ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-white/15 bg-[#0d0e12]/60 px-6 py-16 text-center text-slate-400 backdrop-blur-xl">
                <p className="text-base font-extrabold text-slate-200">
                  No active orders right now
                </p>
                <p className="mt-1.5 text-xs text-slate-400 font-medium">
                  New dining table orders will stream in automatically.
                </p>
              </div>
            ) : null}
          </>
        )}

        {/* ============================================================= */}
        {/* TABLES TAB (waiter only — session grouping + close action)     */}
        {/* ============================================================= */}
        {activeTab === "tables" && role === "waiter" && (
          <>
            {sessionsError ? (
              <div className="mb-6 rounded-3xl border border-rose-500/30 bg-rose-950/40 px-5 py-4 text-sm text-rose-200 backdrop-blur-xl">
                {sessionsError}
              </div>
            ) : null}
            {sessionsLoading && !sessionsPayload ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-[#0d0e12]/80 px-6 py-16 text-center backdrop-blur-xl">
                <div className="h-10 w-10 rounded-2xl border-2 border-indigo-400/20 border-t-indigo-400 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                  Loading active table sessions...
                </p>
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
              {(sessionsPayload?.sessions ?? []).map((session) => {
                const latestOrder = session.orders[session.orders.length - 1];
                const latestStatus = latestOrder?.status ?? "—";

                return (
                  <div
                    key={session.id}
                    className="rounded-[28px] border border-white/10 bg-[#0d0e12]/90 p-6 shadow-[0_25px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                  >
                    {/* Session header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400 font-extrabold">
                          Table Session
                        </p>
                        <h2 className="mt-1 text-3xl font-black text-white tracking-tight">
                          {session.table?.table_number ?? "Unknown"}
                        </h2>
                        {session.customer_name && (
                          <p className="mt-1 text-sm font-bold text-indigo-300">
                            {session.customer_name}
                            {session.customer_phone && (
                              <span className="ml-2 text-xs text-slate-400 font-mono font-normal">
                                {session.customer_phone}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {session.payment_status === "paid" && (
                            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200 shadow-sm">
                              Paid ✓
                            </span>
                          )}
                          <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-200">
                            Active
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                          {timeAgo(session.opened_at)}
                        </span>
                      </div>
                    </div>

                    {/* Session metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-black/40 px-3 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Orders
                        </p>
                        <p className="mt-1 text-xl font-black text-white">
                          {session.order_count}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                          Total Bill
                        </p>
                        <p className="mt-1 text-xl font-black text-amber-300">
                          {formatCurrency(session.session_total)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/40 px-3 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Latest Status
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-slate-200 capitalize">
                          {latestStatus}
                        </p>
                      </div>
                    </div>

                    {/* Order breakdown */}
                    <div className="mt-4 max-h-48 space-y-2.5 overflow-y-auto custom-scrollbar pr-1">
                      {session.orders.map((order, idx) => (
                        <div
                          key={order.id}
                          className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">
                                Order #{idx + 1}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_BADGE[order.status] ?? "bg-cyan-300/10 text-cyan-100 border-cyan-300/20"}`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <span className="text-sm font-extrabold text-white">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs text-slate-300"
                              >
                                <span>
                                  {item.name}{" "}
                                  <span className="text-amber-400 font-black">
                                    x{item.quantity}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Waiter Payment Settlement Authority Bar */}
                    {role === "waiter" && (
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300 font-bold">
                            {session.payment_status === "paid" ? "Bill Settled ✓" : "Collect & Settle Payment:"}
                          </span>
                          <span className="text-xs font-black text-amber-300">
                            Bill Total: {formatCurrency(session.session_total)}
                          </span>
                        </div>

                        {session.payment_status !== "paid" && (
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1 rounded-2xl bg-black/50 p-1.5 border border-white/10 text-[11px] font-black">
                              {["cash", "upi", "card"].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() =>
                                    setStaffPaymentMethods((prev) => ({ ...prev, [session.id]: m }))
                                  }
                                  className={`px-3 py-1.5 rounded-xl uppercase transition cursor-pointer ${
                                    (staffPaymentMethods[session.id] || "cash") === m
                                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              disabled={staffSettlingId === session.id}
                              onClick={async () => {
                                try {
                                  setStaffSettlingId(session.id);
                                  const method = staffPaymentMethods[session.id] || "cash";
                                  const res = await fetch("/api/staff/sessions/payment", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      token,
                                      session_id: session.id,
                                      payment_method: method,
                                    }),
                                  });
                                  if (!res.ok) {
                                    const d = await res.json();
                                    throw new Error(d.error || "Failed to settle bill");
                                  }
                                  void loadSessions();
                                } catch (e: any) {
                                  alert(e.message || "Failed to settle payment");
                                } finally {
                                  setStaffSettlingId(null);
                                }
                              }}
                              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-black text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-500/25 disabled:opacity-50 cursor-pointer border border-emerald-400/30"
                            >
                              {staffSettlingId === session.id ? "Settling..." : "Mark Paid ✓"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!sessionsLoading && !sessionsPayload?.sessions.length ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-white/12 px-6 py-12 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-300">
                  No active table sessions right now
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Occupied tables with open orders will appear here.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
