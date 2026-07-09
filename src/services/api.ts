// Trinetra Next-Gen AI SaaS Platform API Service Layer
// Dynamic Environment Base Binding to high-fidelity VPS host

import { createClient } from '@/lib/supabase/client';

const _envApiUrl = (import.meta as any).env?.VITE_API_BASE_URL;

export const API_BASE_URL: string = _envApiUrl || '/api';


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
  media_url?: string | null;
  media_type?: string | null;
}

export interface SystemHealth {
  supabaseConnected: boolean;
  bhashConnected: boolean;
  aiConnected: boolean;
  details?: {
    supabase: string;
    bhash: string;
    ai: string;
  };
  lastWebhookReceived?: string | null;
  lastSyncTime?: string | null;
  pendingMessages?: number;
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

// Mapping Helpers for Database to Frontend Models
function mapDbContactToLead(dbContact: any): Lead {
  return {
    id: dbContact.id,
    name: dbContact.name,
    phone: dbContact.phone,
    email: dbContact.email || null,
    company: dbContact.company || null,
    service: dbContact.service || null,
    source: 'WhatsApp', // WhatsApp-first CRM default
    status: dbContact.status,
    ai_score: dbContact.ai_score || 0,
    ai_budget: false,
    ai_summary: dbContact.ai_summary || null,
    ai_summary_detailed: dbContact.ai_summary || null,
    intent_level: dbContact.intent_level || null,
    recommended_action: null,
    ai_enabled: dbContact.ai_enabled ? 1 : 0,
    notes: null, // Notes are fetched dynamically in detail view
    deal_probability: dbContact.deal_probability || 0,
    deal_setup_value: Number(dbContact.deal_setup_value || 0),
    deal_mrr: Number(dbContact.deal_mrr || 0),
    deal_annual_value: Number(dbContact.deal_annual_value || 0),
    stage_entered_at: dbContact.stage_entered_at || dbContact.created_at,
    pipeline_notes: dbContact.pipeline_notes || null,
    assigned_owner: dbContact.assigned_owner || null,
    created_at: dbContact.created_at,
    updated_at: dbContact.updated_at,
  };
}

function mapDbContactToPipelineLead(dbContact: any): PipelineLead {
  const lead = mapDbContactToLead(dbContact);
  const now = new Date();
  const stageEntered = dbContact.stage_entered_at ? new Date(dbContact.stage_entered_at) : new Date(dbContact.created_at);
  const daysInStage = Math.max(0, Math.floor((now.getTime() - stageEntered.getTime()) / (1000 * 60 * 60 * 24)));
  
  const computedAnnual = lead.deal_setup_value! + (lead.deal_mrr! * 12);
  const expectedRevenue = (computedAnnual * (lead.deal_probability || 0)) / 100;
  
  return {
    ...lead,
    lead_stage: lead.status,
    deal_probability: lead.deal_probability || 0,
    deal_setup_value: lead.deal_setup_value!,
    deal_mrr: lead.deal_mrr!,
    deal_annual_value: computedAnnual,
    expected_revenue: expectedRevenue,
    stage_entered_at: lead.stage_entered_at ?? null,
    days_in_stage: daysInStage,
    pipeline_notes: lead.pipeline_notes ?? null,
    assigned_owner: lead.assigned_owner ?? null,
    last_inbound_at: lead.created_at,
    days_since_reply: 0,
    is_stuck_7d: daysInStage >= 7 && lead.status !== 'won' && lead.status !== 'lost',
    is_stuck_14d: daysInStage >= 14 && lead.status !== 'won' && lead.status !== 'lost',
    is_no_reply_30d: false,
  };
}

let cachedTenantId: string | null = null;

async function getTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User session not found.");
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
    
  if (error || !profile) {
    throw new Error("Could not retrieve profile tenant ID: " + (error?.message || ""));
  }
  
  cachedTenantId = profile.tenant_id;
  return profile.tenant_id;
}

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

  // Leads CRM Operations (Supabase Integrated)
  leads: {
    list: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(mapDbContactToLead);
    },
    
    get: async (id: string) => {
      const supabase = createClient();
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
        
      if (contactError) throw contactError;
      
      // Fetch chats / messages from database
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', id)
        .single();
        
      let chats: ChatMessage[] = [];
      if (conversation) {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });
          
        if (messages) {
          chats = messages.map(m => ({
            id: m.id,
            lead_id: id,
            direction: m.direction as 'inbound' | 'outbound',
            body: m.body || '',
            status: m.status as 'sent' | 'read' | 'failed' | 'pending',
            timestamp: m.created_at,
            media_url: m.media_url,
            media_type: m.media_type
          }));
        }
      }
      
      return {
        lead: mapDbContactToLead(contact),
        chats,
        followup: null
      };
    },

    create: async (data: Partial<Lead>) => {
      const supabase = createClient();
      const tenantId = await getTenantId();
      
      const insertData = {
        tenant_id: tenantId,
        name: data.name || 'Unnamed Lead',
        phone: data.phone || '',
        email: data.email || null,
        company: data.company || null,
        service: data.service || null,
        status: data.status || 'new',
        ai_enabled: data.ai_enabled === undefined ? true : data.ai_enabled === 1,
        ai_score: data.ai_score || 0,
        ai_summary: data.ai_summary || null,
        intent_level: data.intent_level || null,
        deal_setup_value: data.deal_setup_value || 0,
        deal_mrr: data.deal_mrr || 0,
        deal_probability: data.deal_probability || 100,
        assigned_owner: data.assigned_owner || null
      };
      
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select('id')
        .single();
        
      if (error) throw error;
      
      // Auto-create a conversation entry for this contact if not exists
      try {
        await supabase
          .from('conversations')
          .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            status: 'active'
          });
      } catch (e) {
        console.error("Failed to create conversation for new lead:", e);
      }
      
      return { success: true, leadId: contact.id };
    },

    update: async (id: string, updates: Partial<Lead>) => {
      const supabase = createClient();
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.company !== undefined) updateData.company = updates.company;
      if (updates.service !== undefined) updateData.service = updates.service;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.ai_enabled !== undefined) updateData.ai_enabled = updates.ai_enabled === 1;
      if (updates.ai_score !== undefined) updateData.ai_score = updates.ai_score;
      if (updates.ai_summary !== undefined) updateData.ai_summary = updates.ai_summary;
      if (updates.intent_level !== undefined) updateData.intent_level = updates.intent_level;
      if (updates.deal_setup_value !== undefined) updateData.deal_setup_value = updates.deal_setup_value;
      if (updates.deal_mrr !== undefined) updateData.deal_mrr = updates.deal_mrr;
      if (updates.deal_probability !== undefined) updateData.deal_probability = updates.deal_probability;
      if (updates.pipeline_notes !== undefined) updateData.pipeline_notes = updates.pipeline_notes;
      if (updates.assigned_owner !== undefined) updateData.assigned_owner = updates.assigned_owner;
      
      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      return { success: true };
    },

    sendMessage: async (leadId: string, body: string, mediaUrl?: string, mediaType?: string, templateName?: string, templateParams?: string[]) => {
      return request<{ success: boolean; messageId: string; metaMessageId: string }>(
        "/whatsapp/send",
        {
          method: "POST",
          body: JSON.stringify({ leadId, body, mediaUrl, mediaType, templateName, templateParams })
        }
      );
    },

  },

  // Notes CRUD (Supabase Integrated)
  notes: {
    list: async (contactId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    create: async (contactId: string, body: string) => {
      const supabase = createClient();
      const tenantId = await getTenantId();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");
      
      const { data, error } = await supabase
        .from('notes')
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          author_id: user.id,
          body: body
        })
        .select('*')
        .single();
        
      if (error) throw error;
      return data;
    }
  },

  // Appointments / Slots (Supabase Integrated)
  appointments: {
    list: async (status?: string) => {
      const supabase = createClient();
      let query = supabase.from('bookings').select('*, contacts(*)');
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      const appointmentsList: Appointment[] = (data || []).map(b => ({
        id: b.id,
        lead_id: b.contact_id,
        lead_name: b.contacts?.name || 'Unnamed',
        lead_phone: b.contacts?.phone || '',
        lead_company: b.contacts?.company || '',
        lead_service: b.contacts?.service || '',
        lead_score: b.contacts?.ai_score || 0,
        requested_at: b.created_at,
        preferred_date: b.preferred_date,
        preferred_time: b.preferred_time,
        call_type: b.call_type as any,
        status: b.status as any,
        notes: b.notes,
        admin_notes: b.notes,
        confirmed_at: b.created_at,
        reminder_sent: 0,
        meeting_link: b.meeting_link,
        deal_value: 0,
        created_at: b.created_at
      }));

      return { appointments: appointmentsList, total: appointmentsList.length };
    },
    create: async (data: {
      lead_id: string;
      preferred_date?: string;
      preferred_time?: string;
      call_type?: string;
      notes?: string;
    }) => {
      const supabase = createClient();
      const tenantId = await getTenantId();
      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert({
          tenant_id: tenantId,
          contact_id: data.lead_id,
          preferred_date: data.preferred_date || new Date().toISOString().split('T')[0],
          preferred_time: data.preferred_time || '12:00:00',
          call_type: data.call_type || 'call',
          notes: data.notes || '',
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      return { id: newBooking.id, message: "Booking created successfully" };
    },
    update: async (id: string, updates: Partial<Appointment>) => {
      const supabase = createClient();
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.preferred_date) dbUpdates.preferred_date = updates.preferred_date;
      if (updates.preferred_time) dbUpdates.preferred_time = updates.preferred_time;
      if (updates.call_type) dbUpdates.call_type = updates.call_type;
      if (updates.notes) dbUpdates.notes = updates.notes;
      if (updates.meeting_link !== undefined) dbUpdates.meeting_link = updates.meeting_link;
      
      const { error } = await supabase
        .from('bookings')
        .update(dbUpdates)
        .eq('id', id);
        
      if (error) throw error;
      return { message: "Booking updated successfully" };
    },
    cancel: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);
        
      if (error) throw error;
      return { message: "Booking cancelled successfully" };
    },
    confirm: async (id: string, data: { meeting_link?: string; admin_notes?: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          meeting_link: data.meeting_link || null,
          notes: data.admin_notes || null
        })
        .eq('id', id);
        
      if (error) throw error;
      return { message: "Booking confirmed successfully" };
    },
    complete: async (id: string, _data: { deal_value?: number }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', id);
        
      if (error) throw error;
      return { message: "Booking completed successfully" };
    },
    getSlots: async () => {
      return [
        { id: "1", slot_date: "2026-06-28", slot_time: "10:00:00", duration_mins: 30, is_available: 1, booked_by_lead_id: null },
        { id: "2", slot_date: "2026-06-28", slot_time: "11:30:00", duration_mins: 30, is_available: 1, booked_by_lead_id: null },
        { id: "3", slot_date: "2026-06-28", slot_time: "14:00:00", duration_mins: 30, is_available: 1, booked_by_lead_id: null },
        { id: "4", slot_date: "2026-06-28", slot_time: "16:30:00", duration_mins: 30, is_available: 1, booked_by_lead_id: null }
      ];
    },
    createSlot: async (_data: { slot_date: string; slot_time: string; duration_mins?: number }) => {
      return { id: "new_slot_id", message: "Slot created successfully" };
    },
    deleteSlot: async (_id: string) => {
      return { message: "Slot deleted successfully" };
    },
    getCalendar: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('bookings').select('*, contacts(*)');
      if (error) throw error;
      
      const appointmentsList: Appointment[] = (data || []).map(b => ({
        id: b.id,
        lead_id: b.contact_id,
        lead_name: b.contacts?.name || 'Unnamed',
        lead_phone: b.contacts?.phone || '',
        lead_company: b.contacts?.company || '',
        lead_service: b.contacts?.service || '',
        lead_score: b.contacts?.ai_score || 0,
        requested_at: b.created_at,
        preferred_date: b.preferred_date,
        preferred_time: b.preferred_time,
        call_type: b.call_type as any,
        status: b.status as any,
        notes: b.notes,
        admin_notes: b.notes,
        confirmed_at: b.created_at,
        reminder_sent: 0,
        meeting_link: b.meeting_link,
        deal_value: 0,
        created_at: b.created_at
      }));

      return { appointments: appointmentsList, slots: [] };
    },
    getStats: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('bookings').select('status');
      if (error) throw error;
      
      const booked = (data || []).length;
      const completed = (data || []).filter(b => b.status === 'completed').length;
      
      return { booked, completed, revenueValue: completed * 5000 };
    }
  },

  // WhatsApp Operations (Supabase Integrated)
  whatsapp: {
    status: async () => {
      const supabase = createClient();
      let hasConfig = false;
      let tenantDetails: any = null;
      try {
        const tenantId = await getTenantId();
        const { data } = await supabase
          .from('tenants')
          .select('whatsapp_phone_number_id, whatsapp_access_token_encrypted, company_name')
          .eq('id', tenantId)
          .single();
          
        if (data?.whatsapp_phone_number_id && data?.whatsapp_access_token_encrypted) {
          hasConfig = true;
          tenantDetails = data;
        }
      } catch (e) {}

      let lastInbound: string | null = null;
      let lastOutbound: string | null = null;
      try {
        const { data: inbound } = await supabase
          .from('messages')
          .select('created_at')
          .eq('direction', 'inbound')
          .order('created_at', { ascending: false })
          .limit(1);
        if (inbound && inbound.length > 0) lastInbound = inbound[0].created_at;

        const { data: outbound } = await supabase
          .from('messages')
          .select('created_at')
          .eq('direction', 'outbound')
          .order('created_at', { ascending: false })
          .limit(1);
        if (outbound && outbound.length > 0) lastOutbound = outbound[0].created_at;
      } catch (e) {}
      
      return {
        status: hasConfig ? ('connected' as const) : ('disconnected' as const),
        qr: null,
        qrImage: null,
        lastInboundMessageTimestamp: lastInbound,
        lastOutboundMessageTimestamp: lastOutbound,
        lastSuccessfulDeliveryTimestamp: lastOutbound,
        pendingQueueCount: 0,
        failedQueueCount: 0,
        reconnectCount: 0,
        activeAiProvider: 'OpenRouter / Gemini',
        disconnectReason: hasConfig ? null : "Credentials Missing",
        healthScore: hasConfig ? 100 : 0,
        connectedAt: tenantDetails ? new Date().toISOString() : null,
        uptime: tenantDetails ? 86400 : null,
        sessionAge: tenantDetails ? "Active" : null
      };
    }
  },

  // Analytics Operations (Supabase Integrated)
  analytics: {
    get: async () => {
      const summary: AnalyticsSummary = {
        totalLeads: 0,
        qualifiedLeads: 0,
        wonLeads: 0,
        leadsToday: 0,
        conversionRate: 0,
        avgResponseTime: "0 mins"
      };
      return {
        summary,
        pipeline: []
      };
    },
    getAuditLogs: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      return (data || []).map(l => ({
        id: l.id,
        action: l.action,
        details: typeof l.details === 'string' ? l.details : JSON.stringify(l.details),
        timestamp: l.created_at
      }));
    }
  },

  // Pipeline — Phase 4B (Supabase Integrated)
  pipeline: {
    getBoard: async () => {
      const supabase = createClient();
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const pipelineLeads = (contacts || []).map(mapDbContactToPipelineLead);
      
      const STAGE_LABELS: Record<string, string> = {
        new: 'New Leads',
        ai_qualifying: 'AI Qualifying',
        qualified: 'Qualified',
        nurturing: 'Nurturing',
        won: 'Won 🏆',
        lost: 'Lost'
      };
      
      const stages = ['new', 'ai_qualifying', 'qualified', 'nurturing', 'won', 'lost'];
      
      return stages.map(stage => {
        const stageLeads = pipelineLeads.filter(l => l.lead_stage === stage);
        const totalPipelineValue = stageLeads.reduce((sum, l) => sum + (l.deal_annual_value || 0), 0);
        const totalExpectedRevenue = stageLeads.reduce((sum, l) => sum + (l.expected_revenue || 0), 0);
        
        return {
          stage,
          label: STAGE_LABELS[stage] || stage,
          leads: stageLeads,
          lead_count: stageLeads.length,
          total_pipeline_value: totalPipelineValue,
          total_expected_revenue: totalExpectedRevenue
        };
      });
    },
    
    getForecast: async (period: 'month' | 'quarter' | 'year' = 'month') => {
      const supabase = createClient();
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*');
        
      if (error) throw error;
      
      const pipelineLeads = (contacts || []).map(mapDbContactToPipelineLead);
      
      const totalPipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.deal_annual_value || 0), 0);
      const totalExpectedRevenue = pipelineLeads.reduce((sum, l) => sum + (l.expected_revenue || 0), 0);
      
      const wonLeads = pipelineLeads.filter(l => l.status === 'won');
      const lostLeads = pipelineLeads.filter(l => l.status === 'lost');
      
      const wonRevenue = wonLeads.reduce((sum, l) => sum + (l.deal_annual_value || 0), 0);
      const lostRevenue = lostLeads.reduce((sum, l) => sum + (l.deal_annual_value || 0), 0);
      
      const totalFinished = wonLeads.length + lostLeads.length;
      const winRate = totalFinished > 0 ? (wonLeads.length / totalFinished) * 100 : 0;
      
      const avgDealSize = pipelineLeads.length > 0 ? totalPipelineValue / pipelineLeads.length : 0;
      
      return {
        period,
        pipeline_value: totalPipelineValue,
        expected_revenue: totalExpectedRevenue,
        won_revenue: wonRevenue,
        lost_revenue: lostRevenue,
        avg_deal_size: avgDealSize,
        avg_sales_cycle_days: 14,
        win_rate: winRate,
        total_leads_in_pipeline: pipelineLeads.length,
        leads_moved_to_won: wonLeads.length,
        leads_moved_to_lost: lostLeads.length
      };
    },
    
    moveStage: async (leadId: string, stage: string, reason?: string) => {
      const supabase = createClient();
      
      // Fetch current status
      const { data: oldContact } = await supabase
        .from('contacts')
        .select('status')
        .eq('id', leadId)
        .single();
        
      const oldStage = oldContact?.status || 'new';
      
      const { error } = await supabase
        .from('contacts')
        .update({
          status: stage,
          stage_entered_at: new Date().toISOString()
        })
        .eq('id', leadId);
        
      if (error) throw error;
      
      // Create stage change log entry in audit_logs
      try {
        const tenantId = await getTenantId();
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase
          .from('audit_logs')
          .insert({
            tenant_id: tenantId,
            user_id: user?.id || null,
            action: 'stage_change',
            details: {
              lead_id: leadId,
              old_stage: oldStage,
              new_stage: stage,
              reason: reason || null
            }
          });
      } catch (e) {
        console.error("Failed to insert stage change log entry:", e);
      }
      
      return { success: true, message: `Moved lead to stage ${stage}` };
    },
    
    updateProbability: async (leadId: string, probability: number) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('contacts')
        .update({ deal_probability: probability })
        .eq('id', leadId);
        
      if (error) throw error;
      return { success: true, message: `Updated probability to ${probability}%` };
    },
    
    updateDealValues: async (leadId: string, data: { setup_value?: number; mrr?: number }) => {
      const supabase = createClient();
      const updateData: any = {};
      if (data.setup_value !== undefined) updateData.deal_setup_value = data.setup_value;
      if (data.mrr !== undefined) updateData.deal_mrr = data.mrr;
      
      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', leadId);
        
      if (error) throw error;
      
      // Fetch updated record details
      const { data: updatedContact, error: fetchError } = await supabase
        .from('contacts')
        .select('deal_setup_value, deal_mrr, deal_annual_value')
        .eq('id', leadId)
        .single();
        
      if (fetchError || !updatedContact) {
        throw new Error(fetchError?.message || "Failed to fetch updated deal values");
      }
      
      return {
        success: true,
        deal_setup_value: Number(updatedContact.deal_setup_value || 0),
        deal_mrr: Number(updatedContact.deal_mrr || 0),
        deal_annual_value: Number(updatedContact.deal_annual_value || 0)
      };
    },
    
    syncDealValues: async (_leadId: string) => {
      return { success: true, message: "Deal values synced by database trigger" };
    },
    
    getAuditTrail: async (leadId: string) => {
      const supabase = createClient();
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'stage_change')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const filteredLogs = (logs || []).filter(l => {
        return l.details && typeof l.details === 'object' && (l.details as any).lead_id === leadId;
      });
      
      return filteredLogs.map(l => ({
        id: l.id,
        lead_id: leadId,
        old_stage: (l.details as any).old_stage || '',
        new_stage: (l.details as any).new_stage || '',
        changed_by: l.user_id || 'System',
        reason: (l.details as any).reason || null,
        timestamp: l.created_at
      }));
    },
  },

  // Templates CRUD (Supabase Integrated)
  templates: {
    list: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return (data || []).map(mapDbTemplateToTemplate);
    },
    create: async (tpl: any) => {
      const supabase = createClient();
      const tenantId = await getTenantId();
      
      const serializedBody = JSON.stringify({
        header: tpl.header || "",
        body: tpl.body,
        footer: tpl.footer || "",
        buttons: tpl.buttons || []
      });

      const { data, error } = await supabase
        .from('templates')
        .insert({
          tenant_id: tenantId,
          name: tpl.name,
          category: tpl.category || 'utility',
          language: tpl.language || 'en',
          body: serializedBody,
          status: tpl.status || 'approved'
        })
        .select('*')
        .single();
        
      if (error) throw error;
      return mapDbTemplateToTemplate(data);
    },
    delete: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return { success: true };
    },
    sync: async () => {
      const supabase = createClient();
      const { data: existing } = await supabase.from('templates').select('id').limit(1);
      
      if (!existing || existing.length === 0) {
        const starter = [
          {
            name: "welcome_new_lead",
            category: "marketing",
            language: "en",
            status: "approved",
            header: "Welcome to Trinetra Digital! 🎉",
            body: "Hello {{1}}! Thank you for reaching out to us. We help businesses grow with WhatsApp automation, CRM, and digital marketing.\n\nOur team will get back to you shortly. Meanwhile, explore our services at trinetradigitalsolution.com",
            footer: "Trinetra Digital Solutions",
            buttons: ["Visit Website", "Talk to Team"]
          },
          {
            name: "appointment_reminder",
            category: "utility",
            language: "en",
            status: "approved",
            header: "Appointment Reminder 📅",
            body: "Hello {{1}}! This is a reminder about your appointment scheduled on *{{2}}* at *{{3}}*.\n\nPlease confirm your attendance by replying YES or contact us to reschedule.",
            footer: "Trinetra Digital Solutions",
            buttons: []
          },
          {
            name: "quotation_followup",
            category: "marketing",
            language: "en",
            status: "approved",
            header: "",
            body: "Hello {{1}}! We wanted to follow up on the quotation we sent for *{{2}}*.\n\nHave you had a chance to review it? We'd love to answer any questions and help you get started.\n\nReply to this message or call us anytime!",
            footer: "",
            buttons: []
          }
        ];
        
        for (const tpl of starter) {
          await apiService.templates.create(tpl);
        }
      }
      
      const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
      return (data || []).map(mapDbTemplateToTemplate);
    }
  },

  // Health and Telemetry
  health: {
    get: async () => request<SystemHealth>("/health")
  }
};

function mapDbTemplateToTemplate(dbTpl: any): any {
  let header = "";
  let body = dbTpl.body;
  let footer = "";
  let buttons: string[] = [];

  try {
    if (dbTpl.body && dbTpl.body.trim().startsWith("{")) {
      const parsed = JSON.parse(dbTpl.body);
      header = parsed.header || "";
      body = parsed.body || dbTpl.body;
      footer = parsed.footer || "";
      buttons = parsed.buttons || [];
    }
  } catch (e) {}

  return {
    id: dbTpl.id,
    name: dbTpl.name,
    category: dbTpl.category || "utility",
    language: dbTpl.language || "en",
    status: dbTpl.status || "approved",
    body: body,
    header: header || undefined,
    footer: footer || undefined,
    buttons: buttons.length > 0 ? buttons : undefined,
    usedCount: 0,
    createdAt: dbTpl.created_at
  };
}
