import { useParams } from "react-router-dom";
import { ChefHat } from "lucide-react";
import OrderStatus from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/public/OrderStatus";

export default function OrderStatusPage() {
  const { tableToken, orderId } = useParams<{ tableToken: string; orderId: string }>();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <ChefHat size={16} />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Trinetra Order Tracker
            </span>
          </div>
        </div>
      </header>
      <main className="py-4">
        <OrderStatus tableToken={tableToken || ""} orderId={orderId || ""} />
      </main>
    </div>
  );
}
