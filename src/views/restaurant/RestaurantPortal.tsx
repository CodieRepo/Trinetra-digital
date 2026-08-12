"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Lock, Mail, LogOut, Utensils, ChefHat, LayoutDashboard, AlertCircle, Menu, X, ArrowLeft 
} from "lucide-react";
import RestaurantDashboard from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/admin/RestaurantDashboard";

export default function RestaurantPortal() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Tenant / Restaurant States
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<{ id: string; name: string; currency: string; tax_rate?: number; tax_label?: string } | null>(null);
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
      } catch (jsonErr) {
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
      <div className="min-h-screen bg-[#070709] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.2),rgba(0,0,0,0))] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Ambient background light spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md bg-[#0f1015]/80 border border-white/10 rounded-[32px] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl relative overflow-hidden">
          {/* Decorative glow line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
          
          <div className="text-center mb-8 relative">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-600/30 border border-white/10">
              <Utensils className="text-white" size={26} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Trinetra Restaurant OS</h2>
            <p className="text-[11px] text-amber-400 font-bold uppercase mt-1.5 tracking-[0.2em]">Enterprise SaaS Operations</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3.5 bg-rose-950/70 border border-rose-800/60 rounded-2xl text-rose-300 text-xs font-medium backdrop-blur">
                  <AlertCircle size={15} className="shrink-0 text-rose-400" />
                  <p>{authError}</p>
                </div>
                {session && (
                  <a
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    <ArrowLeft size={12} />
                    Return to CRM Admin
                  </a>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@restaurant.com"
                  className="w-full h-12 pl-10 pr-4 text-xs bg-white/5 border border-white/10 rounded-2xl text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-4 text-xs bg-white/5 border border-white/10 rounded-2xl text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/30 transition-all border border-white/10 mt-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              Launch Operations Terminal
            </button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-white/5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trinetra Digital SaaS Cloud · Commercial Grade</span>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER DOCK/PORTAL CONTAINER ─────────────────────────────────────────────
  const sidebar = (
    <>
      {/* Mobile close button */}
      <div className="flex items-center justify-between p-4 lg:hidden border-b border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Navigation</span>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-4 lg:px-0">
        {/* Header Branding */}
        <div className="p-4 lg:p-6 lg:border-b lg:border-white/5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <ChefHat size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-black text-sm text-white uppercase tracking-wider line-clamp-1">{restaurant.name}</h2>
            <div className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest mt-0.5">Commercial OS</div>
          </div>
        </div>

        {/* Navigation Controls info */}
        <nav className="p-3 lg:p-4 space-y-2">
          {[
            { label: "Operations Terminal", active: true, icon: <LayoutDashboard size={15} /> }
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 cursor-default shadow-xs"
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-2xl bg-white/5 border border-white/5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white text-xs uppercase shadow-md shadow-indigo-600/30">
            {(userName || "OU").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{userName || "User"}</p>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">{userRole || "staff"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-10 border border-white/10 hover:border-rose-800/60 bg-white/5 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 rounded-2xl font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all active:scale-[0.98]"
        >
          <LogOut size={13} />
          Exit Operations
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-md lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#0d0e12]/90 backdrop-blur-xl flex-col justify-between shrink-0 select-none">
        {sidebar}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-[#0d0e12] backdrop-blur-xl flex flex-col justify-between shrink-0 select-none shadow-2xl">
          {sidebar}
        </aside>
      )}

      {/* Main Operations Window */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {/* Dynamic header stats bar */}
        <div className="flex justify-between items-center gap-4 mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-2xl p-2.5 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-black text-white tracking-tight truncate flex items-center gap-2">
                <span>Restaurant OS Terminal</span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">PRO</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">Realtime order management, kitchen queue, live table billing & menu controls.</p>
            </div>
          </div>
          <div className="text-[10px] text-slate-300 bg-white/5 border border-white/10 px-3.5 py-2 rounded-2xl font-mono flex items-center gap-2 shadow-sm backdrop-blur shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-bold text-slate-400">TENANT:</span> {(tenantId || "").slice(0, 8)}...
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
        />
      </main>
    </div>
  );
}

