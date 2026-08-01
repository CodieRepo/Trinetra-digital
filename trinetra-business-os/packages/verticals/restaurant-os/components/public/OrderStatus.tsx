"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
  const [sessionContext, setSessionContext] = useState<{
    orderCount: number;
    sessionTotal: number;
  } | null>(null);

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

        // Store table_session_id if returned
        if (data.order.table_session_id) {
          window.localStorage.setItem(
            getSessionKey(tableToken),
            data.order.table_session_id,
          );
        }

        // Fetch session context for multi-order total
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
              if (
                sess.session?.status === "active" &&
                Array.isArray(sess.orders) &&
                sess.orders.length > 1
              ) {
                setSessionContext({
                  orderCount: sess.orders.length,
                  sessionTotal: Number(sess.session_total ?? 0),
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
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        Loading order status...
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#0f172a_0%,#111827_45%,#020617_100%)] text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                Live Order
              </p>
              <h1 className="mt-3 text-3xl font-semibold">
                Table {payload.order.table?.table_number ?? "Unknown"} ·{" "}
                {currentLabel}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Order ID {payload.order.id.slice(0, 8)} updates every 5
                seconds.
              </p>
            </div>
            <Link
              to={`/r/${tableToken}?browse=1`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10"
            >
              Order more
            </Link>
          </div>

          {sessionContext && sessionContext.orderCount > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-5 py-3">
              <p className="text-sm text-cyan-200">
                Session total across{" "}
                <span className="font-semibold text-white">
                  {sessionContext.orderCount} orders
                </span>
              </p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(sessionContext.sessionTotal)}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <div className="mt-4 space-y-3">
                {payload.items.map((item) => (
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
                  Total
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatCurrency(payload.order.total_amount)}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <h2 className="text-lg font-semibold">Status timeline</h2>
              <div className="mt-5 space-y-4">
                {payload.events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-cyan-300" />
                      {index !== payload.events.length - 1 ? (
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
        </div>
      </div>
    </div>
  );
}
