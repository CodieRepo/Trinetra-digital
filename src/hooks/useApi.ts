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

const MOCK_CAMPAIGNS: Campaign[] = [];

const MOCK_WORKFLOWS: AutomationWorkflow[] = [];

const MOCK_AGENTS: AIAgent[] = [];

const MOCK_BILLING: BillingData = {
  planName: "SaaS Enterprise Scale",
  price: "$149/mo",
  status: "active",
  creditsUsed: 0,
  creditsMax: 10000,
  renewalDate: "2026-06-25T00:00:00.000Z",
  invoices: []
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
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; details: string | null; timestamp: string }>>([]);
  
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

      // Fetch Live Audit Logs
      try {
        const audits = await apiService.analytics.getAuditLogs();
        setAuditLogs(audits);
      } catch (auditErr) {
        // Safe fallback if endpoint is not loaded yet
      }

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
    auditLogs,
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
