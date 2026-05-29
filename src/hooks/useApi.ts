import { useState, useEffect, useCallback } from "react";
import { 
  apiService, 
  Lead, 
  ChatMessage, 
  AnalyticsData, 
  SystemHealth, 
  Campaign, 
  AutomationWorkflow, 
  AIAgent, 
  BillingData 
} from "../services/api";

// ── 1. Mock Data Generators for Futuristic Sections ───────────────────────

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-1",
    name: "Automated Pharmacy Batch Refill Reminder",
    targetGroup: "Active Prescription Leads",
    status: "completed",
    sentCount: 145,
    deliveredCount: 142,
    readCount: 134,
    scheduledAt: "2026-05-28T09:00:00.000Z",
    body: "Hi Aarav! This is Sharma Medicos. Your recurring batch pharmacy refill is ready for dispatch. Confirm by replying YES!"
  },
  {
    id: "camp-2",
    name: "Real Estate VIP Lead Nurture Broadcast",
    targetGroup: "Property Inquiries Gorakhpur",
    status: "sending",
    sentCount: 98,
    deliveredCount: 92,
    readCount: 45,
    scheduledAt: "2026-05-28T16:30:00.000Z",
    body: "Hello! We just launched a premium residential wing in Gupta Builders. Real-time digital brochures are attached. Reply for details!"
  },
  {
    id: "camp-3",
    name: "Vite AI-CRM Software Trial Upgrade Alert",
    targetGroup: "14-Day Nurturing Sequence",
    status: "draft",
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    scheduledAt: "2026-05-29T10:00:00.000Z",
    body: "Hi Priya! Your AI automation command trial expires in 3 days. Unlock next-gen workflow nodes now with premium credits!"
  }
];

const MOCK_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: "flow-1",
    name: "Web Capture Lead Autopilot Sequence",
    trigger: "Contact Form Submit",
    status: "active",
    nodesCount: 5,
    connectionsCount: 4,
    lastTriggeredAt: "2026-05-28T16:40:00Z"
  },
  {
    id: "flow-2",
    name: "Conversational Intent Qualification Loop",
    trigger: "WhatsApp Message Inbound",
    status: "active",
    nodesCount: 7,
    connectionsCount: 6,
    lastTriggeredAt: "2026-05-28T17:15:00Z"
  },
  {
    id: "flow-3",
    name: "Offline Recovery Alarm Handler",
    trigger: "GET /health offline status",
    status: "paused",
    nodesCount: 3,
    connectionsCount: 2,
    lastTriggeredAt: "2026-05-27T12:00:00Z"
  }
];

const MOCK_AGENTS: AIAgent[] = [
  {
    id: "agent-1",
    name: "Gemini qualification Core",
    role: "Lead Scoring & Budget Verification",
    status: "active",
    confidenceThreshold: 80,
    totalConversations: 124,
    accuracyRate: 94.2,
    prompt: "You are the head AI analyst at Trinetra. Assess lead details, calculate budget parameters, assign score out of 100, and generate suggested followups."
  },
  {
    id: "agent-2",
    name: "Conversational Setter Bot",
    role: "Meeting Scheduler & Lead Intake",
    status: "learning",
    confidenceThreshold: 65,
    totalConversations: 54,
    accuracyRate: 88.5,
    prompt: "Coordinate pharmacy demo calls. Secure dates, match timing guidelines, and hand off to human executive on anomalies."
  }
];

const MOCK_BILLING: BillingData = {
  planName: "SaaS Enterprise Scale",
  price: "$149/mo",
  status: "active",
  creditsUsed: 4620,
  creditsMax: 10000,
  renewalDate: "2026-06-25T00:00:00.000Z",
  invoices: [
    { id: "inv-903", date: "May 25, 2026", amount: "$149.00", status: "paid" },
    { id: "inv-802", date: "Apr 25, 2026", amount: "$149.00", status: "paid" },
    { id: "inv-701", date: "Mar 25, 2026", amount: "$149.00", status: "paid" }
  ]
};

// ── 2. Master Dashboard Hook ────────────────────────────────────────────────

export function useDashboard() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("trinetra_jwt"));
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Live CRM State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [waStatus, setWaStatus] = useState<{ status: 'disconnected' | 'connecting' | 'connected'; qr: string | null; qrImage: string | null } | null>(null);
  const [healthTelemetry, setHealthTelemetry] = useState<SystemHealth | null>(null);
  
  // Realtime Active Lead detail & Chat Timeline
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetail, setLeadDetail] = useState<{ lead: Lead; chats: ChatMessage[] } | null>(null);
  
  // Futuristic SaaS Mock Sections
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(MOCK_WORKFLOWS);
  const [agents, setAgents] = useState<AIAgent[]>(MOCK_AGENTS);
  const [billing, setBilling] = useState<BillingData>(MOCK_BILLING);

  // Indicators
  const [refreshing, setRefreshing] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [latestApiError, setLatestApiError] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [lastSuccessTime, setLastSuccessTime] = useState<string | null>(null);

  // Dynamic Login handler
  const login = async (username: string, password: string): Promise<boolean> => {
    setLoginError("");
    setLoginLoading(true);
    try {
      const response = await apiService.auth.login(username, password);
      localStorage.setItem("trinetra_jwt", response.token);
      setToken(response.token);
      return true;
    } catch (err: any) {
      setLoginError(err.message || "Failed to establish connection. Server is offline.");
      return false;
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem("trinetra_jwt");
    setToken(null);
    setLeads([]);
    setAnalytics(null);
    setSelectedLeadId(null);
    setLeadDetail(null);
  }, []);

  // Fetch Global Command metrics
  const fetchGlobalMetrics = useCallback(async () => {
    const activeToken = localStorage.getItem("trinetra_jwt");
    if (!activeToken) return;
    try {
      // 1. Health & Server telemetries
      try {
        const health = await apiService.health.get();
        setHealthTelemetry(health);
        setBackendOnline(true);
      } catch (healthErr) {
        // Handled globally if endpoint is absent in legacy backend
      }

      // 2. Fetch Active Leads
      const leadsList = await apiService.leads.list();
      setLeads(leadsList);

      // 3. Fetch CRM Analytics graphs
      const analyticsData = await apiService.analytics.get();
      setAnalytics(analyticsData);

      // 4. Fetch WhatsApp Gateway Pairing
      const wa = await apiService.whatsapp.status();
      setWaStatus(wa);

      setBackendOnline(true);
      setLastSuccessTime(new Date().toLocaleTimeString());
    } catch (error: any) {
      console.error("command fetch query failed:", error);
      setBackendOnline(false);
      setLatestApiError(`[NETWORK] Connection timed out checking server API base endpoints.`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Manual WhatsApp Dispatcher
  const sendManualMessage = async (leadId: string, body: string): Promise<boolean> => {
    if (!token) return false;
    try {
      await apiService.leads.sendMessage(leadId, body);
      // Fast refresh lead context
      const freshDetail = await apiService.leads.get(leadId);
      setLeadDetail(freshDetail);
      return true;
    } catch (err: any) {
      setLatestApiError(`[GATEWAY] ${err.message || 'Failed sending WhatsApp message'}`);
      return false;
    }
  };

  // Dynamic Pipeline Move status
  const updateLeadStatus = async (leadId: string, newStatus: Lead['status']): Promise<boolean> => {
    if (!token) return false;
    try {
      await apiService.leads.update(leadId, { status: newStatus });
      // Update local states immediately for responsiveness
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      if (leadDetail && leadDetail.lead.id === leadId) {
        setLeadDetail(prev => prev ? { ...prev, lead: { ...prev.lead, status: newStatus } } : null);
      }
      return true;
    } catch (err: any) {
      setLatestApiError(`[DATABASE] ${err.message || 'Failed updating status'}`);
      return false;
    }
  };

  // SQLite Database Backup trigger
  const triggerDatabaseBackup = async (): Promise<boolean> => {
    if (!token) return false;
    setBackupLoading(true);
    try {
      const response = await apiService.leads.createBackup();
      if (response.success) {
        setLastSuccessTime(new Date().toLocaleTimeString());
        return true;
      }
      return false;
    } catch (err: any) {
      setLatestApiError(`[DATABASE] ${err.message || 'SQLite backup failed'}`);
      return false;
    } finally {
      setBackupLoading(false);
    }
  };

  // Refresh Command telemetry
  const triggerRefresh = () => {
    if (token) {
      setRefreshing(true);
      fetchGlobalMetrics();
    }
  };

  // ⏰ Periodic Sync telemetries
  useEffect(() => {
    if (token) {
      fetchGlobalMetrics();
      const timer = setInterval(() => fetchGlobalMetrics(), 10000);
      return () => clearInterval(timer);
    }
  }, [token, fetchGlobalMetrics]);

  // ⏰ Conversational chat polling sequence (Fast Poller: 3.5s)
  useEffect(() => {
    if (selectedLeadId && token) {
      const queryLeadDetail = async () => {
        try {
          const detail = await apiService.leads.get(selectedLeadId);
          setLeadDetail(detail);
        } catch (err) {
          console.error("fast poll active chat query failure:", err);
        }
      };

      queryLeadDetail();
      const timer = setInterval(queryLeadDetail, 3500);
      return () => clearInterval(timer);
    } else {
      setLeadDetail(null);
    }
  }, [selectedLeadId, token]);

  // Catch Auth Expired notifications
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      setLoginError("Your session key expired. Re-authenticate, please.");
    };
    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, [logout]);

  return {
    token,
    login,
    logout,
    loginLoading,
    loginError,
    
    // Core states
    leads,
    analytics,
    waStatus,
    healthTelemetry,
    selectedLeadId,
    setSelectedLeadId,
    leadDetail,
    
    // Custom SaaS states
    campaigns,
    setCampaigns,
    workflows,
    setWorkflows,
    agents,
    setAgents,
    billing,
    setBilling,
    
    // Status indicators
    refreshing,
    backendOnline,
    latestApiError,
    backupLoading,
    lastSuccessTime,
    
    // Operations
    sendManualMessage,
    updateLeadStatus,
    triggerDatabaseBackup,
    triggerRefresh
  };
}
