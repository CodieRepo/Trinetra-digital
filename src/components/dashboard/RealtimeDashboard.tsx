import React, { useEffect, useState } from "react";
import { Users, CheckCircle, Clock, Zap, TrendingUp, BarChart3, Activity } from "lucide-react";
import { DashboardMetrics } from "../../types/crm";

export const RealtimeDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/v1/analytics");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400" />
            AI Business Operating System Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Multi-channel telemetry, lead intelligence, conversion ratios & system activity feed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            Realtime Platform Sync
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Today's Leads</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.todayLeads || 0}</div>
          <div className="text-[10px] text-slate-500 font-medium">Last 24 hours</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Weekly Leads</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.weeklyLeads || 0}</div>
          <div className="text-[10px] text-slate-500 font-medium">Last 7 days</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Monthly Leads</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.monthlyLeads || 0}</div>
          <div className="text-[10px] text-slate-500 font-medium">Current Month</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{metrics?.conversionRate || 0}%</div>
          <div className="text-[10px] text-emerald-500/80 font-medium">Won / Total Leads</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Pending Tasks</span>
            <CheckCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{metrics?.pendingTasks || 0}</div>
          <div className="text-[10px] text-amber-500/80 font-medium">Action Items Due</div>
        </div>
      </div>

      {/* Stage Breakdown & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stage Distribution */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Pipeline Stage Distribution</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics?.stageDistribution &&
              Object.entries(metrics.stageDistribution).map(([stage, count]) => (
                <div key={stage} className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block capitalize">{stage}</span>
                  <span className="text-lg font-black text-slate-100 font-mono">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Lead Sources Breakdown */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Lead Sources Breakdown</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics?.sourcesBreakdown &&
              Object.entries(metrics.sourcesBreakdown).map(([source, count]) => (
                <div key={source} className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{source}</span>
                  <span className="text-lg font-black text-indigo-400 font-mono">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            System & Customer Activity Feed
          </h2>
          <span className="text-xs text-slate-400 font-mono">Realtime Events Log</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {!metrics?.recentActivities || metrics.recentActivities.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No recent activity recorded.</div>
          ) : (
            metrics.recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{act.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{act.description}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
