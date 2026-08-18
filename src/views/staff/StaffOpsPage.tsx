import { useSearchParams, useParams, useLocation, useNavigate } from "react-router-dom";
import { UtensilsCrossed, Smartphone, LogOut } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import NotificationCenter from "@/components/common/NotificationCenter";
import { useDynamicManifest } from "@/hooks/useDynamicManifest";
import StaffOrdersPanel from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/staff/StaffOrdersPanel";

export default function StaffOpsPage() {
  const { canInstall, isInstalled, installApp } = useDynamicManifest();
  const [searchParams] = useSearchParams();
  const params = useParams<{ restaurantId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const restaurantId = params.restaurantId || searchParams.get("restaurant_id") || "";
  
  // Resolve role from URL path (e.g. /kitchen/xyz or /waiter/xyz) or query param
  const isKitchenPath = location.pathname.startsWith("/kitchen");
  const isWaiterPath = location.pathname.startsWith("/waiter");
  const roleParam = searchParams.get("role");
  
  let role: "kitchen" | "waiter" = "kitchen";
  if (isWaiterPath || roleParam === "waiter") {
    role = "waiter";
  } else if (isKitchenPath || roleParam === "kitchen") {
    role = "kitchen";
  }

  // Manage token with session persistence to survive page refreshes
  const [token, setToken] = useState<string>(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) return urlToken;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("trinetra_staff_token") || "";
    }
    return "";
  });

  const [restaurantName, setRestaurantName] = useState<string>("");

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      sessionStorage.setItem("trinetra_staff_token", urlToken);
      setToken(urlToken);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchRestaurantInfo() {
      if (!token) return;
      try {
        const res = await fetch("/api/client/restaurant/settings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.settings?.name) {
            setRestaurantName(data.settings.name);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    void fetchRestaurantInfo();
  }, [token]);

  const handleSignOut = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("trinetra_staff_token");
    }
    setToken("");
    navigate("/admin");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Top Navigation Bar — Restaurant-First Identity */}
      <header className="border-b border-stone-200/90 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          
          {/* Restaurant Identity & Operational Mode */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-stone-950 text-base shadow-sm shrink-0">
              <UtensilsCrossed size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black text-stone-900 tracking-tight truncate uppercase">
                  {restaurantName || (role === "kitchen" ? "Kitchen Station" : "Waiter Service")}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                  {role === "kitchen" ? "KDS Station" : "Waiter Board"}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium truncate mt-0.5">
                {role === "kitchen" ? "Kitchen Dispatch Queue" : "Dining Floor & Tableside Ordering"}
                <span className="mx-1.5 text-stone-300">•</span>
                <span className="text-[11px] text-stone-400 font-semibold">Powered by Trinetra</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Connection Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {canInstall && !isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="hidden md:inline-flex text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3.5 py-2 rounded-xl items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Smartphone size={14} className="text-amber-600" />
                <span>Install App</span>
              </button>
            )}

            <NotificationCenter restaurantId={restaurantId} role={role} />

            <span className="hidden sm:inline-flex text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected
            </span>

            {token && (
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of staff session"
                className="min-h-[40px] text-xs font-bold text-stone-600 hover:text-rose-700 bg-stone-100 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Operations Canvas */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <StaffOrdersPanel
          restaurantId={restaurantId}
          role={role}
          token={token}
          restaurantName={restaurantName}
        />
      </main>
    </div>
  );
}
