/**
 * AdminCrm.tsx — CRM Shell
 *
 * This file is intentionally kept thin (~250 lines).
 * All business logic lives in the panel files under ./panels/
 *
 * Navigation sections:
 *   overview | conversations | leads | pipelines | conversions
 *   campaigns | automations | reports | templates | settings
 */

import { useState, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, MessageSquare, Users, TrendingUp, Calendar,
  Megaphone, Zap, BarChart3, FileText, Settings, LogOut,
  Menu, X, Shield, Loader2, RefreshCw
} from "lucide-react";
import { useDashboard } from "../../hooks/useApi";
import { ToastProvider } from "../../components/ui/Toast";
import AdminPipeline from "./AdminPipeline";

// ── Lazy Panel Imports ────────────────────────────────────────────────────────

const OverviewPanel    = lazy(() => import("./panels/OverviewPanel"));
const InboxPanel       = lazy(() => import("./panels/InboxPanel"));
const LeadsPanel       = lazy(() => import("./panels/LeadsPanel"));
const BookingsPanel    = lazy(() => import("./panels/BookingsPanel"));
const CampaignsPanel   = lazy(() => import("./panels/CampaignsPanel"));
const AutomationsPanel = lazy(() => import("./panels/AutomationsPanel"));
const ReportsPanel     = lazy(() => import("./panels/ReportsPanel"));
const TemplatesPanel   = lazy(() => import("./panels/TemplatesPanel"));
const SettingsPanel    = lazy(() => import("./panels/SettingsPanel"));

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewSection =
  | "overview" | "conversations" | "leads"
  | "pipelines" | "conversions" | "campaigns"
  | "automations" | "reports" | "templates" | "settings" | "qr";

// ── Sidebar Nav Config ────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{
  key: ViewSection;
  label: string;
  icon: React.ReactNode;
  group?: string;
}> = [
  { key: "overview",       label: "Overview",      icon: <LayoutDashboard size={16} />, group: "main" },
  { key: "conversations",  label: "Inbox",         icon: <MessageSquare size={16} />,   group: "main" },
  { key: "leads",          label: "Leads",         icon: <Users size={16} />,           group: "main" },
  { key: "pipelines",      label: "Pipeline",      icon: <TrendingUp size={16} />,      group: "main" },
  { key: "conversions",    label: "Bookings",      icon: <Calendar size={16} />,        group: "main" },
  { key: "campaigns",      label: "Campaigns",     icon: <Megaphone size={16} />,       group: "growth" },
  { key: "automations",    label: "Automations",   icon: <Zap size={16} />,             group: "growth" },
  { key: "templates",      label: "Templates",     icon: <FileText size={16} />,        group: "growth" },
  { key: "reports",        label: "Reports",       icon: <BarChart3 size={16} />,       group: "growth" },
  { key: "settings",       label: "Settings",      icon: <Settings size={16} />,        group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  main:   "CRM",
  growth: "Growth",
  system: "System",
};

// ── Loading Fallback ──────────────────────────────────────────────────────────

function PanelLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-slate-600" />
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, loading, error }: {
  onLogin: (u: string, p: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-900/30">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-white">Trinetra CRM</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Admin Access</p>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); onLogin(u, p); }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={u}
              onChange={e => setU(e.target.value)}
              autoComplete="username"
              required
              className="w-full h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-600"
              placeholder="admin"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={p}
              onChange={e => setP(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-600"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-medium text-center bg-rose-950/40 border border-rose-900/50 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-bold transition-all border-0 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  activeView,
  setActiveView,
  onLogout,
  waConnected,
  refreshing,
  onRefresh,
  collapsed,
  setCollapsed,
}: {
  activeView: ViewSection;
  setActiveView: (v: ViewSection) => void;
  onLogout: () => void;
  waConnected: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const groups = ["main", "growth", "system"];

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2 }}
      className="h-screen bg-[#09090B] border-r border-white/5 flex flex-col overflow-hidden shrink-0"
    >
      {/* Header */}
      <div className={`flex items-center ${collapsed ? "justify-center px-3" : "justify-between px-4"} py-4 border-b border-white/5`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
              <Shield size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">Trinetra CRM</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${waConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                <span className="text-[9px] text-slate-500 font-medium">{waConnected ? "Live" : "Offline"}</span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-500 transition-colors border-0 cursor-pointer bg-transparent shrink-0"
        >
          {collapsed ? <Menu size={14} /> : <X size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-4 px-2">
        {groups.map(group => {
          const items = NAV_ITEMS.filter(n => n.group === group);
          return (
            <div key={group}>
              {!collapsed && (
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-wider px-2 mb-1">
                  {GROUP_LABELS[group]}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveView(item.key)}
                    className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-2.5 py-2 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer ${
                      activeView === item.key
                        ? "bg-indigo-600 text-white"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-2 space-y-0.5">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-2.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all border-0 cursor-pointer disabled:opacity-50`}
          title={collapsed ? "Refresh" : undefined}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {!collapsed && "Refresh"}
        </button>
        <a
          href="/super-admin"
          className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-2.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-violet-400 hover:bg-violet-900/20 transition-all`}
          title={collapsed ? "Super Admin" : undefined}
        >
          <Shield size={14} />
          {!collapsed && "Super Admin"}
        </a>
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-2.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-400 hover:bg-rose-900/20 transition-all border-0 cursor-pointer`}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut size={14} />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function AdminCrm() {
  const {
    token, login, logout, loginLoading, loginError,
    leads, analytics, waStatus, healthTelemetry, auditLogs,
    selectedLeadId, setSelectedLeadId, leadDetail,
    refreshing, backendOnline,
    sendManualMessage, updateLeadStatus, updateLeadField, toggleAI,
    triggerDatabaseBackup, triggerRefresh, restartWhatsAppGateway,
    fetchBackups, rollbackBackup,
  } = useDashboard();

  const location = useLocation();
  const [activeView, setActiveView] = useState<ViewSection>(() => {
    const p = location.pathname;
    if (p.includes("leads")) return "leads";
    if (p.includes("conversions")) return "conversions";
    if (p.includes("pipeline")) return "pipelines";
    return "overview";
  });
  const [collapsed, setCollapsed] = useState(false);
  const [calendarData] = useState<{ appointments: any[]; slots: any[] }>({ appointments: [], slots: [] });

  // Navigate to conversation when lead selected from inbox
  const handleSetSelectedLeadId = (id: string | null) => {
    setSelectedLeadId(id);
    if (id) setActiveView("conversations");
  };

  if (!token) {
    return (
      <ToastProvider>
        <LoginScreen onLogin={login} loading={loginLoading} error={loginError} />
      </ToastProvider>
    );
  }

  const renderPanel = () => {
    switch (activeView) {
      case "overview":
        return (
          <OverviewPanel
            leads={leads}
            analytics={analytics}
            calendarData={calendarData}
            backendOnline={backendOnline}
            waStatus={waStatus}
            auditLogs={auditLogs}
            onNavigate={v => setActiveView(v as ViewSection)}
          />
        );
      case "conversations":
        return (
          <InboxPanel
            leads={leads}
            selectedLeadId={selectedLeadId}
            setSelectedLeadId={handleSetSelectedLeadId}
            leadDetail={leadDetail}
            sendManualMessage={sendManualMessage}
            updateLeadStatus={updateLeadStatus}
            updateLeadField={updateLeadField}
            toggleAI={toggleAI}
          />
        );
      case "leads":
        return (
          <LeadsPanel
            leads={leads}
            updateLeadStatus={updateLeadStatus}
            updateLeadField={updateLeadField}
            onViewConversation={id => { handleSetSelectedLeadId(id); }}
          />
        );
      case "pipelines":
        return <AdminPipeline />;
      case "conversions":
        return <BookingsPanel />;
      case "campaigns":
        return <CampaignsPanel />;
      case "automations":
        return <AutomationsPanel />;
      case "reports":
        return <ReportsPanel leads={leads} analytics={analytics} />;
      case "templates":
        return <TemplatesPanel />;
      case "settings":
        return (
          <SettingsPanel
            waStatus={waStatus}
            healthTelemetry={healthTelemetry}
            backendOnline={backendOnline}
            triggerDatabaseBackup={triggerDatabaseBackup}
            restartWhatsAppGateway={restartWhatsAppGateway}
            fetchBackups={fetchBackups}
            rollbackBackup={rollbackBackup}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ToastProvider>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          onLogout={logout}
          waConnected={waStatus?.status === "connected"}
          refreshing={refreshing}
          onRefresh={triggerRefresh}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <div className="h-14 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-800 capitalize">
                {NAV_ITEMS.find(n => n.key === activeView)?.label || activeView}
              </h2>
              {!backendOnline && (
                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Offline
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${
                waStatus?.status === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                  waStatus?.status === "connected" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`} />
                WA {waStatus?.status === "connected" ? "Live" : "Offline"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                {leads.length} leads
              </span>
            </div>
          </div>

          {/* Panel Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <Suspense fallback={<PanelLoader />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderPanel()}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
