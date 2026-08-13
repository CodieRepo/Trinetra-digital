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
  const [logoUrl, setLogoUrl] = useState("");
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
            setLogoUrl(data.settings.logo_url || "");
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
          logo_url: logoUrl.trim(),
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

      setStatusMessage({ type: "success", text: "Restaurant Identity & Payment Settings saved successfully!" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2 text-amber-400" />
        <span>Loading Payment & Receipt Settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 text-slate-100 font-sans">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <QrCode className="h-6 w-6 text-amber-400" />
            Restaurant Identity & Settings
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Configure White-Label Brand Logo, Business UPI ID, Soundbox QR Code, GSTIN, and 80mm receipt headers.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-2xl border p-4 text-xs font-bold ${
            statusMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* White-Label Logo Section */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <Building2 size={18} className="text-indigo-400" />
            White-Label Restaurant Brand Logo
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Logo Image URL (PNG, JPG, SVG - Max 2MB recommended)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Optional logo displayed on Admin Header, Staff Terminal, and Guest QR Menu. Leave blank for text fallback.
            </p>
          </div>

          {logoUrl && (
            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-indigo-400/20 bg-indigo-400/5 p-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/20 bg-black/50 p-2 flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="Restaurant Brand Logo"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-300">Live Brand Logo Preview</p>
                <p className="text-[11px] text-slate-300">
                  This logo will appear across all tenant-scoped surfaces.
                </p>
              </div>
            </div>
          )}
        </div>
        {/* Custom UPI & QR Section */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <QrCode size={18} className="text-amber-400" />
            Custom Restaurant Business UPI & Payment QR
          </h3>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Business UPI ID / VPA
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. auracafe@upi or 9876543210@ybl"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Customers and waiters scanning UPI will see this VPA.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Custom Soundbox / QR Image URL
              </label>
              <input
                type="text"
                value={upiQrUrl}
                onChange={(e) => setUpiQrUrl(e.target.value)}
                placeholder="https://example.com/qr-code.png"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Upload your GPay / PhonePe / BharatPe Soundbox QR image URL.
              </p>
            </div>
          </div>

          {/* QR Code Preview */}
          {upiQrUrl && (
            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
              <div className="h-20 w-20 overflow-hidden rounded-xl border border-white/20 bg-white p-1">
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
                <p className="text-xs font-bold text-amber-300">Live QR Code Preview</p>
                <p className="text-[11px] text-slate-300">
                  This custom QR image will render live in customer & staff payment drawers.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* GSTIN & Tax Configuration */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <Building2 size={18} className="text-cyan-400" />
            Tax Registration & Invoicing Setup
          </h3>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Business GSTIN Number
              </label>
              <input
                type="text"
                value={businessGstin}
                onChange={(e) => setBusinessGstin(e.target.value)}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white uppercase placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Printed on formal 80mm thermal tax invoices.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
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
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <Percent size={14} className="absolute right-4 top-3.5 text-slate-500" />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Default tax rate calculated at bill settlement (e.g. 5% GST).
              </p>
            </div>
          </div>
        </div>

        {/* Receipt Header / Footer Notes */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
            <Save size={18} className="text-emerald-400" />
            Receipt Thermal Printer Header & Footer Notes
          </h3>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Receipt Top Header Note
              </label>
              <input
                type="text"
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                placeholder="e.g. Welcome to Aura Cafe! Pure Veg Multi-Cuisine"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Receipt Footer Greeting Note
              </label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="e.g. Thank you for dining with us! Visit again soon."
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Saving Settings...
              </>
            ) : (
              <>
                <Save size={16} /> Save Payment & Receipt Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
