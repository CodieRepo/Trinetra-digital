"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

export type ActiveOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  placed: "Order received",
  accepted: "Confirmed",
  preparing: "Being prepared",
  ready: "Ready to serve",
  served: "Served",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export default function ActiveOrderBar({
  itemCount,
  total,
  currency,
  status,
  tableToken,
  orderId,
  items,
  orderNotes,
}: {
  itemCount: number;
  total: number;
  currency: string;
  status: string;
  tableToken: string;
  orderId: string;
  items: ActiveOrderItem[];
  orderNotes: string | null;
}) {
  const label = STATUS_LABEL[status] ?? status;
  const [expanded, setExpanded] = useState(false);

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
                  Active Order
                </h3>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-200">
                  {label}
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

            {/* Items list — scrollable, max 40vh */}
            <div className="max-h-[40vh] overflow-y-auto px-5 py-4">
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-slate-400">Qty {item.quantity}</p>
                      {item.notes ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-semibold text-slate-200">
                      {formatCurrency(item.price * item.quantity, currency)}
                    </p>
                  </div>
                ))}
              </div>

              {orderNotes ? (
                <p className="mt-3 rounded-xl border border-white/8 px-4 py-3 text-sm text-slate-400">
                  Notes: {orderNotes}
                </p>
              ) : null}

              {/* Total + Track Order */}
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Total
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatCurrency(total, currency)}
                  </p>
                </div>
                <Link
                  href={`/r/${tableToken}/order/${orderId}`}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Track Order →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed bar */}
        <div
          className="mx-auto flex max-w-6xl cursor-pointer items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-stone-950/90 px-5 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md"
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
          <div className="flex items-center gap-3 text-sm text-stone-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span>
              <span className="font-medium text-white">Active order</span>
              <span className="mx-1.5 text-stone-500">·</span>
              <span>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
              <span className="mx-1.5 text-stone-500">·</span>
              <span className="text-amber-200">
                {formatCurrency(total, currency)}
              </span>
              <span className="mx-1.5 hidden text-stone-500 sm:inline">·</span>
              <span className="hidden text-emerald-200 sm:inline">{label}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!expanded && <ChevronUp className="h-4 w-4 text-stone-400" />}
            <Link
              href={`/r/${tableToken}/order/${orderId}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Track Order →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
