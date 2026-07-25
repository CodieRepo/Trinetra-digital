/**
 * AdminCrm.tsx — CRM Shell
 *
 * All business logic lives in the panel files under ./panels/
 */

import { useState, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, MessageSquare, Users, TrendingUp, Calendar,
  Megaphone, Zap, BarChart3, FileText, Settings, LogOut,
  Menu, X, Shield, Loader2, RefreshCw, Activity, Radio, UtensilsCrossed
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
const DiagnosticsPanel = lazy(() => import("./panels/DiagnosticsPanel"));
const BhashMonitorPanel = lazy(() => import("./panels/BhashMonitorPanel"));
const RestaurantPanel = lazy(() => import("./panels/RestaurantPanel"));

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewSection =
  | "overview" | "conversations" | "leads"
  | "pipelines" | "conversions" | "campaigns"
  | "automations" | "reports" | "templates" | "settings" | "qr" | "diagnostics" | "bhash" | "restaurant-os";

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
  { key: "restaurant-os",  label: "Restaurant OS", icon: <UtensilsCrossed size={16} />, group: "verticals" },
  { key: "bhash",          label: "Bhash Monitor", icon: <Radio size={16} />,           group: "growth" },
  { key: "campaigns",      label: "Campaigns",     icon: <Megaphone size={16} />,       group: "growth" },
  { key: "automations",    label: "Automations",   icon: <Zap size={16} />,             group: "growth" },
  { key: "templates",      label: "Templates",     icon: <FileText size={16} />,        group: "growth" },
  { key: "reports",        label: "Reports",       icon: <BarChart3 size={16} />,       group: "growth" },
  { key: "settings",       label: "Settings",      icon: <Settings size={16} />,        group: "system" },
  { key: "diagnostics",    label: "Meta Test",     icon: <Activity size={16} />,        group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  main:      "CRM",
  verticals: "Vertical Modules",
  growth:    "Growth",
  system:    "System",
};

// ── Loading Fallback ──────────────────────────────────────────────────────────

function PanelLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-indigo-600" size={24} />
    </div>
  );
}

// ── Sidebar Component ─────────────────────────────────────────────────────────

interface SidebarProps {
  activeView: ViewSection;
  setActiveView: (v: ViewSection) => void;
  onLogout: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

function Sidebar({
  activeView, setActiveView, onLogout,
  refreshing, onRefresh,
  collapsed, setCollapsed,
}: SidebarProps) {
  const grouped = NAV_ITEMS.reduce((acc, item) => {
    const g = item.group || "main";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="shrink-0 bg-slate-900 text-slate-300 flex flex-col h-full z-20 select-none border-r border-slate-800"
    >
      {/* Brand */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
              T
            </div>
            <span className="font-bold text-sm text-white tracking-wide truncate">
              Trinetra <span className="text-indigo-400 font-normal text-xs">CRM</span>
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-0 cursor-pointer ml-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {Object.entries(grouped).map(([groupKey, items]) => (
          <div key={groupKey}>
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {GROUP_LABELS[groupKey] || groupKey}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map(item => {
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveView(item.key)}
                    className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-2.5 py-2 rounded-xl text-xs font-medium transition-all border-0 cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer controls */}
      <div className="p-2 border-t border-slate-800 space-y-1">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-2.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all border-0 cursor-pointer disabled:opacity-50`}
          title={collapsed ? "Refresh data" : undefined}
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
    leads, analytics, waStatus,
    refreshing, backendOnline,
    updateLeadStatus, updateLeadField,
    triggerRefresh,
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

  const handleSetSelectedLeadId = (_id: string | null) => {
    setActiveView("conversations");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5"
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
              T
            </div>
            <h1 className="text-xl font-bold text-white">Trinetra CRM Admin</h1>
            <p className="text-xs text-slate-400">Sign in to access your dashboard</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
              {loginError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              login(fd.get("username") as string, fd.get("password") as string);
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username / Email</label>
              <input
                type="text"
                name="username"
                defaultValue="admin"
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                defaultValue="admin123"
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-50"
            >
              {loginLoading && <Loader2 size={16} className="animate-spin" />}
              <span>Sign In</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const renderPanel = () => {
    switch (activeView) {
      case "overview":
        return <OverviewPanel analytics={analytics} leads={leads} onSelectView={setActiveView} />;
      case "conversations":
        return <InboxPanel />;
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
      case "restaurant-os":
        return <RestaurantPanel />;
      case "bhash":
        return <BhashMonitorPanel />;
      case "campaigns":
        return <CampaignsPanel />;
      case "automations":
        return <AutomationsPanel />;
      case "reports":
        return <ReportsPanel leads={leads} analytics={analytics} />;
      case "templates":
        return <TemplatesPanel />;
      case "settings":
        return <SettingsPanel />;
      case "diagnostics":
        return <DiagnosticsPanel />;
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
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
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
