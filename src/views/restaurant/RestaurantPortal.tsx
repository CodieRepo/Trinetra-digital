"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  LogOut, Utensils, ChefHat, LayoutDashboard, AlertCircle, Menu, X, ArrowLeft, Smartphone 
} from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const resolveRestaurantContext = async (activeSession: any) => {
    try {
      setLoading(true);
      const token = activeSession?.access_token;
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
        setLoading(false);
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
      <div className="flex items-center justify-between p-4 lg:hidden border-b border-slate-200">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation</span>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-4 lg:px-0">
        {/* Header Branding */}
        <div className="p-4 lg:p-5 lg:border-b lg:border-slate-200/90 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs border border-amber-600/30">
            {restaurant.name ? restaurant.name[0].toUpperCase() : <ChefHat size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm text-slate-900 tracking-tight line-clamp-1">{restaurant.name}</h2>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </div>
          </div>
        </div>

        {/* Navigation Controls info */}
        <nav className="p-3 lg:p-4 space-y-1.5">
          {[
            { label: "Operations Cockpit", active: true, icon: <LayoutDashboard size={15} className="text-amber-700" /> }
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-950 border border-amber-500/20 shadow-xs cursor-default"
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-200/90 bg-amber-50/20">
        <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs uppercase">
            {(userName || "OU").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{userName || "Staff User"}</p>
            <p className="text-[10px] font-medium text-slate-500 capitalize">{userRole || "Staff"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-9 border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl font-semibold text-xs cursor-pointer transition-all shadow-xs"
        >
          <LogOut size={13} />
          Sign Out
        </button>
        <div className="text-center mt-3">
          <span className="text-[10px] text-slate-400 font-medium">Powered by Trinetra</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900 flex font-sans">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-slate-200/90 bg-[#FAF9F6] flex-col justify-between shrink-0 select-none">
        {sidebar}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-[#FAF9F6] flex-col justify-between shrink-0 select-none shadow-xl flex">
          {sidebar}
        </aside>
      )}

      {/* Main Operations Window */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
        {/* Persistent Top Restaurant Identity Bar */}
        <div className="flex justify-between items-center gap-4 mb-5 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/30 border border-amber-900/10 rounded-2xl px-5 py-3.5 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-xl p-2 bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black text-slate-900 tracking-tight truncate">
                  {restaurant.name}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">Real-time table orders, kitchen queue & settlement</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {canInstall && !isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <Smartphone size={13} className="text-amber-600" />
                Install App
              </button>
            )}
            <div className="text-[11px] text-slate-500 bg-white border border-slate-200/80 px-2.5 py-1 rounded-md font-medium shadow-xs">
              Powered by Trinetra
            </div>
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
    </div>
  );
}
