// Trinetra Next-Gen AI SaaS Platform API Service Layer
// Dynamic Environment Base Binding to high-fidelity VPS host

export const API_BASE_URL = 
  (import.meta as any).env?.VITE_API_BASE_URL || 
  "/api";

// ── 1. High-Fidelity Type Definitions ──────────────────────────────────────

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  service: string | null;
  source: string;
  status: 'new' | 'ai_qualifying' | 'qualified' | 'nurturing' | 'won' | 'lost';
  ai_score: number;
  ai_budget: boolean;
  ai_summary: string | null;
  ai_summary_detailed: string | null;
  intent_level: 'HOT' | 'WARM' | 'COLD' | 'QUOTATION_REQUIRED' | null;
  recommended_action: string | null;
  ai_enabled: number; // 0 = disabled, 1 = enabled
  notes: string | null;
  lead_tags?: string;
  budget_range?: string | null;
  urgency_level?: string | null;
  business_type?: string | null;
  recommended_package?: string | null;
  lead_stage?: string;
  // Phase 4B: Pipeline & Revenue Forecasting
  deal_probability?: number;
  deal_setup_value?: number;
  deal_mrr?: number;
  deal_annual_value?: number;
  stage_entered_at?: string | null;
  pipeline_notes?: string | null;
  assigned_owner?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineLead extends Lead {
  lead_stage: string;
  deal_probability: number;
  deal_setup_value: number;
  deal_mrr: number;
  deal_annual_value: number;
  expected_revenue: number;
  stage_entered_at: string | null;
  days_in_stage: number;
  pipeline_notes: string | null;
  assigned_owner: string | null;
  last_inbound_at: string | null;
  days_since_reply: number;
  is_stuck_7d: boolean;
  is_stuck_14d: boolean;
  is_no_reply_30d: boolean;
}

export interface PipelineStageGroup {
  stage: string;
  label: string;
  leads: PipelineLead[];
  lead_count: number;
  total_pipeline_value: number;
  total_expected_revenue: number;
}

export interface ForecastData {
  period: string;
  pipeline_value: number;
  expected_revenue: number;
  won_revenue: number;
  lost_revenue: number;
  avg_deal_size: number;
  avg_sales_cycle_days: number;
  win_rate: number;
  total_leads_in_pipeline: number;
  leads_moved_to_won: number;
  leads_moved_to_lost: number;
}

export interface PipelineAuditEntry {
  id: string;
  lead_id: string;
  old_stage: string;
  new_stage: string;
  changed_by: string;
  reason: string | null;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  lead_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: 'sent' | 'read' | 'failed' | 'pending';
  timestamp: string;
}

export interface SystemHealth {
  status: 'ok' | 'error';
  db: 'connected' | 'disconnected' | 'error';
  whatsapp: 'connected' | 'connecting' | 'disconnected' | 'error';
  system: {
    uptime: string;
    ramUsed: string;
    ramAllocated: string;
  };
  timestamp: string;
}

export interface AnalyticsSummary {
  totalLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  leadsToday: number;
  conversionRate: number;
  avgResponseTime: string;
}

export interface PipelineStage {
  label: string;
  value: number;
  color: string;
  pct: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  pipeline: PipelineStage[];
  monthlyPerformances?: Array<{ month: string; leadsCount: number; conversion: number }>;
  recentActivity?: Array<{ id: string; action: string; details: string | null; timestamp: string }>;
}

export interface Campaign {
  id: string;
  name: string;
  targetGroup: string;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  scheduledAt: string;
  body: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  trigger: string;
  status: 'active' | 'paused';
  nodesCount: number;
  connectionsCount: number;
  lastTriggeredAt: string;
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'learning' | 'paused';
  confidenceThreshold: number;
  totalConversations: number;
  accuracyRate: number;
  prompt: string;
}

export interface BillingInvoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
}

export interface BillingData {
  planName: string;
  price: string;
  status: 'active' | 'past_due' | 'cancelled';
  creditsUsed: number;
  creditsMax: number;
  renewalDate: string;
  invoices: BillingInvoice[];
}

export interface Task {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  type: 'HUMAN_HANDOFF_TASK' | 'QUOTATION_TASK' | 'APPOINTMENT_TASK' | 'FOLLOWUP_REMINDER';
  due_at: string | null;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  lead_id: string;
  event_type: 'inbound' | 'outbound' | 'ai_action' | 'human_action' | 'stage_change';
  description: string;
  timestamp: string;
}

export interface Quotation {
  id: string;
  lead_id: string;
  package_tier: 'starter_presence' | 'growth_engine' | 'sales_system' | 'business_os' | 'custom';
  package_name: string;
  line_items: string; // JSON string of { description: string; price: number }[]
  setup_cost: number;
  monthly_cost: number;
  discount_pct: number;
  total_setup: number;
  total_monthly: number;
  currency: string;
  validity_days: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  version: number;
  parent_quotation_id: string | null;
  expiry_task_created: number;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
  notes: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  // Computed by server on response
  expiry?: {
    expiresAt: string;
    daysRemaining: number;
    isExpired: boolean;
  };
}

export interface AppointmentSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  duration_mins: number;
  is_available: number;
  booked_by_lead_id: string | null;
  booked_by_lead_name?: string | null;
}

export interface Appointment {
  id: string;
  lead_id: string;
  lead_name?: string;
  lead_phone?: string;
  lead_company?: string;
  lead_service?: string;
  lead_score?: number;
  requested_at: string;
  preferred_date: string;
  preferred_time: string;
  call_type: 'call' | 'video' | 'in_person';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  admin_notes: string | null;
  confirmed_at: string | null;
  reminder_sent: number;
  meeting_link: string | null;
  deal_value: number | null;
  created_at: string;
}

// ── 2. Unified API Client Fetch Wrapper ────────────────────────────────────

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const jwt = localStorage.getItem("trinetra_jwt");
  
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (jwt) {
    headers.set("Authorization", `Bearer ${jwt}`);
  }

  let url = `${API_BASE_URL}${path}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401 || response.status === 403) {
      console.warn(`[AUTH EXPIRED] Endpoint ${url} returned ${response.status}. Clearing token.`);
      localStorage.removeItem("trinetra_jwt");
      window.dispatchEvent(new Event("auth-expired"));
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || errorBody.message || `API Error: Status ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`🚨 API Request Failure [${options.method || 'GET'} ${path}]:`, error);
    throw error;
  }
}

// ── 3. High-Fidelity Service Methods ────────────────────────────────────────

export const apiService = {
  // Authentication
  auth: {
    login: async (username: string, password: string) => {
      return request<{ token: string; user: { id: string; username: string; role: string } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username, password })
        }
      );
    }
  },

  // Leads CRM Operations
  leads: {
    list: async () => request<Lead[]>("/leads"),
    get: async (id: string) => request<{ lead: Lead; chats: ChatMessage[]; followup: any | null }>(`/leads/${id}`),
    create: async (data: Partial<Lead>) => request<{ success: boolean; leadId: string }>("/leads", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    update: async (id: string, updates: Partial<Lead>) => request<{ success: boolean }>((`/leads/${id}`), {
      method: "PATCH",
      body: JSON.stringify(updates)
    }),
    sendMessage: async (leadId: string, body: string) => request<{ success: boolean }>(`/leads/${leadId}/message`, {
      method: "POST",
      body: JSON.stringify({ body })
    }),
    createBackup: async () => request<{ success: boolean; filename: string }>("/leads/backup", {
      method: "POST"
    }),
    getTasks: async (leadId: string) => request<{ success: boolean; data: Task[] }>(`/leads/${leadId}/tasks`),
    createTask: async (leadId: string, data: { title: string; type: string; description?: string; due_at?: string }) =>
      request<{ success: boolean; data: Task }>(`/leads/${leadId}/tasks`, {
        method: "POST",
        body: JSON.stringify(data)
      }),
    updateTask: async (taskId: string, status: string) =>
      request<{ success: boolean }>(`/leads/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    getTimeline: async (leadId: string) => request<{ success: boolean; data: TimelineEvent[] }>(`/leads/${leadId}/timeline`)
  },

  // Quotations
  quotations: {
    list: async (leadId?: string) => request<Quotation[]>("/quotations", { params: leadId ? { lead_id: leadId } : undefined }),
    get: async (id: string) => request<Quotation>(`/quotations/${id}`),
    create: async (data: {
      lead_id: string;
      package_tier: string;
      custom_items?: Array<{ description: string; price: number }>;
      discount_pct?: number;
      notes?: string;
    }) => request<Quotation>("/quotations", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    send: async (id: string) => request<{ success: boolean; message: string }>(`/quotations/${id}/send`, { method: "POST" }),
    accept: async (id: string) => request<{ success: boolean; message: string }>(`/quotations/${id}/accept`, { method: "POST" }),
    reject: async (id: string, reason?: string) => request<{ success: boolean; message: string }>(`/quotations/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }),
    revise: async (id: string, data: { discount_pct?: number; notes?: string; custom_items?: Array<{ description: string; price: number }> }) =>
      request<Quotation & { message: string }>(`/quotations/${id}/revise`, {
        method: "POST",
        body: JSON.stringify(data)
      }),
    getVersionChain: async (id: string) => request<Quotation[]>(`/quotations/${id}/versions`),
    getStats: async () => request<{
      draft: number;
      sent: number;
      viewed: number;
      accepted: number;
      rejected: number;
      expired: number;
      totalRevenue: number;
      totalPipeline: number;
    }>("/quotations/conversion-stats")
  },

  // Appointments / Slots
  appointments: {
    list: async (status?: string) => request<{ appointments: Appointment[]; total: number }>("/appointments", { params: status ? { status } : undefined }),
    create: async (data: {
      lead_id: string;
      preferred_date?: string;
      preferred_time?: string;
      call_type?: string;
      notes?: string;
    }) => request<{ id: string; message: string }>("/appointments", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    update: async (id: string, updates: Partial<Appointment>) => request<{ message: string }>(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    }),
    cancel: async (id: string) => request<{ message: string }>(`/appointments/${id}`, { method: "DELETE" }),
    confirm: async (id: string, data: { meeting_link?: string; admin_notes?: string }) => request<{ message: string }>(`/appointments/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
    complete: async (id: string, data: { deal_value?: number }) => request<{ message: string }>(`/appointments/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
    getSlots: async () => request<AppointmentSlot[]>("/appointments/slots"),
    createSlot: async (data: { slot_date: string; slot_time: string; duration_mins?: number }) => request<{ id: string; message: string }>("/appointments/slots", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    deleteSlot: async (id: string) => request<{ message: string }>(`/appointments/slots/${id}`, { method: "DELETE" }),
    getCalendar: async () => request<{ appointments: Appointment[]; slots: AppointmentSlot[] }>("/appointments/calendar"),
    getStats: async () => request<{ booked: number; completed: number; revenueValue: number }>("/appointments/conversion-stats")
  },

  // WhatsApp Operations
  whatsapp: {
    status: async () => request<{
      status: 'connected' | 'connecting' | 'qr_required' | 'logged_out' | 'auth_failed' | 'intervention_required' | 'disconnected';
      qr: string | null;
      qrImage: string | null;
      lastInboundMessageTimestamp?: string | null;
      lastOutboundMessageTimestamp?: string | null;
      lastSuccessfulDeliveryTimestamp?: string | null;
      pendingQueueCount?: number;
      failedQueueCount?: number;
      reconnectCount?: number;
      activeAiProvider?: string;
      disconnectReason?: string | null;
      healthScore?: number;
      connectedAt?: string | null;
      uptime?: number | null;
      sessionAge?: string | null;
    }>("/whatsapp/status"),
    restart: async () => request<{ success: boolean }>("/whatsapp/restart", {
      method: "POST"
    }),
    listBackups: async () => request<Array<{ name: string; timestamp: string; reason: string; connectionStatus: string }>>("/whatsapp/backups"),
    rollback: async (backupDirName: string) => request<{ success: boolean }>("/whatsapp/rollback", {
      method: "POST",
      body: JSON.stringify({ backupDirName })
    })
  },

  // Analytics Operations
  analytics: {
    get: async () => request<AnalyticsData>("/analytics"),
    getAuditLogs: async () => request<Array<{ id: string; action: string; details: string | null; timestamp: string }>>("/analytics/audit")
  },

  // Pipeline — Phase 4B
  pipeline: {
    getBoard: async () => request<PipelineStageGroup[]>("/leads/pipeline"),
    getForecast: async (period: 'month' | 'quarter' | 'year' = 'month') =>
      request<ForecastData>(`/leads/pipeline/forecast?period=${period}`),
    moveStage: async (leadId: string, stage: string, reason?: string) =>
      request<{ success: boolean; message: string }>(`/leads/${leadId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage, reason })
      }),
    updateProbability: async (leadId: string, probability: number) =>
      request<{ success: boolean; message: string }>(`/leads/${leadId}/probability`, {
        method: "PATCH",
        body: JSON.stringify({ probability })
      }),
    updateDealValues: async (leadId: string, data: { setup_value?: number; mrr?: number }) =>
      request<{ success: boolean; deal_setup_value: number; deal_mrr: number; deal_annual_value: number }>(`/leads/${leadId}/deal-values`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    syncDealValues: async (leadId: string) =>
      request<{ success: boolean; message: string }>(`/leads/${leadId}/sync-deal-values`, { method: "POST" }),
    getAuditTrail: async (leadId: string) =>
      request<PipelineAuditEntry[]>(`/leads/${leadId}/pipeline-audit`),
  },

  // Health and Telemetry
  health: {
    get: async () => request<SystemHealth>("/health")
  }
};
