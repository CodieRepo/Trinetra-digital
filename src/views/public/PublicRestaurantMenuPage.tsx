import { useParams } from "react-router-dom";
import PublicMenu from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/public/PublicMenu";

export default function PublicRestaurantMenuPage() {
  const { tableToken } = useParams<{ tableToken: string }>();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              T
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Trinetra Digital Menu
            </span>
          </div>
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded-full">
            Live Order
          </span>
        </div>
      </header>
      <main className="py-4">
        <PublicMenu tableToken={tableToken || ""} />
      </main>
    </div>
  );
}
