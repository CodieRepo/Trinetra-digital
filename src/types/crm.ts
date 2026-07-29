// Trinetra CRM - Core Type Definitions & System Contracts

export type UserRole = 'owner' | 'admin' | 'manager' | 'sales' | 'support' | 'viewer';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'quotation' | 'negotiation' | 'won' | 'lost';

export type LeadTemperature = 'hot' | 'warm' | 'cold';

export type TaskType = 'call' | 'quotation' | 'meeting' | 'documents' | 'payment_followup' | 'support_followup';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type AttachmentCategory = 'quotation' | 'invoice' | 'document' | 'image' | 'other';

export interface Lead {
  id: string;
  tenant_id: string;
  phone: string;
  name: string;
  email: string | null;
  company: string | null;
  service_interest: string | null;
  current_flow_node?: string | null;
  last_message: string | null;
  last_message_at: string;
  status: LeadStatus;
  is_customer: boolean;
  source: string;
  score: number;
  lead_temperature: LeadTemperature;
  ai_summary: string | null;
  ai_intent: string | null;
  ai_suggested_action: string | null;
  assigned_to: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  lead_id: string;
  channel: string;
  provider: string;
  status: 'active' | 'archived' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  tenant_id?: string;
  conversation_id?: string;
  lead_id: string;
  direction: 'inbound' | 'outbound';
  body?: string;
  message?: string;
  flow_node?: string | null;
  button_clicked?: string | null;
  provider_message_id?: string | null;
  meta_message_id?: string | null;
  deleted_at?: string | null;
  timestamp?: string;
  created_at: string;
}

// Backwards compatibility alias
export type ConversationMessage = Message;

export interface TimelineEvent {
  id: string;
  tenant_id: string;
  lead_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  lead_id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assigned_to: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  tenant_id: string;
  lead_id: string;
  note: string;
  author: string;
  deleted_at: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  tenant_id: string;
  lead_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  category: AttachmentCategory;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  action: string;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  channel: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  conversionRate: number;
  pendingTasks: number;
  todayLeads: number;
  weeklyLeads: number;
  monthlyLeads: number;
  liveLeads?: number;
  interestedLeads?: number;
  hotLeads?: number;
  pricingRequests?: number;
  mostClickedService?: { service: string; count: number } | null;
  mostViewedPricingNode?: { node: string; count: number } | null;
  topDropoffNode?: { node: string; count: number } | null;
  sourcesBreakdown?: Record<string, number>;
  stageDistribution?: Record<string, number>;
  recentActivities?: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    actor: string;
    type: string;
  }>;
}

export interface AIAnalysisResult {
  summary: string;
  score: number;
  intent: string;
  leadTemperature: LeadTemperature;
  suggestedAction: string;
  appointmentIntent?: boolean;
  quotationIntent?: boolean;
  humanHandoff?: boolean;
  serviceInquiry?: boolean;
  followUpRequired?: boolean;
}
