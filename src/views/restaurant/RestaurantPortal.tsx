"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  LogOut, Utensils, ChefHat, LayoutDashboard, AlertCircle, Menu, X, ArrowLeft, Smartphone, Sparkles 
} from "lucide-react";
import { RestroAiAssistantDrawer } from "@/components/restaurant-os/RestroAiAssistantDrawer";
import { useDynamicManifest } from "@/hooks/useDynamicManifest";
import RestaurantDashboard from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/admin/RestaurantDashboard";

export default function RestaurantPortal() {
  const { canInstall, isInstalled, installApp } = useDynamicManifest();
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Tenant / Restaurant States
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<{ id: string; name: string; currency: string; tax_rate?: number; tax_label?: string; address?: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [planTier, setPlanTier] = useState<string>("pro");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOpsOpen, setAiOpsOpen] = useState(false);

  const resolveRestaurantContext = async (activeSession: any) => {
    try {
      setLoading(true);
      let token = activeSession?.access_token;
      if (!token && typeof window !== "undefined") {
        token = new URLSearchParams(window.location.search).get("token");
      }
      if (!token) {
        setLoading(false);
        return;
      }

      // Read query params if opening from CRM Admin
      let queryTenantId: string | null = null;
      let queryRestaurantId: string | null = null;
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);
        queryTenantId = searchParams.get("tenant_id");
        queryRestaurantId = searchParams.get("restaurant_id");
      }

      let contextUrl = "/api/client/restaurant/context";
      const params = new URLSearchParams();
      if (queryTenantId) params.set("tenant_id", queryTenantId);
      if (queryRestaurantId) params.set("restaurant_id", queryRestaurantId);
      if (params.toString()) {
        contextUrl += `?${params.toString()}`;
      }

      const res = await fetch(contextUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid response format from server.");
      }

      if (!res.ok || !data?.success) {
        setAuthError(data?.error || "Failed to resolve Restaurant Organization.");
        setLoading(false);
        return;
      }

      setUserName(data.name || activeSession.user?.email || "Staff User");
      setTenantId(data.tenant_id || queryTenantId || null);
      setUserRole(data.role || "admin");
      setRestaurant(data.restaurant || null);
      setPlanTier(data.plan || "pro");
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err?.message || "Failed to load restaurant profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Get current session safely
    supabase.auth.getSession().then((res) => {
      if (!mounted) return;
      const currentSession = res?.data?.session || null;
      setSession(currentSession);
      if (currentSession) {
        resolveRestaurantContext(currentSession);
      } else {
        const urlToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;
        if (urlToken) {
          const tokenSession = { access_token: urlToken, user: { email: "authenticated-session" } };
          setSession(tokenSession);
          resolveRestaurantContext(tokenSession);
        } else {
          setLoading(false);
        }
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // 2. Listen for auth changes safely
    const authSub = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      if (currentSession) {
        resolveRestaurantContext(currentSession);
      } else {
        setTenantId(null);
        setRestaurant(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authSub?.data?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        setAuthError(error.message);
        setLoading(false);
      }
    } catch (err: any) {
      setAuthError(err?.message || "Login failed");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-slate-400 font-sans">
        <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold tracking-widest uppercase">Resolving Restaurant SaaS context...</p>
      </div>
    );
  }

  // ── RENDER LOGIN SCREEN ──────────────────────────────────────────────────────
  if (!session || !restaurant || !tenantId) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4 font-sans relative">
        <div className="w-full max-w-md bg-[#FFFDFB] border border-amber-900/10 rounded-2xl p-8 shadow-sm relative">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs text-white border border-amber-600/30">
              <Utensils size={22} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Restaurant Operations Portal</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Sign in to access your restaurant terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  <AlertCircle size={15} className="shrink-0 text-rose-500" />
                  <p>{authError}</p>
                </div>
                {session && (
                  <a
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-semibold"
                  >
                    <ArrowLeft size={12} />
                    Return to CRM Admin
                  </a>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Staff Email / Access Identifier
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@restaurant.com"
                className="w-full h-11 px-3.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Security Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400 shadow-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                "Authorize & Open Terminal"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── RENDER DOCK/PORTAL CONTAINER ─────────────────────────────────────────────
  const sidebar = (
    <>
      {/* Mobile close button */}
      <div className="flex items-center justify-between p-4 lg:hidden border-b border-[#3E2233]">
        <span className="text-xs font-bold uppercase tracking-wider text-[#C8B2BC]">Navigation</span>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-[#C8B2BC] hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-4 lg:px-0">
        {/* Header Branding */}
        <div className="p-4 lg:p-5 lg:border-b lg:border-[#3E2233]/90 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#B85D19] text-[#FAF2EE] flex items-center justify-center font-black text-base shrink-0 shadow-sm">
            {restaurant.name ? restaurant.name[0].toUpperCase() : <ChefHat size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-white tracking-tight line-clamp-1 capitalize">{restaurant.name}</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#5EEAD4] font-semibold mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5EEAD4] animate-pulse" />
              Live Operations
            </div>
          </div>
        </div>

        {/* Navigation Controls info */}
        <nav className="p-3 lg:p-4 space-y-1.5">
          {[
            { label: "Operations Cockpit", active: true, icon: <LayoutDashboard size={15} className="text-amber-400" /> }
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 text-white border border-white/10 shadow-xs cursor-default"
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-[#3E2233]/90 bg-[#1D0F18]/70">
        <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-[#361C2C] border border-[#3E2233]">
          <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs uppercase">
            {(userName || "OU").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName || "Staff User"}</p>
            <p className="text-[11px] font-medium text-[#C8B2BC] capitalize">{userRole || "Staff"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-9 border border-[#3E2233] hover:border-rose-500/40 bg-[#361C2C] hover:bg-rose-500/10 text-zinc-300 hover:text-rose-300 rounded-xl font-semibold text-xs cursor-pointer transition-all"
        >
          <LogOut size={13} />
          Sign Out
        </button>
        <div className="text-center mt-3">
          <span className="text-[11px] text-[#B297A3] font-medium">Trinetra Restaurant OS</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#FAF2EE] text-[#2A1622] flex font-sans">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-stone-950/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-[#3E2233] bg-[#2A1622] text-[#FAF2EE] flex-col justify-between shrink-0 select-none">
        {sidebar}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 w-72 border-r border-[#3E2233] bg-[#2A1622] text-[#FAF2EE] flex-col justify-between shrink-0 select-none shadow-2xl flex">
          {sidebar}
        </aside>
      )}

      {/* Main Operations Window */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
        {/* Persistent Top Restaurant Identity Bar */}
        <div className="mx-auto max-w-7xl flex flex-wrap justify-between items-center gap-4 mb-5 bg-[#FFFBF9]/95 backdrop-blur-md border border-[#E8D8D2] rounded-2xl px-5 py-3.5 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-xl p-2 bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg md:text-2xl font-serif font-normal text-[#2A1622] tracking-tight truncate capitalize">
                  {restaurant.name}
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#0F6E6E]/10 text-[#0F6E6E] border border-[#0F6E6E]/25 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E6E] animate-pulse" />
                  Live
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  planTier === "enterprise"
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : planTier === "starter"
                    ? "bg-stone-100 text-stone-700 border-stone-200"
                    : "bg-indigo-50 text-indigo-800 border-indigo-200"
                }`}>
                  {planTier === "enterprise" ? "Enterprise" : planTier === "starter" ? "Starter" : "Pro Plan"}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate mt-0.5">Real-time table orders, kitchen queue &amp; settlement</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {["owner", "admin", "manager"].includes((userRole || "").toLowerCase()) && (
              <button
                type="button"
                onClick={() => setAiOpsOpen(true)}
                className="text-xs font-bold text-[#FAF2EE] bg-[#B85D19] hover:bg-[#9E4E14] border border-[#B85D19] px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Sparkles size={13} className="text-amber-400" />
                AI Ops
              </button>
            )}
            {canInstall && !isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="text-xs font-semibold text-stone-700 bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Smartphone size={13} className="text-amber-600" />
                Install App
              </button>
            )}
          </div>
        </div>

        <RestaurantDashboard
          tenantId={tenantId}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          currency={restaurant.currency || "INR"}
          userRole={userRole || "waiter"}
          taxRate={restaurant.tax_rate ?? 5.0}
          taxLabel={restaurant.tax_label ?? "GST"}
          onRestaurantUpdated={(updated) => {
            setRestaurant((prev) =>
              prev
                ? {
                    ...prev,
                    name: updated.name || prev.name,
                    address: updated.address !== undefined ? updated.address : prev.address,
                  }
                : null
            );
          }}
        />
      </main>
      <RestroAiAssistantDrawer
        open={aiOpsOpen}
        onClose={() => setAiOpsOpen(false)}
        accessToken={session?.access_token || null}
        restaurantId={restaurant.id}
        tenantId={tenantId}
        restaurantName={restaurant.name}
      />
    </div>
  );
}
