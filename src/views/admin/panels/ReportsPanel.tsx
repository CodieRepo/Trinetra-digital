import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Users, DollarSign, Award,
  ArrowUp, ArrowDown, Minus,
  Zap, Target
} from "lucide-react";
import type { Lead, AnalyticsData } from "@/services/api";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReportsPanelProps {
  leads: Lead[];
  analytics: AnalyticsData | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// ── Mini Bar Chart ────────────────────────────────────────────────────────────

function MiniBarChart({ data, color = "#6366f1" }: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex items-end h-16">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                className="w-full rounded-t-sm min-h-[2px]"
                style={{ backgroundColor: color }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {d.value}
              </div>
            </div>
            <span className="text-[8px] text-slate-400 font-medium truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({ segments }: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const size = 120;
  const r = 42;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14} />
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const dash = pct * circ;
            const gap = circ - dash;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={14}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-black text-slate-800 leading-none">{total}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Total</p>
          </div>
        </div>
      </div>
      <div className="space-y-2 flex-1">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[10px] text-slate-600 font-medium">{seg.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-700">{seg.value}</span>
              <span className="text-[9px] text-slate-400">{Math.round((seg.value / total) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, trend, color
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  trend?: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
            trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-600" : "text-slate-400"
          }`}>
            {trend > 0 ? <ArrowUp size={9} /> : trend < 0 ? <ArrowDown size={9} /> : <Minus size={9} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900 leading-none font-mono">{value}</p>
      <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReportsPanel({ leads }: ReportsPanelProps) {
  const kpis = useMemo(() => {
    const total = leads.length;
    const won = leads.filter(l => l.status === "won").length;
    const hot = leads.filter(l => l.intent_level === "HOT").length;
    const convRate = total > 0 ? Math.round((won / total) * 100) : 0;
    const pipeline = leads
      .filter(l => !["won", "lost"].includes(l.status))
      .reduce((s, l) => s + (l.deal_setup_value || 0) + (l.deal_mrr || 0) * 12, 0);
    const wonRevenue = leads
      .filter(l => l.status === "won")
      .reduce((s, l) => s + (l.deal_setup_value || 0) + (l.deal_mrr || 0) * 12, 0);
    return { total, won, hot, convRate, pipeline, wonRevenue };
  }, [leads]);

  // Last 7 days leads by day
  const last7Days = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        date: d.toISOString().split("T")[0],
        value: 0,
      };
    });
    leads.forEach(l => {
      const dayStr = l.created_at?.split("T")[0];
      const day = days.find(d => d.date === dayStr);
      if (day) day.value++;
    });
    return days;
  }, [leads]);

  // Status distribution
  const statusDist = useMemo(() => [
    { label: "New",        value: leads.filter(l => l.status === "new").length,           color: "#3b82f6" },
    { label: "Qualifying", value: leads.filter(l => l.status === "ai_qualifying").length,  color: "#8b5cf6" },
    { label: "Qualified",  value: leads.filter(l => l.status === "qualified").length,      color: "#6366f1" },
    { label: "Nurturing",  value: leads.filter(l => l.status === "nurturing").length,      color: "#f59e0b" },
    { label: "Won",        value: leads.filter(l => l.status === "won").length,            color: "#10b981" },
    { label: "Lost",       value: leads.filter(l => l.status === "lost").length,           color: "#9ca3af" },
  ].filter(s => s.value > 0), [leads]);

  // Intent distribution
  const intentDist = useMemo(() => [
    { label: "HOT 🔥",  value: leads.filter(l => l.intent_level === "HOT").length,                color: "#ef4444" },
    { label: "WARM 🌡", value: leads.filter(l => l.intent_level === "WARM").length,               color: "#f97316" },
    { label: "COLD ❄️", value: leads.filter(l => l.intent_level === "COLD").length,               color: "#3b82f6" },
    { label: "Quote",   value: leads.filter(l => l.intent_level === "QUOTATION_REQUIRED").length, color: "#f59e0b" },
  ].filter(s => s.value > 0), [leads]);

  // Source distribution
  const sourceDist = useMemo(() => {
    const sources: Record<string, number> = {};
    leads.forEach(l => { sources[l.source || "unknown"] = (sources[l.source || "unknown"] || 0) + 1; });
    return Object.entries(sources).map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [leads]);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900">Reports & Analytics</h1>
        <p className="text-xs text-slate-400 mt-0.5">Performance metrics across your CRM</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Leads"      value={kpis.total}                icon={<Users size={18} className="text-blue-600" />}    color="bg-blue-50" />
        <KpiCard label="Won Deals"        value={kpis.won}                  icon={<Award size={18} className="text-emerald-600" />}  color="bg-emerald-50" trend={kpis.convRate} />
        <KpiCard label="Conversion Rate"  value={`${kpis.convRate}%`}       icon={<Target size={18} className="text-indigo-600" />}  color="bg-indigo-50" />
        <KpiCard label="Hot Leads"        value={kpis.hot}                  icon={<Zap size={18} className="text-rose-600" />}       color="bg-rose-50" />
        <KpiCard label="Pipeline Value"   value={formatINR(kpis.pipeline)}  icon={<TrendingUp size={18} className="text-violet-600" />} color="bg-violet-50" />
        <KpiCard label="Won Revenue"      value={formatINR(kpis.wonRevenue)}icon={<DollarSign size={18} className="text-amber-600" />} color="bg-amber-50" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Daily Lead Volume */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-slate-800">Lead Volume</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Last 7 days</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {last7Days.reduce((s, d) => s + d.value, 0)} this week
            </span>
          </div>
          <MiniBarChart data={last7Days} color="#6366f1" />
        </div>

        {/* Lead Status Donut */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <div className="mb-5">
            <h3 className="text-sm font-black text-slate-800">Lead Status</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Distribution</p>
          </div>
          {statusDist.length > 0 ? (
            <DonutChart segments={statusDist} />
          ) : (
            <div className="text-center py-8 text-slate-300 text-xs">No data</div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Intent Distribution */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <div className="mb-5">
            <h3 className="text-sm font-black text-slate-800">Intent Heatmap</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Lead quality distribution</p>
          </div>
          {intentDist.length > 0 ? (
            <div className="space-y-3">
              {intentDist.map(intent => {
                const total = intentDist.reduce((s, i) => s + i.value, 0);
                const pct = Math.round((intent.value / total) * 100);
                return (
                  <div key={intent.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{intent.label}</span>
                      <span className="font-black text-slate-600">{intent.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: intent.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-300 text-xs">No intent data available</div>
          )}
        </div>

        {/* Lead Sources */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <div className="mb-5">
            <h3 className="text-sm font-black text-slate-800">Lead Sources</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Where leads are coming from</p>
          </div>
          {sourceDist.length > 0 ? (
            <MiniBarChart data={sourceDist} color="#10b981" />
          ) : (
            <div className="text-center py-8 text-slate-300 text-xs">No source data</div>
          )}
        </div>
      </div>

      {/* AI Score Distribution */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800">AI Qualification Score Distribution</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">How AI is scoring your leads</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Cold (0–25)",   range: [0, 25],   color: "#9ca3af" },
            { label: "Warm (26–50)",  range: [26, 50],  color: "#3b82f6" },
            { label: "Hot (51–75)",   range: [51, 75],  color: "#f59e0b" },
            { label: "Fire (76–100)", range: [76, 100], color: "#ef4444" },
          ].map(band => {
            const count = leads.filter(l => l.ai_score >= band.range[0] && l.ai_score <= band.range[1]).length;
            const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
            return (
              <div key={band.label} className="text-center rounded-xl border border-slate-100 p-4" style={{ backgroundColor: `${band.color}10` }}>
                <p className="text-2xl font-black font-mono" style={{ color: band.color }}>{count}</p>
                <p className="text-[9px] font-bold text-slate-500 mt-1">{band.label}</p>
                <p className="text-[9px] font-medium text-slate-400 mt-0.5">{pct}% of total</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
