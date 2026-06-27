import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, TrendingUp, Calendar, Award,
  ArrowUp, Clock, Zap, AlertCircle,
  Activity, DollarSign, BarChart3
} from "lucide-react";
import type { Lead, AnalyticsData } from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverviewPanelProps {
  leads: Lead[];
  analytics: AnalyticsData | null;
  calendarData: { appointments: any[]; slots: any[] };
  healthTelemetry: any;
  auditLogs: Array<{ id: string; action: string; details: string | null; timestamp: string }>;
  onNavigate: (view: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
}

function StatCard({ label, value, sub, icon, color, trend, onClick }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px -8px rgba(0,0,0,0.1)" }}
      onClick={onClick}
      className={`bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            trend.value >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            <ArrowUp size={9} className={trend.value < 0 ? "rotate-180" : ""} />
            {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 leading-none font-mono">{value}</p>
        <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Pipeline Funnel ───────────────────────────────────────────────────────────

function PipelineFunnel({ leads }: { leads: Lead[] }) {
  const stages = [
    { key: "new",           label: "New",        color: "#3b82f6", bg: "#eff6ff" },
    { key: "ai_qualifying", label: "Qualifying",  color: "#8b5cf6", bg: "#f5f3ff" },
    { key: "qualified",     label: "Qualified",   color: "#6366f1", bg: "#eef2ff" },
    { key: "nurturing",     label: "Nurturing",   color: "#f59e0b", bg: "#fffbeb" },
    { key: "won",           label: "Won",         color: "#10b981", bg: "#ecfdf5" },
  ];

  const total = leads.length || 1;
  const counts = stages.map(s => ({
    ...s,
    count: leads.filter(l => l.status === s.key).length,
  }));

  return (
    <div className="space-y-2">
      {counts.map((stage) => {
        const pct = Math.round((stage.count / total) * 100);
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 w-20 shrink-0 text-right">
              {stage.label}
            </span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: stage.color }}
              />
            </div>
            <span className="text-[10px] font-black text-slate-700 w-8 shrink-0">
              {stage.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ logs }: { logs: Array<{ id: string; action: string; details: string | null; timestamp: string }> }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-xs">
        <Activity size={24} className="mx-auto mb-2 opacity-40" />
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.slice(0, 8).map((log) => (
        <div key={log.id} className="flex items-start gap-3">
          <div className="mt-0.5 h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Activity size={10} className="text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-700 truncate">{log.action}</p>
            {log.details && (
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{log.details}</p>
            )}
          </div>
          <span className="text-[9px] text-slate-400 shrink-0 font-medium">
            {relTime(log.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Hot Leads Widget ──────────────────────────────────────────────────────────

function HotLeadsWidget({ leads, onNavigate }: { leads: Lead[]; onNavigate: (v: string) => void }) {
  const hot = leads
    .filter(l => l.intent_level === "HOT" || l.ai_score >= 75)
    .slice(0, 4);

  return (
    <div className="space-y-2">
      {hot.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-xs">No hot leads right now</div>
      )}
      {hot.map(l => (
        <div
          key={l.id}
          onClick={() => onNavigate("conversations")}
          className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-rose-200 cursor-pointer transition-all"
        >
          <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-black text-xs shrink-0">
            {(l.name || l.phone).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{l.name || l.phone}</p>
            <p className="text-[10px] text-slate-400 truncate">{l.company || l.service || "No company"}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">
              {l.ai_score}%
            </span>
          </div>
        </div>
      ))}
      {hot.length > 0 && (
        <button
          onClick={() => onNavigate("leads")}
          className="w-full text-center text-[10px] text-indigo-600 font-bold hover:text-indigo-700 border-0 bg-transparent cursor-pointer py-1"
        >
          View all leads →
        </button>
      )}
    </div>
  );
}

// ── System Status ─────────────────────────────────────────────────────────────

function SystemStatus({
  healthTelemetry
}: {
  healthTelemetry: any;
}) {
  const items = [
    {
      label: "Supabase Database",
      ok: healthTelemetry?.supabaseConnected ?? false,
      okText: "Connected",
      failText: "Disconnected",
    },
    {
      label: "BhashSMS WhatsApp",
      ok: healthTelemetry?.bhashConnected ?? false,
      okText: "Connected",
      failText: "Credentials Missing",
    },
    {
      label: "AI Engine",
      ok: healthTelemetry?.aiConnected ?? false,
      okText: "Connected",
      failText: "API Key Missing",
    },
  ];

  const lastWebhook = healthTelemetry?.lastWebhookReceived
    ? new Date(healthTelemetry.lastWebhookReceived).toLocaleTimeString()
    : "No events";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">{item.label}</span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              item.ok
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-rose-50 text-rose-700 border-rose-100"
            }`}>
              <span className={`w-1 h-1 rounded-full ${item.ok ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              {item.ok ? item.okText : item.failText}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-2.5 mt-2.5 space-y-1.5 text-[10px] text-slate-400">
        <div className="flex justify-between">
          <span>Last Webhook:</span>
          <span className="font-bold text-slate-600">{lastWebhook}</span>
        </div>
        <div className="flex justify-between">
          <span>Pending Messages:</span>
          <span className="font-bold text-slate-600">{healthTelemetry?.pendingMessages ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OverviewPanel({
  leads,
  calendarData,
  healthTelemetry,
  auditLogs,
  onNavigate,
}: OverviewPanelProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const leadsToday = useMemo(
    () => leads.filter(l => l.created_at?.startsWith(todayStr)).length,
    [leads, todayStr]
  );
  const newLeads = useMemo(() => leads.filter(l => l.status === "new").length, [leads]);
  const nurturing = useMemo(() => leads.filter(l => l.status === "nurturing").length, [leads]);
  const wonLeads  = useMemo(() => leads.filter(l => l.status === "won").length, [leads]);

  const appointmentsToday = useMemo(() => {
    if (!calendarData?.appointments) return 0;
    return calendarData.appointments.filter((a: any) => {
      const d = a.preferred_date?.split("T")[0];
      return d === todayStr && a.status !== "cancelled";
    }).length;
  }, [calendarData, todayStr]);

  const pipelineValue = useMemo(() =>
    leads
      .filter(l => !["won", "lost"].includes(l.status))
      .reduce((s, l) => s + (l.deal_setup_value || 0) + (l.deal_mrr || 0) * 12, 0),
    [leads]
  );

  const conversionRate = useMemo(() => {
    if (!leads.length) return 0;
    return Math.round((wonLeads / leads.length) * 100);
  }, [leads, wonLeads]);

  const stats: StatCardProps[] = [
    {
      label: "Total Leads",
      value: leads.length,
      sub: `${leadsToday} added today`,
      icon: <Users size={18} className="text-blue-600" />,
      color: "bg-blue-50",
      onClick: () => onNavigate("leads"),
    },
    {
      label: "New / Unread",
      value: newLeads,
      sub: "Awaiting response",
      icon: <MessageSquare size={18} className="text-violet-600" />,
      color: "bg-violet-50",
      onClick: () => onNavigate("conversations"),
    },
    {
      label: "Active Nurturing",
      value: nurturing,
      sub: "Follow-up required",
      icon: <Clock size={18} className="text-amber-600" />,
      color: "bg-amber-50",
      onClick: () => onNavigate("leads"),
    },
    {
      label: "Meetings Today",
      value: appointmentsToday,
      sub: "Scheduled appointments",
      icon: <Calendar size={18} className="text-sky-600" />,
      color: "bg-sky-50",
      onClick: () => onNavigate("conversions"),
    },
    {
      label: "Deals Won",
      value: wonLeads,
      sub: `${conversionRate}% conversion rate`,
      icon: <Award size={18} className="text-emerald-600" />,
      color: "bg-emerald-50",
      trend: { value: conversionRate, label: "rate" },
      onClick: () => onNavigate("pipelines"),
    },
    {
      label: "Pipeline Value",
      value: formatINR(pipelineValue),
      sub: "Active revenue potential",
      icon: <DollarSign size={18} className="text-indigo-600" />,
      color: "bg-indigo-50",
      onClick: () => onNavigate("pipelines"),
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Dashboard Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border ${
            healthTelemetry?.bhashConnected
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-rose-50 text-rose-700 border-rose-100"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${healthTelemetry?.bhashConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            WhatsApp {healthTelemetry?.bhashConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      {/* Offline Banner */}
      {healthTelemetry && !healthTelemetry.supabaseConnected && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700">
          <AlertCircle size={18} className="shrink-0" />
          <div>
            <p className="text-sm font-bold">Supabase Database Disconnected</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">Cannot reach Supabase database. Data shown may be stale.</p>
          </div>
        </div>
      )}

      {/* Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Lower Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pipeline Funnel */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Lead Funnel</h3>
            <button
              onClick={() => onNavigate("pipelines")}
              className="text-[10px] text-indigo-600 font-bold hover:text-indigo-700 border-0 bg-transparent cursor-pointer"
            >
              View pipeline →
            </button>
          </div>
          <PipelineFunnel leads={leads} />
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Total leads in system</span>
            <span className="font-black text-slate-700">{leads.length}</span>
          </div>
        </div>

        {/* Hot Leads */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-rose-500" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Hot Leads</h3>
          </div>
          <HotLeadsWidget leads={leads} onNavigate={onNavigate} />
        </div>

        {/* Right Column: System + Activity */}
        <div className="space-y-4">
          {/* System Status */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-slate-500" />
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">System Status</h3>
            </div>
            <SystemStatus healthTelemetry={healthTelemetry} />
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="opacity-80" />
              <h3 className="text-[10px] font-black uppercase tracking-wider opacity-80">This Month</h3>
            </div>
            <p className="text-3xl font-black font-mono leading-none">{formatINR(pipelineValue)}</p>
            <p className="text-xs font-medium opacity-70 mt-1">Active pipeline value</p>
            <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <p className="opacity-60">Won</p>
                <p className="font-black">{wonLeads} deals</p>
              </div>
              <div>
                <p className="opacity-60">Win Rate</p>
                <p className="font-black">{conversionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-slate-500" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Recent Activity</h3>
          </div>
          <span className="text-[9px] text-slate-400 font-medium">Last 24h</span>
        </div>
        <ActivityFeed logs={auditLogs} />
      </div>
    </div>
  );
}
