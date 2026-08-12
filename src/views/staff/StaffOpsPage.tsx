import { useSearchParams, useParams, useLocation } from "react-router-dom";
import { UtensilsCrossed, Smartphone } from "lucide-react";
import NotificationCenter from "@/components/common/NotificationCenter";
import { useDynamicManifest } from "@/hooks/useDynamicManifest";
import StaffOrdersPanel from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/staff/StaffOrdersPanel";

export default function StaffOpsPage() {
  const { canInstall, isInstalled, installApp } = useDynamicManifest();
  const [searchParams] = useSearchParams();
  const params = useParams<{ restaurantId?: string }>();
  const location = useLocation();

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

  // Extract access token
  const token = searchParams.get("token") || "";

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 font-sans relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

      <header className="border-b border-white/10 bg-[#0d0e12]/90 backdrop-blur-xl px-6 py-4 sticky top-0 z-30 shadow-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-xl shadow-amber-500/20 border border-white/20">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Trinetra Staff Operations</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {role === "kitchen" ? "KDS Station" : "Waiter Board"}
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Realtime Kitchen Queue & Order Dispatch Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canInstall && !isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-sm backdrop-blur cursor-pointer transition-all active:scale-95"
              >
                <Smartphone size={13} className="text-amber-400" />
                Install Staff App
              </button>
            )}
            <NotificationCenter restaurantId={restaurantId} role={role} />
            <span className="text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-sm backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Live Connected
            </span>
          </div>
        </div>
      </header>
      <main className="p-4 md:p-8 max-w-7xl mx-auto relative z-10">
        <StaffOrdersPanel
          restaurantId={restaurantId}
          role={role}
          token={token}
        />
      </main>
    </div>
  );
}
