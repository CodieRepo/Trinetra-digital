import { useSearchParams } from "react-router-dom";
import StaffOrdersPanel from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/staff/StaffOrdersPanel";

export default function StaffOpsPage() {
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get("restaurant_id") || "default-restaurant-uuid";
  const roleParam = searchParams.get("role");
  const role: "kitchen" | "waiter" = roleParam === "waiter" ? "waiter" : "kitchen";
  const token = searchParams.get("token") || "";
  void token;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white text-sm">
              T
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white">Trinetra Staff Operations</h1>
              <p className="text-xs text-slate-400">Kitchen KDS & Waiter Dispatch Panel</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full">
            Realtime Active
          </span>
        </div>
      </header>
      <main className="p-6">
        <StaffOrdersPanel
          restaurantId={restaurantId}
          role={role}
        />
      </main>
    </div>
  );
}
