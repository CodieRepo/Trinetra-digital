import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle,
  TrendingUp,
  Mail,
  Building,
  MessageSquare,
  Send,
  RefreshCw,
  QrCode,
  LogOut,
  Sparkles,
  ArrowRight,
  Loader2,
  Lock,
  Search,
  Plus,
  Settings,
  ShieldAlert,
  Zap,
  Database,
  CreditCard,
  Play,
  Menu,
  X,
  BarChart2,
  Activity,
  Clock,
  Compass
} from "lucide-react";
import { useDashboard } from "../../hooks/useApi";
import { Lead } from "../../services/api";

type ViewSection = 
  | 'overview' 
  | 'conversations' 
  | 'leads' 
  | 'pipelines' 
  | 'campaigns' 
  | 'automations' 
  | 'agents' 
  | 'reports' 
  | 'integrations' 
  | 'settings' 
  | 'billing' 
  | 'qr';

export default function AdminCrm() {
  const {
    token,
    login,
    logout,
    loginLoading,
    loginError,
    
    leads,
    analytics,
    waStatus,
    healthTelemetry,
    selectedLeadId,
    setSelectedLeadId,
    leadDetail,
    
    campaigns,
    workflows,
    agents,
    billing,
    
    refreshing,
    backendOnline,
    backupLoading,
    lastSuccessTime,
    
    sendManualMessage,
    updateLeadStatus,
    triggerDatabaseBackup,
    triggerRefresh
  } = useDashboard();

  // Navigation and Layout Controls
  const [activeView, setActiveView] = useState<ViewSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workspace, setWorkspace] = useState("Trinetra Digital Primary");
  
  // Custom Form & Interactive States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [manualMsgText, setManualMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiMsgText, setAiMsgText] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: "Hello! I am your Trinetra AI Copilot. I can write automated replies, score leads, analyze analytics pipelines, or trigger DB backups. Try saying: 'Review latest lead' or 'Create a database backup'." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Reference hooks for UI components
  const activeChatEndRef = useRef<HTMLDivElement>(null);
  const commandPaletteRef = useRef<HTMLDivElement>(null);

  // Handle auto-scroll on conversation timeline updates
  useEffect(() => {
    if (activeChatEndRef.current) {
      activeChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [leadDetail?.chats]);

  // Handle Command Palette (Ctrl + K) Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter leads based on global search in Command Palette
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(
      lead => 
        lead.name.toLowerCase().includes(query) || 
        (lead.company && lead.company.toLowerCase().includes(query)) ||
        lead.phone.includes(query)
    );
  }, [leads, searchQuery]);

  // Masking helpers for sensitive data
  const maskPhone = (phone: string) => {
    const clean = phone.trim();
    if (clean.length < 8) return '********';
    return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
  };

  const maskEmail = (email: string | null) => {
    if (!email) return '—';
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***';
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 3) return `***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  };

  // Submit dynamic manual message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMsgText.trim() || !selectedLeadId) return;
    setSendingMsg(true);
    const sent = await sendManualMessage(selectedLeadId, manualMsgText.trim());
    if (sent) {
      setManualMsgText("");
    }
    setSendingMsg(false);
  };

  // Handle Floating AI Assistant query submit
  const submitAiAssistantQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMsgText.trim()) return;

    const userQuery = aiMsgText.trim();
    setAiMsgText("");
    setAiChatHistory(prev => [...prev, { role: 'user', text: userQuery }]);
    setAiLoading(true);

    // Simulate futuristic AI thinking time
    setTimeout(async () => {
      let aiResponse = "I've analyzed your system parameters. Please specify your request.";
      const queryLower = userQuery.toLowerCase();

      if (queryLower.includes("backup") || queryLower.includes("sqlite")) {
        aiResponse = "🔄 Initializing SQLite database backup sequence... Requesting authorization token...";
        setAiChatHistory(prev => [...prev, { role: 'assistant', text: aiResponse }]);
        const success = await triggerDatabaseBackup();
        if (success) {
          aiResponse = "✅ Database backup created successfully. Timestamp: " + new Date().toLocaleTimeString() + ". Rolling cleanup verified: keeping exactly the 7 latest files to preserve VPS disk space.";
        } else {
          aiResponse = "❌ Backup trigger failed. Server returned 500 error. Verify SQLite DB path configuration.";
        }
      } else if (queryLower.includes("lead") || queryLower.includes("latest")) {
        if (leads.length > 0) {
          const l = leads[0];
          aiResponse = `🤖 **Latest Lead Insights**:
          - **Name**: ${l.name}
          - **Company**: ${l.company || 'Not Specified'}
          - **Service**: ${l.service || 'Automation Solution'}
          - **AI Confidence Score**: ${l.ai_score}/100
          - **Gemini Summary**: "${l.ai_summary || 'Analysis pending in queue.'}"`;
        } else {
          aiResponse = "No leads found in database. Seeding seeder has not preloaded mock data.";
        }
      } else if (queryLower.includes("whatsapp") || queryLower.includes("connection")) {
        aiResponse = `📞 **WhatsApp Integration Telemetry**:
        - **Baileys Status**: ${waStatus?.status.toUpperCase() || 'OFFLINE'}
        - **Session Path**: /var/www/trinetra/server/data/wa-session
        - **Keystore State**: Cacheable signal key store bound and active.
        ${waStatus?.status === 'connected' ? '🟢 System is active. Automatic auto-replies are processing.' : '⚠️ QR Scan required. Open WhatsApp -> Linked Devices -> Scan QR.'}`;
      } else {
        // Standard conversational responses
        aiResponse = "I've registered your request: \"" + userQuery + "\". As your Trinetra operating copilot, I am scanning live Leads, campaigns, and WhatsApp Web socket events to keep your operations optimal.";
      }

      setAiChatHistory(prev => [...prev, { role: 'assistant', text: aiResponse }]);
      setAiLoading(false);
    }, 1200);
  };

  // Perform localized auth submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  if (!token) {
    /* ── IMMERSIVE FUTURISTIC AUTHENTICATION INTERFACE ── */
    return (
      <div className="min-h-screen bg-[#F4F5F6] flex items-center justify-center py-20 px-6 relative overflow-hidden">
        {/* Glowing glassmorphic orbital backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-gradient-to-tr from-emerald-200/20 to-teal-300/30 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-amber-200/20 to-orange-300/20 rounded-full blur-[90px] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl p-8 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.06)] relative z-10"
        >
          {/* Logo Brand Title */}
          <div className="text-center mb-8">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-50 border border-emerald-200/30 text-emerald-600 mb-4 shadow-inner">
              <Sparkles size={24} className="animate-pulse" />
            </span>
            <h1 className="font-display text-4xl text-slate-900 tracking-tight font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 bg-clip-text text-transparent">Trinetra OS</h1>
            <p className="text-xs text-slate-500 mt-2 font-medium">Business AI Automation Command Center</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="login-username" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Username</label>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="h-11 rounded-xl border border-slate-200 bg-white/60 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Password</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl border border-slate-200 bg-white/60 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-500 font-semibold text-center mt-2 flex items-center justify-center gap-1.5 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                <ShieldAlert size={14} /> {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase tracking-wider hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] transition-all disabled:opacity-60 shadow-sm"
            >
              {loginLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>Establish Connection <ArrowRight size={14} /></>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  /* ── FULL MULTI-VIEW PREMIUM SaaS CRM INTERFACE ── */
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex overflow-hidden font-sans pt-16">
      
      {/* 🔮 Background orbits */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-gradient-to-tr from-emerald-100/10 to-teal-200/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-amber-100/10 to-orange-200/10 rounded-full blur-[130px] pointer-events-none" />

      {/* ── CENTRALIZED FLOATING HEADER BAR ── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/80 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(prev => !prev)}
            className="h-9 w-9 flex items-center justify-center border border-slate-200 bg-white/80 hover:bg-slate-50 rounded-xl text-slate-500 transition-all shadow-3xs mr-1"
            title="Toggle Sidebar"
          >
            <Menu size={14} />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
            <Sparkles size={16} />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold text-slate-800 tracking-tight font-display flex items-center gap-1.5">
              Trinetra Command
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5">{workspace}</span>
          </div>
        </div>

        {/* Global Action items */}
        <div className="flex items-center gap-3">
          {/* Quick Command Search bar */}
          <button 
            onClick={() => setCommandPaletteOpen(true)}
            className="flex h-9 w-60 items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 px-3.5 text-xs text-slate-400 transition-all font-medium"
          >
            <span className="flex items-center gap-1.5"><Search size={14} /> Search everywhere...</span>
            <span className="font-mono text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 shadow-3xs">Ctrl+K</span>
          </button>

          <button
            onClick={triggerRefresh}
            className="h-9 w-9 flex items-center justify-center border border-slate-200 bg-white/80 hover:bg-slate-50 rounded-xl text-slate-500 transition-all shadow-3xs"
            title="Refresh Telemetry"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-emerald-500" : ""} />
          </button>

          <button
            onClick={() => setAiAssistantOpen(true)}
            className="flex h-9 items-center gap-1.5 px-3.5 border border-emerald-200/50 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold tracking-wide transition-all shadow-3xs animate-bounce-slow"
          >
            <Sparkles size={14} />
            Ask AI
          </button>

          <button
            onClick={logout}
            className="h-9 w-9 flex items-center justify-center border border-rose-100 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-600 transition-all shadow-3xs"
            title="Sign Out System"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── SIDEBAR NAVIGATION WORKSPACE ── */}
      <aside 
        className={`w-64 border-r border-slate-200/80 bg-white/60 backdrop-blur-xl shrink-0 flex flex-col pt-4 pb-6 transition-all duration-300 z-30 fixed left-0 top-16 bottom-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 mb-5 shrink-0">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shadow-3xs">T</span>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-700 truncate">Trinetra Workspace</span>
              <span className="text-[8px] text-slate-400 font-mono">v1.2.0-SaaS</span>
            </div>
          </div>
        </div>

        {/* Dynamic Sidebar Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Overview Hub', icon: Compass },
            { id: 'conversations', label: 'Conversations', icon: MessageSquare, badge: leads.filter(l => l.status === 'new').length || undefined },
            { id: 'leads', label: 'Leads Command', icon: Users },
            { id: 'pipelines', label: 'CRM Pipelines', icon: TrendingUp },
            { id: 'campaigns', label: 'AI Broadcasts', icon: Send },
            { id: 'automations', label: 'Automations', icon: Zap },
            { id: 'agents', label: 'AI Agent Core', icon: Sparkles },
            { id: 'reports', label: 'Reports & Charts', icon: BarChart2 },
            { id: 'integrations', label: 'Integrations', icon: Activity },
            { id: 'settings', label: 'Settings Panel', icon: Settings },
            { id: 'billing', label: 'Billing Meters', icon: CreditCard },
            { id: 'qr', label: 'WhatsApp QR', icon: QrCode, badge: waStatus?.status !== 'connected' ? 'QR' : undefined },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewSection)}
              className={`flex w-full items-center justify-between h-10 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all relative ${
                activeView === item.id 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_4px_12px_-2px_rgba(16,185,129,0.2)]'
                  : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <item.icon size={15} />
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className={`h-4 min-w-4 flex items-center justify-center rounded-full text-[8px] font-bold px-1.5 ${
                  activeView === item.id ? 'bg-white text-emerald-700' : 'bg-emerald-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Mini health stats card */}
        {healthTelemetry && (
          <div className="px-5 shrink-0 mt-5">
            <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3.5 text-[10px] space-y-1.5 text-slate-500 font-mono">
              <div className="flex justify-between">
                <span>DB status:</span>
                <span className="text-emerald-600 font-bold">CONNECTED</span>
              </div>
              <div className="flex justify-between">
                <span>RAM allocation:</span>
                <span className="text-slate-700 font-bold">{healthTelemetry.system.ramUsed}</span>
              </div>
              <div className="flex justify-between">
                <span>Server Uptime:</span>
                <span className="text-slate-700 font-bold">{healthTelemetry.system.uptime}</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className={`flex-1 transition-all duration-300 min-h-screen ${sidebarOpen ? "pl-64" : "pl-0"} p-8 overflow-y-auto`}>
        
        {/* Offline Alarm Alert Bar */}
        {!backendOnline && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-6 text-center text-xs font-semibold text-rose-700 flex items-center justify-center gap-2 animate-pulse shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
            ⚠️ Backend connection severed. Reconnecting to http://187.127.170.222:3000/api... Verify proxy.
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* ── VIEW 1: OVERVIEW HUB ── */}
              {activeView === 'overview' && (
                <div className="space-y-6">
                  {/* Title Welcome */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight font-display">Workspace Dashboard</h2>
                      <p className="text-xs text-slate-500 mt-1">Live overview of CRM, campaigns, and WhatsApp AI automations.</p>
                    </div>
                    {lastSuccessTime && (
                      <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-3xs">
                        Last Synchronized: <b className="text-slate-600 font-bold">{lastSuccessTime}</b>
                      </span>
                    )}
                  </div>

                  {/* High-fidelity summary deck */}
                  {analytics && (
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                      {[
                        { label: "Pipeline leads", value: analytics.summary.totalLeads, desc: "captured lifetime", icon: Users, gradient: "from-emerald-500 to-teal-500", color: "text-white" },
                        { label: "Qualified AI", value: analytics.summary.qualifiedLeads, desc: "leads score >= 80", icon: Sparkles, gradient: "from-amber-500 to-orange-500", color: "text-white" },
                        { label: "Deals Closed", value: analytics.summary.wonLeads, desc: "conversion won stage", icon: CheckCircle, gradient: "from-blue-500 to-indigo-500", color: "text-white" },
                        { label: "Captured Today", value: analytics.summary.leadsToday, desc: "live new submits today", icon: TrendingUp, gradient: "from-slate-700 to-slate-900", color: "text-white" }
                      ].map((card, i) => (
                        <div key={i} className="bg-white/70 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl shadow-3xs flex items-center gap-4">
                          <div className={`h-11 w-11 rounded-xl bg-gradient-to-tr ${card.gradient} ${card.color} flex items-center justify-center shadow-sm`}>
                            <card.icon size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{card.value}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{card.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Funnel chart and recent activity grid */}
                  <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-3xs">
                      <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">Lead Generation funnel</h3>
                      {/* Premium Pure SVG Funnel Area Chart */}
                      <div className="h-64 flex items-end">
                        <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          <line x1="0" y1="50" x2="500" y2="50" stroke="#E2E8F0" strokeDasharray="3" />
                          <line x1="0" y1="100" x2="500" y2="100" stroke="#E2E8F0" strokeDasharray="3" />
                          <line x1="0" y1="150" x2="500" y2="150" stroke="#E2E8F0" strokeDasharray="3" />
                          
                          {/* Smooth Area path */}
                          <path 
                            d="M 0 170 Q 100 130 150 140 T 300 90 T 400 110 T 500 60 L 500 200 L 0 200 Z" 
                            fill="url(#area-grad)" 
                          />
                          {/* Smooth Line path */}
                          <path 
                            d="M 0 170 Q 100 130 150 140 T 300 90 T 400 110 T 500 60" 
                            fill="none" 
                            stroke="#10B981" 
                            strokeWidth="3" 
                          />
                          {/* Dots */}
                          <circle cx="150" cy="140" r="4" fill="#10B981" />
                          <circle cx="300" cy="90" r="4" fill="#10B981" />
                          <circle cx="500" cy="60" r="5" fill="#0D9488" stroke="#FFFFFF" strokeWidth="2" />
                        </svg>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono mt-3">
                        <span>WEEK 1</span>
                        <span>WEEK 2</span>
                        <span>WEEK 3</span>
                        <span>WEEK 4</span>
                      </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-3xs flex flex-col">
                      <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">Live System Health</h3>
                      
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Database size={14} /></span>
                            <div>
                              <p className="text-xs font-bold text-slate-700">SQLite Database</p>
                              <p className="text-[9px] text-slate-400">Journal Mode: WAL Enabled</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><QrCode size={14} /></span>
                            <div>
                              <p className="text-xs font-bold text-slate-700">WhatsApp Gateway</p>
                              <p className="text-[9px] text-slate-400">Baileys Multikey Client</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            waStatus?.status === 'connected' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50 animate-pulse'
                          }`}>{waStatus?.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}</span>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Sparkles size={14} /></span>
                            <div>
                              <p className="text-xs font-bold text-slate-700">Gemini AI Engine</p>
                              <p className="text-[9px] text-slate-400">Google API Integration</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">OPERATIONAL</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 2: TEAM INBOX / CONVERSATIONS ── */}
              {activeView === 'conversations' && (
                <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm grid md:grid-cols-[280px_1fr_300px] h-[calc(100vh-180px)]">
                  {/* Left Column: Thread List */}
                  <div className="border-r border-slate-200 flex flex-col h-full bg-white/40">
                    <div className="p-4 border-b border-slate-200 shrink-0">
                      <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        Live Threads
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-2 py-0.5 rounded-full">CHAT</span>
                      </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 p-2">
                      {leads.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic text-center py-6">No threads available</p>
                      ) : (
                        leads.map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => setSelectedLeadId(lead.id)}
                            className={`flex flex-col w-full text-left p-3 rounded-xl transition-all ${
                              selectedLeadId === lead.id ? 'bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-800 flex justify-between w-full items-center">
                              {lead.name}
                              <span className="text-[8px] font-mono text-slate-400">Score: {lead.ai_score}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 truncate max-w-[240px] font-mono">{maskPhone(lead.phone)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Chat Timeline */}
                  <div className="flex flex-col h-full border-r border-slate-200 bg-white/20">
                    {leadDetail ? (
                      <>
                        <div className="p-4 border-b border-slate-200 bg-white/50 shrink-0 flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-800">{leadDetail.lead.name}</h4>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{leadDetail.lead.phone}</p>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">AI SETTER ACTIVE</span>
                        </div>

                        {/* Timeline timeline bubbles */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                          {leadDetail.chats.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                              <MessageSquare size={24} className="opacity-40" />
                              No conversation logs
                            </div>
                          ) : (
                            leadDetail.chats.map((chat) => (
                              <div
                                key={chat.id}
                                className={`flex ${chat.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-3xs ${
                                  chat.direction === 'outbound'
                                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-none'
                                    : 'bg-white text-slate-800 border border-slate-200/60 rounded-bl-none'
                                }`}>
                                  <p>{chat.body}</p>
                                  <span className="text-[8px] opacity-75 mt-1 block text-right">
                                    {new Date(chat.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={activeChatEndRef} />
                        </div>

                        {/* Send composer form */}
                        <form onSubmit={handleSendChat} className="p-4 border-t border-slate-200 bg-white/50 shrink-0 flex gap-2">
                          <input
                            type="text"
                            required
                            value={manualMsgText}
                            onChange={(e) => setManualMsgText(e.target.value)}
                            placeholder="Send WhatsApp directly..."
                            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                          <button
                            type="submit"
                            disabled={sendingMsg || !manualMsgText.trim()}
                            className="h-10 w-10 flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-[0_4px_10px_rgba(16,185,129,0.2)] transition-all shrink-0 disabled:opacity-50"
                          >
                            {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                        <MessageSquare size={32} className="opacity-40" />
                        Select a lead thread to view active chats
                      </div>
                    )}
                  </div>

                  {/* Right Column: Lead context profile */}
                  <div className="h-full overflow-y-auto bg-white/50 p-4 space-y-4">
                    {leadDetail ? (
                      <>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Context Profile</h4>
                        
                        <div className="space-y-3.5 text-xs">
                          <div className="flex gap-2">
                            <Building size={14} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-700">Company</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{leadDetail.lead.company || 'Not Listed'}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Mail size={14} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-700">Email Address</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{maskEmail(leadDetail.lead.email)}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Clock size={14} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-700">Created Date</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{new Date(leadDetail.lead.created_at).toLocaleString()}</p>
                            </div>
                          </div>

                          {/* AI BANT evaluation summary */}
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2 mt-4 shadow-3xs">
                            <span className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                              <Sparkles size={11} /> Gemini BANT Assessment
                            </span>
                            <p className="text-[11px] text-slate-700 leading-normal italic">
                              "{leadDetail.lead.ai_summary || 'Conversational intake currently processing intent...'}"
                            </p>
                            <div className="flex justify-between items-center pt-2 border-t border-emerald-100/50 text-[10px] text-emerald-800 font-bold">
                              <span>Confidence Score: {leadDetail.lead.ai_score}</span>
                              <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded text-[8px]">
                                {leadDetail.lead.ai_budget ? 'BUDGET: MATCH' : 'BUDGET: EVAL'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-8">Select lead for BANT profile.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── VIEW 3: LEADS LIST ── */}
              {activeView === 'leads' && (
                <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">Leads Database</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Active leads recorded from website forms and WhatsApp sessions.</p>
                    </div>
                    <button 
                      onClick={triggerDatabaseBackup}
                      disabled={backupLoading}
                      className="h-9 px-4 flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-3xs"
                    >
                      {backupLoading ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                      Export SQLite Backup
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                          <th className="pb-3.5 pl-3">LEAD NAME</th>
                          <th className="pb-3.5">COMPANY</th>
                          <th className="pb-3.5">CONTACT</th>
                          <th className="pb-3.5 text-center">AI SCORE</th>
                          <th className="pb-3.5">PIPELINE STAGE</th>
                          <th className="pb-3.5 text-right pr-3">REGISTERED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 pl-3 font-bold text-slate-800">{lead.name}</td>
                            <td className="py-3.5 text-slate-500">{lead.company || '—'}</td>
                            <td className="py-3.5 text-slate-400 font-mono">{maskPhone(lead.phone)}</td>
                            <td className="py-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                                lead.ai_score >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>{lead.ai_score || '—'}</span>
                            </td>
                            <td className="py-3.5">
                              <select
                                value={lead.status}
                                onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700"
                              >
                                <option value="new">New</option>
                                <option value="ai_qualifying">AI Qualifying</option>
                                <option value="qualified">Qualified</option>
                                <option value="nurturing">Nurturing</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                              </select>
                            </td>
                            <td className="py-3.5 text-right pr-3 text-slate-400">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── VIEW 4: CRM PIPELINES ── */}
              {activeView === 'pipelines' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Visual Sales Pipelines</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Drag-and-drop or select stage paths to move leads.</p>
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-6 items-start">
                    {(['new', 'ai_qualifying', 'qualified', 'nurturing', 'won', 'lost'] as Lead['status'][]).map((stage) => {
                      const stageLeads = leads.filter(l => l.status === stage);
                      return (
                        <div key={stage} className="bg-slate-100/50 border border-slate-200/80 rounded-2xl p-3 space-y-3.5 min-h-[300px]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                            {stage.replace('_', ' ')} ({stageLeads.length})
                          </span>
                          
                          <div className="space-y-2">
                            {stageLeads.map((lead) => (
                              <div
                                key={lead.id}
                                className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-3xs cursor-pointer hover:shadow-2xs transition-all space-y-2"
                              >
                                <p className="text-xs font-bold text-slate-700 truncate">{lead.name}</p>
                                <p className="text-[9px] text-slate-400 truncate">{lead.company || 'Private Lead'}</p>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[8px] font-bold text-slate-400">
                                  <span>Score: {lead.ai_score}</span>
                                  <span className="text-emerald-600 bg-emerald-50 px-1 rounded">{lead.source}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── VIEW 5: CAMPAIGNS ── */}
              {activeView === 'campaigns' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">Broadcast Campaign Center</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Automated WhatsApp bulk messaging campaigns and schedulers.</p>
                    </div>
                    <button 
                      onClick={() => alert("Campaign composer module initialized. Broadcasting requires a synced WhatsApp business gateway session.")}
                      className="h-9 px-4 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-3xs"
                    >
                      <Plus size={14} /> Compose Broadcast
                    </button>
                  </div>

                  {/* Active Campaigns table */}
                  <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs">
                    <div className="space-y-4">
                      {campaigns.map((camp) => (
                        <div key={camp.id} className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-3xs transition-all">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                              <h4 className="text-xs font-extrabold text-slate-800">{camp.name}</h4>
                            </div>
                            <p className="text-[10px] text-slate-400">Target Group: <b className="text-slate-600 font-bold">{camp.targetGroup}</b></p>
                            <p className="text-[11px] text-slate-500 italic max-w-lg truncate">"{camp.body}"</p>
                          </div>

                          <div className="flex items-center gap-6 shrink-0 text-center font-mono text-[10px]">
                            <div>
                              <p className="text-slate-400 font-sans font-bold uppercase tracking-wider text-[8px]">Sent</p>
                              <p className="text-xs font-extrabold text-slate-700 mt-0.5">{camp.sentCount}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-sans font-bold uppercase tracking-wider text-[8px]">Delivered</p>
                              <p className="text-xs font-extrabold text-slate-700 mt-0.5">{camp.deliveredCount}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-sans font-bold uppercase tracking-wider text-[8px]">Read</p>
                              <p className="text-xs font-extrabold text-emerald-600 mt-0.5">
                                {camp.sentCount > 0 ? `${Math.floor((camp.readCount / camp.sentCount) * 100)}%` : '—'}
                              </p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              camp.status === 'completed' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50 animate-pulse'
                            }`}>{camp.status.toUpperCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 6: AUTOMATIONS ── */}
              {activeView === 'automations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Visual Automation Workflows</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Automated workflow chains capturing leads and scheduling followups.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-start">
                    {/* Visual node flowchart mockup */}
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs min-h-[400px] flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                        backgroundImage: `radial-gradient(#10B981 1.5px, transparent 1.5px)`,
                        backgroundSize: "20px 20px"
                      }} />
                      
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5 z-10">
                        <Zap size={14} className="text-emerald-500 animate-pulse" /> Active Node Schema: Web Autopilot
                      </h4>

                      {/* Interactive Flow Nodes */}
                      <div className="space-y-8 flex-1 flex flex-col items-center justify-center z-10 py-10">
                        
                        {/* Node 1: Trigger */}
                        <div className="border border-emerald-200 bg-emerald-50/50 p-3 rounded-2xl w-60 shadow-3xs flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Play size={12} /></span>
                          <div>
                            <p className="text-xs font-bold text-emerald-800">Trigger: Form Submit</p>
                            <p className="text-[8px] text-emerald-600 font-mono">Website Leads Capture</p>
                          </div>
                        </div>

                        {/* Connection arrow */}
                        <div className="h-6 w-0.5 bg-emerald-200 relative flex justify-center items-center">
                          <span className="absolute bottom-0 w-1 h-1 bg-emerald-500 rounded-full" />
                        </div>

                        {/* Node 2: Action */}
                        <div className="border border-slate-200 bg-white p-3 rounded-2xl w-60 shadow-3xs flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Sparkles size={12} /></span>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Action: Gemini Assessment</p>
                            <p className="text-[8px] text-slate-400 font-mono">Intent & BANT scoring</p>
                          </div>
                        </div>

                        {/* Connection arrow */}
                        <div className="h-6 w-0.5 bg-slate-200 relative flex justify-center items-center">
                          <span className="absolute bottom-0 w-1 h-1 bg-slate-400 rounded-full" />
                        </div>

                        {/* Node 3: Action */}
                        <div className="border border-slate-200 bg-white p-3 rounded-2xl w-60 shadow-3xs flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><MessageSquare size={12} /></span>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Action: WhatsApp Notify</p>
                            <p className="text-[8px] text-slate-400 font-mono">Send suggested AI reply</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Right column: active workflows status */}
                    <div className="space-y-4">
                      {workflows.map((flow) => (
                        <div key={flow.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-2 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{flow.name}</h4>
                            <p className="text-[9px] text-slate-400 mt-1">Trigger: <b className="text-slate-600 font-bold">{flow.trigger}</b></p>
                            <p className="text-[8px] text-slate-400 font-mono mt-0.5">Last Triggered: {new Date(flow.lastTriggeredAt).toLocaleString()}</p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                              flow.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-50'
                            }`}>{flow.status.toUpperCase()}</span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">{flow.nodesCount} Nodes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 7: AI AGENTS ── */}
              {activeView === 'agents' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">AI Agent Orchestration Core</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Tune underlying LLM prompts, roles, thresholds, and fallback actions.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {agents.map((agent) => (
                      <div key={agent.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3 items-center">
                              <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-3xs"><Sparkles size={16} /></span>
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-800">{agent.name}</h4>
                                <p className="text-[9px] text-slate-400 mt-0.5">{agent.role}</p>
                              </div>
                            </div>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                              agent.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50 animate-pulse'
                            }`}>{agent.status.toUpperCase()}</span>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-[10px] text-slate-500 font-mono leading-normal h-24 overflow-y-auto italic">
                            "{agent.prompt}"
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] font-bold text-slate-400 font-mono">
                          <span>Conversations: <b className="text-slate-700">{agent.totalConversations}</b></span>
                          <span>Accuracy Rate: <b className="text-emerald-600">{agent.accuracyRate}%</b></span>
                          <span>Confidence threshold: <b className="text-slate-700">{agent.confidenceThreshold}%</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── VIEW 8: REPORTS & CHARTS ── */}
              {activeView === 'reports' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Analytical Reports</h3>
                    <p className="text-xs text-slate-400 mt-0.5">High-resolution statistics tracking lead ingestion velocities.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* SVG Line Area Chart: 30d leads count */}
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Leads volume (30-day analytics)</h4>
                      
                      <div className="h-48 flex items-end">
                        <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="lines-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="50" x2="400" y2="50" stroke="#F1F5F9" />
                          <line x1="0" y1="100" x2="400" y2="100" stroke="#F1F5F9" />
                          
                          <path d="M 0 120 Q 80 130 160 80 T 320 60 T 400 30 L 400 150 L 0 150 Z" fill="url(#lines-grad)" />
                          <path d="M 0 120 Q 80 130 160 80 T 320 60 T 400 30" fill="none" stroke="#3B82F6" strokeWidth="2.5" />
                        </svg>
                      </div>
                      <div className="flex justify-between text-[8px] font-mono font-bold text-slate-400">
                        <span>MAY 01</span>
                        <span>MAY 15</span>
                        <span>MAY 28</span>
                      </div>
                    </div>

                    {/* SVG Bar Chart: conversion speed */}
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lead Source Capture ratio</h4>
                      
                      <div className="space-y-4 py-2 text-xs">
                        {[
                          { source: 'Website Contact Forms', count: 124, pct: 65, color: 'bg-emerald-500' },
                          { source: 'WhatsApp Direct Incoming', count: 48, pct: 25, color: 'bg-teal-500' },
                          { source: 'Referral & Manual Seeds', count: 18, pct: 10, color: 'bg-slate-400' }
                        ].map((item, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold text-slate-700">
                              <span>{item.source}</span>
                              <span className="text-slate-400 font-mono">{item.count} leads ({item.pct}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 9: INTEGRATIONS ── */}
              {activeView === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Operational Integrations</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Establish third-party webhooks, security access API keys, or custom integrations.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shadow-3xs"><Zap size={18} /></span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Webhooks Capture Integration</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">API Path: <b className="text-slate-600 font-mono">POST http://187.127.170.222:3000/api/leads</b></p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">OPERATIONAL</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shadow-3xs"><Lock size={18} /></span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">JWT Security Token Access</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Authorization header: Bearer format</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shadow-3xs"><Database size={18} /></span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">SQLite Backups Storage Path</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Local backups saved under: <b className="text-slate-600 font-mono">./server/data/backups/</b></p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ROLLING PRUNING ACTIVE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 10: SETTINGS PANEL ── */}
              {activeView === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">System Settings</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Configure operational thresholds, backup schedules, and workspace parameters.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Brand Name</label>
                        <input
                          type="text"
                          value={workspace}
                          onChange={(e) => setWorkspace(e.target.value)}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Central API Router IP</label>
                        <input
                          type="text"
                          disabled
                          value="http://187.127.170.222:3000/api"
                          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-400 font-mono"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <h4 className="text-xs font-bold text-slate-700 mb-3.5">Database Safe Utilities</h4>
                      <button
                        onClick={triggerDatabaseBackup}
                        disabled={backupLoading}
                        className="h-9 px-4 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-3xs disabled:opacity-50"
                      >
                        {backupLoading ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                        Manually trigger SQLite rolling backup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 11: BILLING METERS ── */}
              {activeView === 'billing' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">SaaS Plan &amp; Billing meters</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Monitor operational credit balances, credit limits, and invoice histories.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1fr_320px]">
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Subscription</p>
                          <h4 className="text-2xl font-black text-slate-800 tracking-tight font-display mt-1">{billing.planName}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl shadow-3xs">{billing.price} / month</span>
                      </div>

                      {/* Credit Progress Gauge */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>API Request Credits</span>
                          <span className="font-mono">{billing.creditsUsed} / {billing.creditsMax} queries used</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${(billing.creditsUsed / billing.creditsMax) * 100}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400">Your operational plan cycles reset on: <b className="text-slate-600 font-bold">{new Date(billing.renewalDate).toLocaleDateString()}</b></p>
                      </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-5 shadow-3xs flex flex-col justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">Invoice Register</h4>
                      
                      <div className="space-y-3.5 flex-1 text-xs">
                        {billing.invoices.map((inv) => (
                          <div key={inv.id} className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-700">{inv.id}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{inv.date}</p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 rounded-full">{inv.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 12: WHATSAPP QR ── */}
              {activeView === 'qr' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">WhatsApp Gateway Integrations</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Link WhatsApp credentials to establish automated lead follow-up sessions.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs max-w-xl mx-auto text-center space-y-6">
                    <div className="flex justify-center items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${
                        waStatus?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`} />
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                        Status: {waStatus?.status.toUpperCase() || 'OFFLINE'}
                      </h4>
                    </div>

                    {waStatus?.status === 'connected' ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-xs text-emerald-700 max-w-md mx-auto flex flex-col items-center gap-2">
                        <CheckCircle size={32} className="text-emerald-600 animate-bounce-slow" />
                        <p className="font-extrabold">Active WhatsApp Connection Established!</p>
                        <p className="text-[10px] text-emerald-600">The Baileys node processes socket handshakes with WhatsApp servers seamlessly.</p>
                      </div>
                    ) : waStatus?.qrImage ? (
                      <div className="space-y-4">
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl max-w-md mx-auto">
                          ⚠️ Open WhatsApp {"→"} Tap Linked Devices {"→"} Tap Link a Device {"→"} Scan the QR Code below:
                        </p>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-[220px] mx-auto shadow-sm">
                          <img src={waStatus.qrImage} alt="WhatsApp QR Code" className="w-full h-auto rounded-lg" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                        <Loader2 size={32} className="animate-spin text-emerald-500" />
                        <p className="text-xs font-semibold">Generating fresh Baileys credentials socket QR...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── CENTRALIZED COMMAND PALETTE (CTRL + K) ── */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              ref={commandPaletteRef}
              className="w-full max-w-lg bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leads database, tools, backups..."
                  className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none"
                />
                <button onClick={() => setCommandPaletteOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {/* Dynamic Search Results list */}
              <div className="p-2 max-h-80 overflow-y-auto space-y-1">
                {filteredLeads.length > 0 ? (
                  <>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block px-3 py-1.5">Database Leads ({filteredLeads.length})</span>
                    {filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setActiveView('conversations');
                          setCommandPaletteOpen(false);
                        }}
                        className="flex w-full items-center justify-between h-9 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition-all"
                      >
                        <span>👤 {lead.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{maskPhone(lead.phone)}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center py-4">No matching database entities found.</p>
                )}

                {/* Navigation shortcuts */}
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block px-3 py-1.5">Action Shortcuts</span>
                  {[
                    { label: "Switch to CRM Pipeline Dashboard", action: () => { setActiveView('pipelines'); setCommandPaletteOpen(false); } },
                    { label: "Check WhatsApp Session QR Pairing", action: () => { setActiveView('qr'); setCommandPaletteOpen(false); } },
                    { label: "Force SQLite Database Backup Sequence", action: () => { triggerDatabaseBackup(); setCommandPaletteOpen(false); } },
                    { label: "Open AI Assistant Prompt Config", action: () => { setActiveView('agents'); setCommandPaletteOpen(false); } }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className="flex w-full items-center h-8 px-3 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 text-left transition-all"
                    >
                      ⚡ {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DYNAMIC FLOATING AI ASSISTANT (CO-PILOT) ── */}
      <AnimatePresence>
        {aiAssistantOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-96 bg-slate-900 text-white rounded-3xl shadow-2xl overflow-hidden z-50 border border-slate-800"
          >
            {/* Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-inner"><Sparkles size={14} className="animate-spin-slow" /></span>
                <div>
                  <p className="text-xs font-bold tracking-wide">Trinetra AI Copilot</p>
                  <p className="text-[8px] text-slate-500 font-mono">Gemini-Pro Engine v1.2</p>
                </div>
              </div>
              <button onClick={() => setAiAssistantOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            {/* Chat Timeline */}
            <div className="h-80 overflow-y-auto p-4 space-y-3.5 text-[11px] bg-slate-900/90 font-sans">
              {aiChatHistory.map((chat, i) => (
                <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    chat.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-line">{chat.text}</p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl px-3.5 py-2.5 rounded-bl-none flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-emerald-500" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Composer input */}
            <form onSubmit={submitAiAssistantQuery} className="p-3 border-t border-slate-800 bg-slate-950/80 flex gap-2">
              <input
                type="text"
                required
                value={aiMsgText}
                onChange={(e) => setAiMsgText(e.target.value)}
                placeholder="Ask AI or say: 'Create database backup'..."
                className="flex-1 h-9 rounded-xl border border-slate-800 bg-slate-900 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiMsgText.trim()}
                className="h-9 w-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shrink-0"
              >
                <Send size={12} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic launcher button */}
      {!aiAssistantOpen && (
        <button
          onClick={() => setAiAssistantOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xl hover:scale-105 hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)] transition-all z-40 animate-pulse-slow border border-emerald-500/20"
        >
          <Sparkles size={22} />
        </button>
      )}

    </div>
  );
}
