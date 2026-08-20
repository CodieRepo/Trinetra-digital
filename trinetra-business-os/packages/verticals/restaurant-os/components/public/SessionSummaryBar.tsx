"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Clock, ChevronRight } from "lucide-react";

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

  const orderCount = orders.length;

  // Latest active (non-closed, non-cancelled) order for status display
  const latestActive = [...orders]
    .reverse()
    .find((o) => o.status !== "closed" && o.status !== "cancelled");
  const latestStatus = latestActive
    ? (STATUS_LABEL[latestActive.status] ?? latestActive.status)
    : "All served";

  const trackOrderId =
    latestOrderId ?? latestActive?.id ?? orders[orders.length - 1]?.id;

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
          onClick={() => setExpanded(false)}
          aria-hidden
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 p-4 bg-gradient-to-t from-[#faf8f5] via-[#faf8f5]/90 to-transparent pointer-events-none">
        <div className="mx-auto max-w-lg pointer-events-auto">
          {/* Expanded Drawer */}
          {expanded && (
            <div className="mb-3 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl p-5 animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-600" />
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-tight text-stone-900">
                    Table Dining Session
                  </h3>
                </div>
                <span className="rounded-full bg-amber-100 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-black text-amber-950 uppercase tracking-wide">
                  {orderCount} {orderCount === 1 ? "order" : "orders"}
                </span>
              </div>

              {/* Order List */}
              <div className="mt-3.5 space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                {orders.map((ord, idx) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-stone-50/60 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-stone-900">
                          Order #{idx + 1}
                        </span>
                        <span className="rounded-full bg-amber-100 text-amber-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                          {STATUS_LABEL[ord.status] ?? ord.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {ord.items.reduce((s, it) => s + it.quantity, 0)} items · {formatCurrency(ord.total_amount, currency)}
                      </p>
                    </div>

                    <Link
                      to={`/r/${tableToken}/order/${ord.id}`}
                      className="min-h-[36px] px-3 rounded-xl bg-stone-900 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:bg-stone-800 transition"
                    >
                      <span>Track</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                  Session Subtotal
                </span>
                <span className="text-xl font-black text-stone-900">
                  {formatCurrency(sessionTotal, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Sticky Bar Button */}
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2.5 shadow-xl">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex-1 flex items-center justify-between px-2 text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xs">
                  <Clock size={15} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                    Session: {latestStatus}
                  </p>
                  <p className="text-sm font-black text-stone-900">
                    {orderCount} {orderCount === 1 ? "Order" : "Orders"} · {formatCurrency(sessionTotal, currency)}
                  </p>
                </div>
              </div>

              <div className="h-8 w-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </div>
            </button>

            {trackOrderId && (
              <Link
                to={`/r/${tableToken}/order/${trackOrderId}`}
                className="min-h-[44px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
              >
                <span>Live Tracker</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
