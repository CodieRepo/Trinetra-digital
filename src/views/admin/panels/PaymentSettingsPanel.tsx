"use client";

import { useEffect, useState } from "react";
import { QrCode, Save, Building2, Percent, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function PaymentSettingsPanel({
  restaurantId,
  tenantId,
}: {
  restaurantId?: string | null;
  tenantId?: string | null;
}) {
  const [upiId, setUpiId] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [businessGstin, setBusinessGstin] = useState("");
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [taxRate, setTaxRate] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (restaurantId) params.set("restaurant_id", restaurantId);
        if (tenantId) params.set("tenant_id", tenantId);

        const res = await fetch(`/api/client/restaurant/settings?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setUpiId(data.settings.upi_id || "");
            setUpiQrUrl(data.settings.upi_qr_url || "");
            setBusinessGstin(data.settings.business_gstin || "");
            setReceiptHeader(data.settings.receipt_header_note || "");
            setReceiptFooter(data.settings.receipt_footer_note || "");
            setTaxRate(Number(data.settings.tax_rate_percent ?? 5));
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchSettings();
  }, [restaurantId, tenantId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setStatusMessage(null);

      const res = await fetch("/api/client/restaurant/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          tenant_id: tenantId,
          upi_id: upiId.trim(),
          upi_qr_url: upiQrUrl.trim(),
          business_gstin: businessGstin.trim(),
          receipt_header_note: receiptHeader.trim(),
          receipt_footer_note: receiptFooter.trim(),
          tax_rate_percent: Number(taxRate),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save payment settings.");
      }

      setStatusMessage({ type: "success", text: "Custom Payment Settings & QR Code saved successfully!" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin mr-2 text-amber-500" />
        <span className="text-xs font-medium">Loading Payment & Receipt Settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-slate-700" />
            Payment Methods & Receipt Settings
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure custom Business UPI ID, Soundbox QR Code image, GSTIN, and 80mm thermal receipt headers.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs font-semibold ${
            statusMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-rose-600 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Custom UPI & QR Section */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <QrCode size={16} className="text-amber-600" />
            Restaurant Business UPI & Payment QR
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Business UPI ID / VPA
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. auracafe@upi or 9876543210@ybl"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Customers and waiters scanning UPI will see this VPA.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Custom Soundbox / QR Image URL
              </label>
              <input
                type="text"
                value={upiQrUrl}
                onChange={(e) => setUpiQrUrl(e.target.value)}
                placeholder="https://example.com/qr-code.png"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Upload your GPay / PhonePe / BharatPe Soundbox QR image URL.
              </p>
            </div>
          </div>

          {/* QR Code Preview */}
          {upiQrUrl && (
            <div className="mt-4 flex items-center gap-3.5 rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
              <div className="h-16 w-16 overflow-hidden rounded-lg border border-amber-200 bg-white p-1 shrink-0 shadow-xs">
                <img
                  src={upiQrUrl}
                  alt="Custom Payment QR"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">Live QR Code Preview</p>
                <p className="text-[11px] text-amber-700">
                  This custom QR image will render live in customer & staff payment drawers.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* GSTIN & Tax Configuration */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Building2 size={16} className="text-indigo-600" />
            Tax Registration & Invoicing Setup
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Business GSTIN Number
              </label>
              <input
                type="text"
                value={businessGstin}
                onChange={(e) => setBusinessGstin(e.target.value)}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 uppercase placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-xs font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Printed on formal 80mm thermal tax invoices.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Default Tax Rate (% GST)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-xs font-mono"
                />
                <Percent size={14} className="absolute right-3.5 top-3 text-slate-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Default tax rate calculated at bill settlement (e.g. 5% GST).
              </p>
            </div>
          </div>
        </div>

        {/* Receipt Header / Footer Notes */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Save size={16} className="text-emerald-600" />
            Receipt Thermal Printer Header & Footer Notes
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Receipt Top Header Note
              </label>
              <input
                type="text"
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                placeholder="e.g. Welcome to Aura Cafe! Pure Veg Multi-Cuisine"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Receipt Footer Greeting Note
              </label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="e.g. Thank you for dining with us! Visit again soon."
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saving Settings...
              </>
            ) : (
              <>
                <Save size={14} /> Save Payment & Receipt Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
