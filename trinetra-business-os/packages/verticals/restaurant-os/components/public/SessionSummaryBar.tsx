"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

export type SessionOrderSummary = {
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

const STATUS_LABEL: Record<string, string> = {
  placed: "Order received",
  accepted: "Confirmed",
  preparing: "Being prepared",
  ready: "Ready to serve",
  served: "Served",
  closed: "Completed",
  cancelled: "Cancelled",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export default function SessionSummaryBar({
  orders,
  sessionTotal,
  currency,
  tableToken,
  latestOrderId,
}: {
  orders: SessionOrderSummary[];
  sessionTotal: number;
  currency: string;
  tableToken: string;
  latestOrderId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalItems = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0),
    0,
  );
  const orderCount = orders.length;

  // Latest active (non-closed, non-cancelled) order for status display
  const latestActive = [...orders]
    .reverse()
    .find((o) => o.status !== "closed" && o.status !== "cancelled");
  const latestStatus = latestActive
    ? (STATUS_LABEL[latestActive.status] ?? latestActive.status)
    : "All served";

  // The order to link "Track Order" to — latest active, or the most recent
  const trackOrderId =
    latestOrderId ?? latestActive?.id ?? orders[orders.length - 1]?.id;

  return (
    <>
      {/* Backdrop — only when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
          aria-hidden
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
        {/* Expandable panel */}
        {expanded && (
          <div className="mx-auto mb-2 max-w-6xl overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950/95 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                </span>
                <h3 className="text-sm font-semibold text-white">
                  Table Session
                </h3>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-200">
                  {orderCount} {orderCount === 1 ? "order" : "orders"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
              >
                Collapse
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Orders list — scrollable, max 50vh */}
            <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                {orders.map((order, idx) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-white/8 bg-white/3 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">
                          Order {idx + 1}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                            order.status === "closed" ||
                            order.status === "served"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : order.status === "cancelled"
                                ? "bg-rose-400/10 text-rose-300"
                                : "bg-cyan-400/10 text-cyan-200"
                          }`}
                        >
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(order.total_amount, currency)}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm text-slate-300"
                        >
                          <span>
                            {item.name}{" "}
                            <span className="text-slate-500">
                              x{item.quantity}
                            </span>
                          </span>
                          <span className="text-slate-400">
                            {formatCurrency(
                              item.price * item.quantity,
                              currency,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {order.notes ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Notes: {order.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Session total + Track Order */}
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Session Total
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatCurrency(sessionTotal, currency)}
                  </p>
                </div>
                {trackOrderId ? (
                  <Link
                    to={`/r/${tableToken}/order/${trackOrderId}`}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    Track Latest Order →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Collapsed bar */}
        <div
          className="mx-auto flex max-w-6xl cursor-pointer items-center justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-[#0d0e12]/95 px-5 py-3.5 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all hover:border-indigo-400/50"
          onClick={() => setExpanded((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((prev) => !prev);
            }
          }}
        >
          <div className="flex items-center gap-3 text-xs md:text-sm text-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span>
              <span className="font-extrabold text-white">Table Session</span>
              <span className="mx-1.5 text-slate-500">·</span>
              <span className="font-semibold">
                {orderCount} {orderCount === 1 ? "order" : "orders"}
              </span>
              <span className="mx-1.5 text-slate-500">·</span>
              <span className="font-semibold">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
              <span className="mx-1.5 text-slate-500">·</span>
              <span className="text-amber-300 font-black">
                {formatCurrency(sessionTotal, currency)}
              </span>
              <span className="mx-1.5 hidden text-slate-500 sm:inline">·</span>
              <span className="hidden text-emerald-300 font-bold sm:inline">
                {latestStatus}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!expanded && <ChevronUp className="h-4 w-4 text-slate-400" />}
            {trackOrderId ? (
              <Link
                to={`/r/${tableToken}/order/${trackOrderId}`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 px-4 py-2 text-xs font-black text-white transition-all shadow-md cursor-pointer"
              >
                Track Order →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
