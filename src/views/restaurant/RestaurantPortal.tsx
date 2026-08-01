"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Lock, Mail, LogOut, Utensils, ChefHat, LayoutDashboard, AlertCircle, Menu, X 
} from "lucide-react";
import RestaurantDashboard from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/admin/RestaurantDashboard";

export default function RestaurantPortal() {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Tenant / Restaurant States
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<{ id: string; name: string; currency: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // 1. Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        resolveRestaurantContext(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        resolveRestaurantContext(session.user);
      } else {
        setTenantId(null);
        setRestaurant(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resolveRestaurantContext = async (user: any) => {
    try {
      setLoading(true);
      setUserName(user.user_metadata?.name || user.email);

      // Find user role and tenant
      const { data: roleData, error: roleError } = await supabase
        .from("users_roles")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError || !roleData) {
        // Fallback check legacy profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setTenantId(profile.tenant_id);
          setUserRole("owner"); // Default owner role for client_admin
          await fetchRestaurant(profile.tenant_id);
        } else {
          setAuthError("Account is not mapped to any Restaurant Organization.");
          supabase.auth.signOut();
        }
        return;
      }

      setTenantId(roleData.tenant_id);
      setUserRole(roleData.role);
      await fetchRestaurant(roleData.tenant_id);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurant = async (tid: string) => {
    const { data: rest, error } = await supabase
      .from("restaurants")
      .select("id, name, currency")
      .eq("tenant_id", tid)
      .maybeSingle();

    if (error || !rest) {
      setAuthError("No active Restaurant Profile found for your Organization.");
      supabase.auth.signOut();
    } else {
      setRestaurant(rest);
    }
  };

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
      setAuthError(err.message);
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
      <div className="min-h-screen bg-[#09090b] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 blur-2xl rounded-full" />
          
          <div className="text-center mb-8 relative">
            <div className="w-12 h-12 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-600/20">
              <Utensils className="text-white" size={22} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Restaurant OS Portal</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">SaaS Cloud Operations</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 p-3.5 bg-rose-950/60 border border-rose-800/40 rounded-xl text-rose-300 text-xs font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <p>{authError}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  className="w-full h-11 pl-10 pr-3 text-xs bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500 placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3 text-xs bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500 placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-violet-600/20 transition-all border-0 mt-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              Sign In to Operations
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-[10px] text-slate-600 font-medium">Trinetra SaaS Systems · Powered by Cloud OS</span>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER DOCK/PORTAL CONTAINER ─────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebar = (
    <>
      {/* Mobile close button */}
      <div className="flex items-center justify-between p-4 lg:hidden">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Menu</span>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-4 lg:px-0">
        {/* Header Branding */}
        <div className="p-2 lg:p-6 lg:border-b lg:border-white/5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <ChefHat size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-black text-xs text-white uppercase tracking-wider line-clamp-1">{restaurant.name}</h2>
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Ops Dashboard</div>
          </div>
        </div>

        {/* Navigation Controls info */}
        <nav className="p-2 lg:p-4 space-y-1.5">
          {[
            { label: "SaaS Terminal", active: true, icon: <LayoutDashboard size={14} /> }
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-violet-600/10 text-violet-400 border border-violet-500/10 cursor-default"
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs uppercase shadow-md shadow-violet-600/20">
            {userName.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{userName}</p>
            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mt-0.5">{userRole || "staff"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-9 border border-white/10 hover:border-rose-900 bg-transparent hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-xl font-bold text-[10px] uppercase cursor-pointer transition-all active:scale-[0.98]"
        >
          <LogOut size={12} />
          Exit Operations
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#070708] text-slate-100 flex font-sans">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#09090b]/80 backdrop-blur-md flex-col justify-between shrink-0 select-none">
        {sidebar}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 w-72 border-r border-white/5 bg-[#09090b] backdrop-blur-md flex flex-col justify-between shrink-0 select-none">
          {sidebar}
        </aside>
      )}
      {/* Main Operations Window */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {/* Dynamic header stats bar */}
        <div className="flex justify-between items-center gap-3 mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-black text-white truncate">Vertical POS Terminal</h1>
              <p className="text-xs text-slate-500 font-medium truncate">Manage tables, orders, kitchen queue, staff and menus.</p>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-mono flex items-center gap-2 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ORGANIZATION TENANT: {tenantId.slice(0, 8)}...
          </div>
        </div>

        <RestaurantDashboard
          tenantId={tenantId}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          currency={restaurant.currency}
          userRole={userRole || "waiter"}
        />
      </main>
    </div>
  );
}

