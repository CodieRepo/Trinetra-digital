// Trinetra Next-Gen AI SaaS Platform API Service Layer
// Dynamic Environment Base Binding to high-fidelity VPS host

export const API_BASE_URL = 
  (import.meta as any).env?.VITE_API_BASE_URL || 
  "http://187.127.170.222:3000/api" || 
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
  notes: string | null;
  created_at: string;
  updated_at: string;
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
    
    if (response.status === 401) {
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
    get: async (id: string) => request<{ lead: Lead; chats: ChatMessage[] }>(`/leads/${id}`),
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
    })
  },

  // WhatsApp Operations
  whatsapp: {
    status: async () => request<{ status: 'disconnected' | 'connecting' | 'connected'; qr: string | null; qrImage: string | null }>("/whatsapp/status")
  },

  // Analytics Operations
  analytics: {
    get: async () => request<AnalyticsData>("/analytics")
  },

  // Health and Telemetry
  health: {
    get: async () => request<SystemHealth>("/health")
  }
};
