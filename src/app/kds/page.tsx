'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  MonitorPlay,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Flame,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/modules/core/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/modules/core/components/ui/card';
import { Button } from '@/modules/core/components/ui/button';
import { Badge } from '@/modules/core/components/ui/badge';
import { toast } from '@/modules/core/components/ui/toaster';
import { ThemeToggle } from '@/modules/core/components/theme-toggle';

const STATIONS = [
  { key: 'ALL', label: 'All Kitchen Stations' },
  { key: 'STARTERS', label: 'Starter / Appetizer Station' },
  { key: 'MAINS', label: 'Grill & Main Station' },
  { key: 'DESSERTS', label: 'Pastry & Dessert Station' },
  { key: 'BEVERAGES', label: 'Bar & Beverage Station' }
];

export default function KitchenDisplayPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedStation, setSelectedStation] = React.useState('ALL');
  const [kdsOrders, setKdsOrders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [now, setNow] = React.useState(Date.now());

  // Realtime preparation timer tick every second
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchKdsTickets = React.useCallback(async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/v1/kds?branchId=${user.branchId}&station=${selectedStation}`);
      const data = await res.json();
      if (data.success) setKdsOrders(data.data);
    } catch (err: any) {
      toast(`KDS fetch failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId, selectedStation]);

  React.useEffect(() => {
    fetchKdsTickets();
    const interval = setInterval(fetchKdsTickets, 5000); // 5s polling fallback for realtime kitchen sync
    return () => clearInterval(interval);
  }, [fetchKdsTickets]);

  const handleBumpTicket = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PLACED' ? 'PREPARING' : 'READY_TO_SERVE';
    // Optimistic bump
    setKdsOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    try {
      const res = await fetch(`/api/v1/kds/${orderId}/bump`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: nextStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (nextStatus === 'READY_TO_SERVE') {
        toast(`ORDER #${data.data.orderNumber} IS READY TO SERVE! 🔔`, 'success');
      } else {
        toast(`Ticket #${data.data.orderNumber} set to PREPARING 🔥`, 'info');
      }
      fetchKdsTickets();
    } catch (err: any) {
      fetchKdsTickets(); // Revert on error
      toast(`Bump failed: ${err.message}`, 'error');
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* KDS Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} title="Back to Dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold">
              <MonitorPlay className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-foreground">KDS Kitchen Display — {user.branchName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchKdsTickets} className="h-8 text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Queue</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* KDS Station Routing Navigation Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card overflow-x-auto shrink-0">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {STATIONS.map(st => (
          <button
            key={st.key}
            onClick={() => setSelectedStation(st.key)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStation === st.key
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-accent'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* KDS Ticket Cards Display Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading active kitchen queue...</div>
        ) : kdsOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h3 className="font-bold text-base text-foreground">Kitchen Queue Cleared!</h3>
            <p className="text-xs text-muted-foreground max-w-sm">All ticket items have been bumped and served. Ready for new dine-in orders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {kdsOrders.map(order => {
              const elapsedMs = now - new Date(order.createdAt).getTime();
              const elapsedMins = Math.floor(elapsedMs / 60000);
              const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);

              const isUrgent = elapsedMins >= 10;
              const isWarning = elapsedMins >= 5 && elapsedMins < 10;
              const isPreparing = order.status === 'PREPARING';

              return (
                <Card
                  key={order.id}
                  className={`flex flex-col justify-between overflow-hidden border-2 transition-all shadow-md ${
                    isUrgent
                      ? 'border-rose-500 bg-rose-500/5'
                      : isWarning
                        ? 'border-amber-500 bg-amber-500/5'
                        : isPreparing
                          ? 'border-blue-500 bg-blue-500/5'
                          : 'border-border bg-card'
                  }`}
                >
                  <CardHeader className="p-3 pb-2 border-b border-border bg-muted/40 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-extrabold flex items-center gap-1.5">
                        <span>#{order.orderNumber}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {order.table ? order.table.label : order.orderType}
                        </Badge>
                      </CardTitle>
                    </div>

                    {/* Countup Timer Badge */}
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-bold ${
                        isUrgent
                          ? 'bg-rose-600 text-white animate-pulse'
                          : isWarning
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{elapsedMins}m {elapsedSecs}s</span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3 flex-1 space-y-2">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-start justify-between text-xs py-1 border-b border-border/40 last:border-0">
                        <div className="font-semibold text-foreground pr-2">
                          <span className="font-bold text-amber-500 mr-1.5">{item.quantity}x</span>
                          <span>{item.menuItem.name}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>

                  {/* KDS Bump Button */}
                  <div className="p-3 border-t border-border bg-muted/20">
                    <Button
                      onClick={() => handleBumpTicket(order.id, order.status)}
                      className={`w-full gap-2 text-xs font-bold ${
                        isPreparing
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      }`}
                    >
                      <Flame className="h-4 w-4" />
                      <span>{isPreparing ? 'Mark Ticket READY TO SERVE 🔔' : 'Start PREPARING 🔥'}</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
