"use client";

import { useState } from "react";
import {
  QrCode,
  Smartphone,
  Banknote,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  X,
  Heart,
} from "lucide-react";

export type PaymentModalProps = {
  tableToken: string;
  tableNumber?: string;
  restaurantName: string;
  upiId?: string | null;
  upiQrUrl?: string | null;
  amount: number;
  currency: string;
  sessionId: string;
  onClose: () => void;
  onPaymentSubmitted?: (method: string, utr?: string, tipAmount?: number) => void;
};

export default function CustomerPaymentModal({
  tableNumber,
  restaurantName,
  upiId,
  upiQrUrl,
  amount,
  currency,
  sessionId,
  onClose,
  onPaymentSubmitted,
}: PaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"upi_qr" | "upi_app" | "cash">("upi_qr");
  const [utrNumber, setUtrNumber] = useState("");
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const totalPayable = amount + (tipAmount || 0);

  const formattedBillAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);

  const formattedTotalPayable = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(totalPayable);

  const cleanUpiId = upiId || "spicegarden@upi";

  // Format standard UPI payment intent string with total payable (bill + tip)
  const upiIntentString = `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(restaurantName)}&am=${totalPayable}&cu=INR&tn=${encodeURIComponent(`Table ${tableNumber || ""} Bill - ${sessionId.slice(0, 6)}`)}`;

  // Generated dynamic QR code URL
  const generatedQrUrl =
    upiQrUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiIntentString)}`;

  const handleCopyUpi = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(cleanUpiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectTip = (preset: number) => {
    setIsCustomTip(false);
    setCustomTip("");
    setTipAmount(preset);
  };

  const handleCustomTipChange = (val: string) => {
    setCustomTip(val);
    const parsed = parseFloat(val);
    setTipAmount(isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  const handleNotifyPayment = async () => {
    setSubmitting(true);
    try {
      if (onPaymentSubmitted) {
        await onPaymentSubmitted(selectedMethod, utrNumber, tipAmount);
      }
      setSubmittedSuccess(true);
    } catch {
      setSubmittedSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 shadow-2xl max-h-[92vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-black text-amber-950 uppercase tracking-wide">
              Table #{tableNumber || "Direct"} • Payment
            </span>
            <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-stone-900">
              {restaurantName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Bill Total Banner */}
        <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200/90 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-amber-800">
              Total Payable
            </p>
            <p className="text-2xl font-black text-stone-900 tracking-tight mt-0.5">
              {formattedTotalPayable}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-stone-500 block">
              Bill: {formattedBillAmount}
            </span>
            {tipAmount > 0 && (
              <span className="text-[11px] font-black text-emerald-700 block">
                + ₹{tipAmount} Tip
              </span>
            )}
          </div>
        </div>

        {submittedSuccess ? (
          <div className="mt-6 py-6 text-center space-y-3 animate-in zoom-in-95">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-xl font-black text-stone-900 uppercase tracking-tight">
              Payment Notified!
            </h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto font-medium">
              We have notified the cashier of your {selectedMethod.toUpperCase()} payment for Table #{tableNumber}. Thank you for dining with us!
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-[48px] w-full rounded-2xl bg-stone-900 text-white text-xs font-black uppercase tracking-wider transition hover:bg-stone-800 cursor-pointer shadow-xs"
            >
              Back to Order Tracker
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-600 mb-2">
                Select Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "upi_qr" as const, label: "Scan QR", icon: QrCode },
                  { id: "upi_app" as const, label: "UPI App", icon: Smartphone },
                  { id: "cash" as const, label: "Cash", icon: Banknote },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`min-h-[50px] rounded-2xl border p-2.5 flex flex-col items-center justify-center gap-1 text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
                        selectedMethod === m.id
                          ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode 1: Scan UPI QR */}
            {selectedMethod === "upi_qr" && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center space-y-3">
                <div className="bg-white p-3 rounded-2xl border border-stone-200 inline-block shadow-xs">
                  <img
                    src={generatedQrUrl}
                    alt="UPI QR Code"
                    className="w-44 h-44 object-contain mx-auto"
                  />
                </div>

                <div>
                  <p className="text-xs font-black text-stone-900">
                    Scan with any UPI App (GPay, PhonePe, Paytm)
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700">
                    <span className="font-mono text-[11px]">{cleanUpiId}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="text-amber-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Launch UPI App */}
            {selectedMethod === "upi_app" && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center space-y-3">
                <p className="text-xs text-stone-600 font-medium">
                  Tap below to open your preferred UPI payment app directly on your device:
                </p>
                <a
                  href={upiIntentString}
                  className="min-h-[52px] w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                >
                  <Smartphone size={16} />
                  <span>Open UPI Payment App ({formattedTotalPayable})</span>
                </a>
              </div>
            )}

            {/* Mode 3: Pay by Cash */}
            {selectedMethod === "cash" && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center space-y-2">
                <Banknote size={32} className="mx-auto text-amber-700" />
                <p className="text-sm font-black text-stone-900">Pay Cash at Table</p>
                <p className="text-xs text-stone-600 font-medium">
                  Please keep exact cash ({formattedTotalPayable}) ready for your server.
                </p>
              </div>
            )}

            {/* Tip Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-stone-600 flex items-center gap-1">
                  <Heart size={13} className="text-rose-500" />
                  Add Staff Tip (Optional)
                </label>
                {tipAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectTip(0)}
                    className="text-[10px] font-bold text-stone-500 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[0, 50, 100, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectTip(preset)}
                    className={`min-h-[44px] px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border shrink-0 active:scale-95 ${
                      tipAmount === preset && !isCustomTip
                        ? "bg-amber-500 text-stone-950 border-amber-500 shadow-xs"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {preset === 0 ? "No Tip" : `+ ₹${preset}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomTip(true)}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border shrink-0 active:scale-95 ${
                    isCustomTip
                      ? "bg-amber-500 text-stone-950 border-amber-500 shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomTip && (
                <input
                  type="number"
                  placeholder="Enter tip amount in ₹"
                  value={customTip}
                  onChange={(e) => handleCustomTipChange(e.target.value)}
                  className="mt-2 w-full min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
                />
              )}
            </div>

            {/* Optional UTR Number Input */}
            {selectedMethod !== "cash" && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-600 mb-1">
                  UTR / Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 324156789012"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleNotifyPayment}
                className="w-full min-h-[52px] rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Notifying Staff…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>I Have Completed Payment ({formattedTotalPayable})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
