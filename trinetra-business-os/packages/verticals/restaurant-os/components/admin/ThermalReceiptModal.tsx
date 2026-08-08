"use client";

import { Printer, X } from "lucide-react";

export type ReceiptData = {
  restaurantName: string;
  restaurantAddress?: string | null;
  businessGstin?: string | null;
  receiptHeaderNote?: string | null;
  receiptFooterNote?: string | null;
  tableNumber: string;
  sessionId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  openedAt: string;
  paidAt: string;
  orders: Array<{
    id: string;
    totalAmount: number;
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  }>;
  bill: {
    subtotal: number;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    discountReason?: string | null;
    taxAmount: number;
    serviceCharge: number;
    roundOff: number;
    grandTotal: number;
    paymentMethod?: string | null;
    paymentBreakdown?: Record<string, number> | null;
  };
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export default function ThermalReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  function handlePrint() {
    const receiptElem = document.getElementById("thermal-receipt-container");
    if (!receiptElem) {
      window.print();
      return;
    }

    let iframe = document.getElementById("thermal-print-iframe") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "thermal-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "0px";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thermal Tax Receipt</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 10px;
              width: 78mm;
              box-sizing: border-box;
              font-family: monospace, Courier, monospace;
              font-size: 11px;
              line-height: 1.25;
              color: #000;
              background: #fff;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-extrabold { font-weight: 800; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .border-b { border-bottom: 1px dashed #666; margin-bottom: 4px; padding-bottom: 4px; }
            .border-t { border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; }
            .my-2 { margin-top: 6px; margin-bottom: 6px; }
            .uppercase { text-transform: uppercase; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .text-emerald-600, .text-emerald-400 { color: #000 !important; }
            .bg-slate-100 { background: #f0f0f0 !important; }
          </style>
        </head>
        <body>
          ${receiptElem.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  }

  // Flatten all items across orders
  const allItems: Array<{ name: string; price: number; quantity: number; total: number }> = [];
  receipt.orders.forEach((ord) => {
    ord.items.forEach((it) => {
      const existing = allItems.find((x) => x.name === it.name && x.price === Number(it.price));
      if (existing) {
        existing.quantity += it.quantity;
        existing.total += Number(it.price) * it.quantity;
      } else {
        allItems.push({
          name: it.name,
          price: Number(it.price),
          quantity: it.quantity,
          total: Number(it.price) * it.quantity,
        });
      }
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-container, #thermal-receipt-container * {
            visibility: visible;
          }
          #thermal-receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            font-family: monospace !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-slate-900 shadow-2xl text-slate-900">
        {/* Controls Header (Hidden on print) */}
        <div className="no-print flex items-center justify-between border-b border-white/10 bg-slate-800/80 px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold">80mm Thermal Tax Invoice</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition shadow-md shadow-amber-400/20"
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Receipt Printable Area (80mm Width format) */}
        <div className="max-h-[75vh] overflow-y-auto p-4 bg-slate-950 flex justify-center">
          <div
            id="thermal-receipt-container"
            className="w-[80mm] rounded-xl bg-white p-4 shadow-lg text-slate-950 font-mono text-[11px] leading-tight"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h2 className="text-base font-extrabold uppercase tracking-wider text-black">
                {receipt.restaurantName}
              </h2>
              {receipt.restaurantAddress && (
                <p className="mt-1 text-[10px] text-slate-600 leading-tight">
                  {receipt.restaurantAddress}
                </p>
              )}
              {receipt.businessGstin && (
                <p className="mt-1 text-[10px] font-bold text-slate-800">
                  GSTIN: {receipt.businessGstin}
                </p>
              )}
              {receipt.receiptHeaderNote && (
                <p className="mt-1 text-[9px] italic text-slate-500">
                  {receipt.receiptHeaderNote}
                </p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="my-2 border-b border-dashed border-slate-300 pb-2 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="font-bold">INVOICE NO:</span>
                <span>INV-{receipt.sessionId.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">TABLE NO:</span>
                <span className="font-extrabold text-black">TABLE {receipt.tableNumber}</span>
              </div>
              {receipt.customerName && (
                <div className="flex justify-between">
                  <span>GUEST:</span>
                  <span>{receipt.customerName}</span>
                </div>
              )}
              <div className="flex justify-between text-[9px] text-slate-600">
                <span>DATE/TIME:</span>
                <span>{new Date(receipt.paidAt || Date.now()).toLocaleString()}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border-b border-dashed border-slate-300 pb-2">
              <div className="flex font-bold border-b border-slate-200 pb-1 mb-1 text-[10px]">
                <span className="w-1/2">ITEM</span>
                <span className="w-1/6 text-center">QTY</span>
                <span className="w-1/3 text-right">AMOUNT</span>
              </div>

              <div className="space-y-1">
                {allItems.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[10.5px]">
                    <span className="w-1/2 truncate font-medium">{it.name}</span>
                    <span className="w-1/6 text-center font-bold">x{it.quantity}</span>
                    <span className="w-1/3 text-right font-semibold">{formatCurrency(it.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="my-2 border-b border-dashed border-slate-300 pb-2 space-y-1 text-[10.5px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(receipt.bill.subtotal)}</span>
              </div>

              {receipt.bill.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>
                    DISCOUNT ({receipt.bill.discountType === "percentage" ? `${receipt.bill.discountValue}%` : "FLAT"}):
                  </span>
                  <span>-{formatCurrency(receipt.bill.discountAmount)}</span>
                </div>
              )}

              {receipt.bill.taxAmount > 0 && (
                <>
                  <div className="flex justify-between text-slate-700 text-[9.5px]">
                    <span>CGST (2.5%):</span>
                    <span>+{formatCurrency(receipt.bill.taxAmount / 2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 text-[9.5px]">
                    <span>SGST (2.5%):</span>
                    <span>+{formatCurrency(receipt.bill.taxAmount / 2)}</span>
                  </div>
                </>
              )}

              {receipt.bill.serviceCharge > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>SERVICE CHARGE:</span>
                  <span>+{formatCurrency(receipt.bill.serviceCharge)}</span>
                </div>
              )}

              {receipt.bill.roundOff !== 0 && (
                <div className="flex justify-between text-[9.5px] text-slate-500">
                  <span>ROUND OFF:</span>
                  <span>{receipt.bill.roundOff > 0 ? `+${receipt.bill.roundOff}` : receipt.bill.roundOff}</span>
                </div>
              )}

              <div className="flex justify-between font-extrabold text-[13px] border-t border-slate-400 pt-1.5 mt-1 text-black">
                <span>TOTAL PAID:</span>
                <span>{formatCurrency(receipt.bill.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Method & Status */}
            <div className="text-center my-2 bg-slate-100 p-2 rounded border border-slate-300 text-[10px]">
              <p className="font-extrabold uppercase text-slate-900">
                PAYMENT MODE: {receipt.bill.paymentMethod || "CASH"}
              </p>
              <p className="text-[9px] text-slate-600">PAID & SETTLED · TAX INVOICE</p>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 text-[9px] text-slate-500">
              <p>{receipt.receiptFooterNote || "Thank you for dining with us!"}</p>
              <p className="mt-1 font-bold text-slate-700">POWERED BY TRINETRA RESTAURANT OS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
