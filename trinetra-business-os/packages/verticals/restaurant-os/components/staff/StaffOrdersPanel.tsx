"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffOrdersPanel({
  restaurantId,
  role,
}: {
  restaurantId: string;
  role: "kitchen" | "waiter";
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

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

  // --- Orders loading ---
  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `/api/staff/orders?restaurant_id=${restaurantId}`,
        { cache: "no-store", headers: { Authorization: `Bearer ${token}` } },
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
  }, [restaurantId, token]);

  // --- Sessions loading ---
  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      setSessionsLoading(true);
      const res = await fetch(
        `/api/staff/sessions?restaurant_id=${restaurantId}`,
        { cache: "no-store", headers: { Authorization: `Bearer ${token}` } },
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
  }, [restaurantId, token]);

  useEffect(() => {
    if (!token) {
      setError("Missing access token.");
      setLoading(false);
      return;
    }

    void loadOrders();
    if (role === "waiter") void loadSessions();

    const interval = window.setInterval(() => {
      void loadOrders();
      if (role === "waiter") void loadSessions();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [restaurantId, role, token, loadOrders, loadSessions]);

  async function updateStatus(orderId: string, status: string) {
    try {
      setUpdatingOrderId(orderId);
      const res = await fetch(`/api/staff/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
              : "Live orders update automatically through Supabase Realtime."}
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
              <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center">
                Loading orders...
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {(payload?.orders ?? []).map((order) => (
                <div
                  key={order.id}
                  className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 shadow-[0_24px_45px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Table
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {order.table?.table_number ?? "Unknown"}
                      </h2>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em] ${STATUS_BADGE[order.status] ?? "bg-cyan-300/10 text-cyan-100 border-cyan-300/20"}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 rounded-3xl border border-white/8 bg-white/5 p-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm text-slate-200"
                      >
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          {item.notes ? (
                            <p className="text-xs text-slate-400">
                              {item.notes}
                            </p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes ? (
                    <p className="mt-4 rounded-2xl border border-white/8 px-4 py-3 text-sm text-slate-300">
                      {order.notes}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                    <span>
                      {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(ACTIONS[role][order.status] ?? []).map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() => updateStatus(order.id, action.status)}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingOrderId === order.id
                          ? "Updating..."
                          : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!loading && !payload?.orders.length ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-white/12 px-6 py-12 text-center text-slate-400">
                No active orders right now.
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
              <div className="mb-6 rounded-3xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
                {sessionsError}
              </div>
            ) : null}
            {sessionsLoading && !sessionsPayload ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center">
                Loading table sessions...
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
              {(sessionsPayload?.sessions ?? []).map((session) => {
                const latestOrder = session.orders[session.orders.length - 1];
                const latestStatus = latestOrder?.status ?? "—";

                return (
                  <div
                    key={session.id}
                    className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 shadow-[0_24px_45px_rgba(0,0,0,0.25)]"
                  >
                    {/* Session header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                          Table
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                          {session.table?.table_number ?? "Unknown"}
                        </h2>
                        {session.customer_name && (
                          <p className="mt-1 text-sm text-cyan-200">
                            {session.customer_name}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {session.payment_status === "paid" && (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/20 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
                              Paid
                            </span>
                          )}
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-200">
                            Active
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {timeAgo(session.opened_at)}
                        </span>
                      </div>
                    </div>

                    {/* Session metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5 text-center">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">
                          Orders
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {session.order_count}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5 text-center">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">
                          Total
                        </p>
                        <p className="mt-1 text-lg font-semibold text-amber-200">
                          {formatCurrency(session.session_total)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5 text-center">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">
                          Latest
                        </p>
                        <p
                          className={`mt-1 text-sm font-medium ${STATUS_BADGE[latestStatus]?.includes("text-") ? STATUS_BADGE[latestStatus].split(" ").find((c) => c.startsWith("text-")) : "text-slate-200"}`}
                        >
                          {latestStatus}
                        </p>
                      </div>
                    </div>

                    {/* Order breakdown */}
                    <div className="mt-4 max-h-48 space-y-2.5 overflow-y-auto">
                      {session.orders.map((order, idx) => (
                        <div
                          key={order.id}
                          className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Order {idx + 1}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_BADGE[order.status] ?? "bg-cyan-300/10 text-cyan-100 border-cyan-300/20"}`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-slate-200">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs text-slate-400"
                              >
                                <span>
                                  {item.name}{" "}
                                  <span className="text-slate-600">
                                    x{item.quantity}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {!sessionsLoading && !sessionsPayload?.sessions.length ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-white/12 px-6 py-12 text-center text-slate-400">
                No active table sessions right now.
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
