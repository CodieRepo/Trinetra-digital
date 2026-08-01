import OrderStatus from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/public/OrderStatus";

export default function OrderStatusPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              T
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Trinetra Order Tracker
            </span>
          </div>
        </div>
      </header>
      <main className="py-4">
        <OrderStatus tableToken="table-demo-token" orderId="order-demo-id" />
      </main>
    </div>
  );
}
