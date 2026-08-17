"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  QrCode,
  Clock,
  MapPin,
  Phone,
  Mail,
  Palette,
  Eye,
  Percent,
  ChefHat,
  Receipt,
  X,
} from "lucide-react";
import { BrandTheme, RestaurantProfile, RestaurantStatus, RestaurantType } from "@/types/restaurant-os/provisioning";

interface RestaurantProfileSettingsProps {
  restaurantId?: string | null;
  tenantId?: string | null;
  initialRestaurantName?: string | null;
  currency?: string;
  onRestaurantUpdated?: (updated: { name?: string; address?: string }) => void;
}

const RESTAURANT_TYPES: Array<{ value: RestaurantType; label: string; desc: string }> = [
  { value: "FineDining", label: "Fine Dining", desc: "Full-service upscale dining experience" },
  { value: "CasualDining", label: "Casual Dining", desc: "Relaxed table-service restaurant" },
  { value: "Cafe", label: "Cafe & Bistro", desc: "Coffee, bakery items, and light meals" },
  { value: "QSR", label: "QSR / Fast Food", desc: "Quick-service counter & takeaway operations" },
  { value: "CloudKitchen", label: "Cloud Kitchen", desc: "Delivery-only food preparation facility" },
  { value: "PubBar", label: "Pub & Bar", desc: "Beverages, bar food, and nightlife dining" },
  { value: "Bakery", label: "Bakery & Desserts", desc: "Pastries, breads, and confectionery" },
];

const CUISINE_OPTIONS = [
  "MultiCuisine",
  "NorthIndian",
  "SouthIndian",
  "ChinesePanAsian",
  "ItalianContinental",
  "MughlaiBiryani",
  "FastFood",
  "CafeBakery",
  "StreetFoodSnacks",
  "CoastalSeafood",
  "HealthySalads",
  "TandooriBarbecue",
];

const BRAND_THEMES: Array<{
  id: BrandTheme;
  name: string;
  palette: string;
  previewBg: string;
  accentClass: string;
  borderClass: string;
  badgeClass: string;
}> = [
  {
    id: "amber",
    name: "Warm Hospitality",
    palette: "Amber & Terracotta",
    previewBg: "bg-amber-500",
    accentClass: "text-amber-600",
    borderClass: "border-amber-500",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
  },
  {
    id: "emerald",
    name: "Fresh & Organic",
    palette: "Emerald & Sage",
    previewBg: "bg-emerald-600",
    accentClass: "text-emerald-600",
    borderClass: "border-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200",
  },
  {
    id: "cobalt",
    name: "Modern Bistro",
    palette: "Cobalt & Indigo",
    previewBg: "bg-indigo-600",
    accentClass: "text-indigo-600",
    borderClass: "border-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-900 border-indigo-200",
  },
  {
    id: "crimson",
    name: "Royal Dining",
    palette: "Crimson & Ruby",
    previewBg: "bg-rose-600",
    accentClass: "text-rose-600",
    borderClass: "border-rose-600",
    badgeClass: "bg-rose-50 text-rose-900 border-rose-200",
  },
];

export default function RestaurantProfileSettings({
  restaurantId,
  tenantId,
  initialRestaurantName,
  currency = "INR",
  onRestaurantUpdated,
}: RestaurantProfileSettingsProps) {
  const [activeSection, setActiveSection] = useState<"profile" | "contact" | "hours" | "payments" | "preview">("profile");

  // Form State
  const [restaurantName, setRestaurantName] = useState(initialRestaurantName || "");
  const [restaurantType, setRestaurantType] = useState<RestaurantType>("CasualDining");
  const [cuisineType, setCuisineType] = useState("MultiCuisine");
  const [brandTheme, setBrandTheme] = useState<BrandTheme>("amber");
  const [logoUrl, setLogoUrl] = useState("");
  const [status, setStatus] = useState<RestaurantStatus>("Operational");

  // Contact State
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [fssaiLicense, setFssaiLicense] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  // Operating Hours State
  const [openingTime, setOpeningTime] = useState("10:00:00");
  const [closingTime, setClosingTime] = useState("23:00:00");
  const [orderPrefix, setOrderPrefix] = useState("ORD-");
  const [billPrefix, setBillPrefix] = useState("BILL-");

  // Payment & Receipt State
  const [upiId, setUpiId] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [taxRate, setTaxRate] = useState<number>(5);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadAllSettings() {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Fetch Profile data from wizard API (canonical restaurantName, type, cuisine, theme, hours)
        const wizardRes = await fetch(`/api/restaurant-os/provisioning/wizard?restaurantId=${encodeURIComponent(restaurantId)}`);
        if (wizardRes.ok) {
          const wizardData = await wizardRes.json();
          if (wizardData.success && wizardData.data) {
            const prof: RestaurantProfile = wizardData.data;
            if (prof.restaurantName) setRestaurantName(prof.restaurantName);
            if (prof.restaurantType) setRestaurantType(prof.restaurantType);
            if (prof.cuisineType) setCuisineType(prof.cuisineType);
            if (prof.brandTheme) setBrandTheme(prof.brandTheme);
            if (prof.logoUrl) setLogoUrl(prof.logoUrl);
            if (prof.status) setStatus(prof.status);
            if (prof.phone) setPhone(prof.phone);
            if (prof.email) setEmail(prof.email);
            if (prof.gstin) setGstin(prof.gstin);
            if (prof.fssaiLicense) setFssaiLicense(prof.fssaiLicense);
            if (prof.timezone) setTimezone(prof.timezone);
            if (prof.openingTime) setOpeningTime(prof.openingTime);
            if (prof.closingTime) setClosingTime(prof.closingTime);
            if (prof.orderPrefix) setOrderPrefix(prof.orderPrefix);
            if (prof.billPrefix) setBillPrefix(prof.billPrefix);
          }
        }

        // 2. Fetch Payment & Basic settings from settings API
        const params = new URLSearchParams();
        params.set("restaurant_id", restaurantId);
        if (tenantId) params.set("tenant_id", tenantId);

        const settingsRes = await fetch(`/api/client/restaurant/settings?${params.toString()}`);
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.settings) {
            if (sData.settings.name && !restaurantName) setRestaurantName(sData.settings.name);
            if (sData.settings.address) setAddress(sData.settings.address);
            if (sData.settings.upi_id) setUpiId(sData.settings.upi_id);
            if (sData.settings.upi_qr_url) setUpiQrUrl(sData.settings.upi_qr_url);
            if (sData.settings.business_gstin && !gstin) setGstin(sData.settings.business_gstin);
            if (sData.settings.receipt_header_note) setReceiptHeader(sData.settings.receipt_header_note);
            if (sData.settings.receipt_footer_note) setReceiptFooter(sData.settings.receipt_footer_note);
            if (sData.settings.tax_rate_percent !== undefined) setTaxRate(Number(sData.settings.tax_rate_percent));
            if (sData.settings.service_charge_percent !== undefined) setServiceCharge(Number(sData.settings.service_charge_percent));
          }
        }
      } catch (err: any) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadAllSettings();
  }, [restaurantId, tenantId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      setSaving(true);
      setStatusMessage(null);

      const trimmedName = restaurantName.trim();
      if (!trimmedName) {
        throw new Error("Restaurant Name cannot be empty.");
      }

      // 1. Update Step 1 (Identity: name, type, cuisine, logo, brandTheme)
      const wizardStep1Res = await fetch("/api/restaurant-os/provisioning/wizard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          stepData: {
            step: 1,
            restaurantIdentity: {
              restaurantName: trimmedName,
              restaurantType,
              cuisineType,
              logoUrl: logoUrl.trim() || null,
              brandTheme,
            },
          },
        }),
      });

      if (!wizardStep1Res.ok) {
        const errJson = await wizardStep1Res.json();
        throw new Error(errJson.error || "Failed to update restaurant identity");
      }

      // 2. Update Step 2 (Business info: phone, email, gstin, fssai, timezone)
      await fetch("/api/restaurant-os/provisioning/wizard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          stepData: {
            step: 2,
            businessInfo: {
              phone: phone.trim() || null,
              email: email.trim() || null,
              gstin: gstin.trim() || null,
              fssaiLicense: fssaiLicense.trim() || null,
              timezone,
            },
          },
        }),
      });

      // 3. Update Step 3 (Operating Config: openingTime, closingTime, orderPrefix, billPrefix)
      await fetch("/api/restaurant-os/provisioning/wizard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          stepData: {
            step: 3,
            operatingConfig: {
              openingTime,
              closingTime,
              orderPrefix: orderPrefix.trim() || "ORD-",
              billPrefix: billPrefix.trim() || "BILL-",
              fiscalStartMonth: 4,
            },
          },
        }),
      });

      // 4. Update Client Restaurant Settings (Address, UPI, QR, GSTIN, Receipt Header/Footer)
      const settingsRes = await fetch("/api/client/restaurant/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          tenant_id: tenantId,
          name: trimmedName,
          address: address.trim(),
          upi_id: upiId.trim(),
          upi_qr_url: upiQrUrl.trim(),
          business_gstin: gstin.trim(),
          receipt_header_note: receiptHeader.trim(),
          receipt_footer_note: receiptFooter.trim(),
          tax_rate_percent: Number(taxRate),
          service_charge_percent: Number(serviceCharge),
        }),
      });

      if (!settingsRes.ok) {
        const errJson = await settingsRes.json();
        console.warn("[Settings Save Warning]:", errJson.error);
      }

      // 5. Notify parent portal & dashboard to update header/shell immediately
      if (onRestaurantUpdated) {
        onRestaurantUpdated({
          name: trimmedName,
          address: address.trim(),
        });
      }

      setStatusMessage({
        type: "success",
        text: `Restaurant profile and settings for "${trimmedName}" updated successfully!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save restaurant settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white p-12 text-center text-slate-500 shadow-xs">
        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-amber-500 mb-2" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Loading Restaurant Profile & Configuration...
        </p>
      </div>
    );
  }

  const activeThemeObj = BRAND_THEMES.find((t) => t.id === brandTheme) || BRAND_THEMES[0];

  return (
    <div className="space-y-6 font-sans">
      {/* Settings Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            Restaurant Profile & Operational Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage canonical restaurant identity, branding theme, contact info, operating hours, taxes, and thermal receipts.
          </p>
        </div>

        {/* Section Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-xs text-xs">
          {[
            { id: "profile" as const, label: "Profile & Identity", icon: <ChefHat size={14} /> },
            { id: "contact" as const, label: "Contact & Location", icon: <MapPin size={14} /> },
            { id: "hours" as const, label: "Hours & Prefixes", icon: <Clock size={14} /> },
            { id: "payments" as const, label: "Payments & Tax", icon: <QrCode size={14} /> },
            { id: "preview" as const, label: "Live Brand Preview", icon: <Eye size={14} /> },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeSection === sec.id
                  ? "bg-white text-amber-950 shadow-xs border border-amber-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {sec.icon}
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success / Error Feedback Toast Banner */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between gap-2.5 rounded-xl border p-3.5 text-xs font-bold shadow-xs ${
            statusMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ══════════════ SECTION 1: PROFILE & IDENTITY ══════════════ */}
        {activeSection === "profile" && (
          <div className="space-y-5">
            {/* Primary Restaurant Name Card */}
            <div className="rounded-xl border border-amber-200/90 bg-gradient-to-b from-[#FFFDF9] to-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-4 border-b border-amber-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <ChefHat size={16} className="text-amber-600" />
                    Canonical Restaurant Name & Identity
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This name defines your primary brand identity and appears across all staff portals, tickets, and customer bills.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Primary Identity
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Restaurant Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g. Sachin Cafe, Spice Garden Fine Dining"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-xs"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Saved directly to the canonical <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono">restaurants.name</code> database record.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Restaurant Concept / Type
                  </label>
                  <select
                    value={restaurantType}
                    onChange={(e) => setRestaurantType(e.target.value as RestaurantType)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none shadow-xs cursor-pointer"
                  >
                    {RESTAURANT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} — {t.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Primary Cuisine Focus
                  </label>
                  <select
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none shadow-xs cursor-pointer"
                  >
                    {CUISINE_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/([A-Z])/g, " $1").trim()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Brand Theme & Logo Card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Palette size={16} className="text-indigo-600" />
                Hospitality Brand Theme & Logo
              </h3>

              <div className="space-y-4">
                {/* Brand Theme Swatches */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Brand Color Theme
                  </label>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    {BRAND_THEMES.map((theme) => {
                      const isSelected = brandTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setBrandTheme(theme.id)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? `${theme.borderClass} bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs`
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-lg ${theme.previewBg} shrink-0 shadow-xs`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{theme.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{theme.palette}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logo URL Input & Preview */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Restaurant Logo Image URL
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
                    />
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Direct public URL to your restaurant logo (PNG, JPG, SVG).
                  </p>

                  {/* Live Logo Preview Box */}
                  {logoUrl && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="h-12 w-12 rounded-lg border border-slate-200 bg-white p-1 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                        <img
                          src={logoUrl}
                          alt="Logo Preview"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Live Logo Preview</p>
                        <p className="text-[10px] text-slate-500">Renders on the top navigation bar and receipts.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Operating Status */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Restaurant Operating Status
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {status}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Operational — accepting live orders & table sessions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ SECTION 2: CONTACT & LOCATION ══════════════ */}
        {activeSection === "contact" && (
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <MapPin size={16} className="text-rose-600" />
              Contact & Location Details
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Physical Restaurant Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shop 12, High Street Food Plaza, Indiranagar, Bengaluru - 560038"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">Printed on formal 80mm thermal tax receipts.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Official Business Email
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@restaurant.com"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  FSSAI Food License Number
                </label>
                <input
                  type="text"
                  value={fssaiLicense}
                  onChange={(e) => setFssaiLicense(e.target.value)}
                  placeholder="e.g. 10019043000001"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Operational Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none shadow-xs cursor-pointer"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST — UTC+5:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST — UTC+4:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT — UTC+8:00)</option>
                  <option value="Europe/London">Europe/London (GMT — UTC+0:00)</option>
                  <option value="America/New_York">America/New_York (EST — UTC-5:00)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ SECTION 3: OPERATING HOURS & PREFIXES ══════════════ */}
        {activeSection === "hours" && (
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Clock size={16} className="text-amber-600" />
              Daily Operating Schedule & Ticket Prefixes
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Daily Opening Time
                </label>
                <input
                  type="time"
                  step="1"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-amber-500 focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Daily Closing Time
                </label>
                <input
                  type="time"
                  step="1"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-amber-500 focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Order Ticket Prefix
                </label>
                <input
                  type="text"
                  value={orderPrefix}
                  onChange={(e) => setOrderPrefix(e.target.value)}
                  placeholder="e.g. ORD-"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 uppercase font-mono placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Bill Invoice Prefix
                </label>
                <input
                  type="text"
                  value={billPrefix}
                  onChange={(e) => setBillPrefix(e.target.value)}
                  placeholder="e.g. BILL- / INV-"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 uppercase font-mono placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ SECTION 4: PAYMENTS, TAXES & RECEIPT ══════════════ */}
        {activeSection === "payments" && (
          <div className="space-y-5">
            {/* Custom UPI & Soundbox QR */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <QrCode size={16} className="text-amber-600" />
                Restaurant Business UPI & Soundbox QR Code
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Business UPI VPA / ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. auracafe@upi or 9876543210@ybl"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs font-mono"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Customers & staff scanning payment QR will see this UPI ID.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Custom Soundbox QR Image URL
                  </label>
                  <input
                    type="url"
                    value={upiQrUrl}
                    onChange={(e) => setUpiQrUrl(e.target.value)}
                    placeholder="https://example.com/soundbox-qr.png"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none shadow-xs"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Upload your PhonePe / GPay / Paytm Soundbox QR image URL.
                  </p>
                </div>
              </div>

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
                      This custom QR image will render in customer checkout & cashier payment drawers.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* GSTIN & Tax Configuration */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Percent size={16} className="text-indigo-600" />
                GST Registration & Tax Invoicing
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Business GSTIN
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 uppercase font-mono placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Default Tax Rate (% GST)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="28"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-indigo-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Service Charge (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="15"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-indigo-500 focus:outline-none shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Thermal Receipt Notes */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Receipt size={16} className="text-emerald-600" />
                80mm Thermal Receipt Header & Footer Notes
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Receipt Top Header Note
                  </label>
                  <input
                    type="text"
                    value={receiptHeader}
                    onChange={(e) => setReceiptHeader(e.target.value)}
                    placeholder="e.g. Welcome to Sachin Cafe! Pure Veg Multi-Cuisine"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Receipt Footer Greeting Note
                  </label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="e.g. Thank you for dining with us! Visit again soon."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ SECTION 5: LIVE IDENTITY & RECEIPT PREVIEW ══════════════ */}
        {activeSection === "preview" && (
          <div className="grid gap-5 md:grid-cols-2">
            {/* Live Header & Shell Preview */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Eye size={16} className="text-amber-600" />
                Restaurant OS Terminal Header Preview
              </h3>
              <p className="text-xs text-slate-500">
                This is how the application header and staff terminal render with your canonical settings:
              </p>

              <div className="rounded-2xl border border-amber-900/10 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/30 p-4 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <div className="h-10 w-10 rounded-xl border border-slate-200 bg-white p-1 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className={`h-10 w-10 rounded-xl ${activeThemeObj.previewBg} text-white flex items-center justify-center font-black text-base shadow-xs`}>
                        {restaurantName ? restaurantName[0].toUpperCase() : "R"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900">{restaurantName || "Your Restaurant Name"}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Live
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {cuisineType.replace(/([A-Z])/g, " $1").trim()} · {restaurantType}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs">
                    Powered by Trinetra
                  </span>
                </div>
              </div>
            </div>

            {/* 80mm Thermal Receipt Header Preview */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Receipt size={16} className="text-emerald-600" />
                80mm Thermal Tax Receipt Preview
              </h3>
              <p className="text-xs text-slate-500">
                Printed output rendered on the ESC/POS thermal printer:
              </p>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 font-mono text-center text-slate-800 text-xs max-w-sm mx-auto shadow-xs">
                <p className="font-black text-sm uppercase text-slate-900 tracking-wider">
                  {restaurantName || "RESTAURANT NAME"}
                </p>
                {address && <p className="text-[10px] text-slate-600 mt-0.5">{address}</p>}
                {phone && <p className="text-[10px] text-slate-600">TEL: {phone}</p>}
                {gstin && <p className="text-[10px] text-slate-600">GSTIN: {gstin}</p>}
                {receiptHeader && (
                  <p className="text-[10px] italic text-slate-600 my-1 border-t border-b border-dashed border-slate-300 py-1">
                    "{receiptHeader}"
                  </p>
                )}
                <div className="my-2 border-t border-b border-slate-300 py-1 text-[10px] flex justify-between text-slate-500">
                  <span>TABLE: T-04</span>
                  <span>{billPrefix}0042</span>
                </div>
                <div className="text-[10px] space-y-1 text-left">
                  <div className="flex justify-between">
                    <span>1x Special Thali</span>
                    <span>{currency === "INR" ? "₹" : `${currency} `}280.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                    <span>GST ({taxRate}%):</span>
                    <span>{currency === "INR" ? "₹" : `${currency} `}{(280 * (taxRate / 100)).toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 mt-2 text-[10px] text-slate-500">
                  <p>{receiptFooter || "Thank you for dining with us!"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Sticky / Floating Save Changes Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/90">
          <div className="text-xs text-slate-500">
            {restaurantName ? (
              <span>Configuring identity for: <strong className="text-slate-900">{restaurantName}</strong></span>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-6 py-3 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save size={14} /> Save Profile & Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
