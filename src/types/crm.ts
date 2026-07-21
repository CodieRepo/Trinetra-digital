export type LeadStatus = 'new' | 'nurturing' | 'Interested' | 'hot' | 'converted' | 'lost';

export interface Lead {
  id: string;
  phone: string;
  name: string;
  service_interest: string | null;
  current_flow_node: string;
  last_message: string | null;
  last_message_at: string;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  lead_id: string;
  direction: 'inbound' | 'outbound';
  message: string;
  timestamp: string;
  flow_node: string | null;
  button_clicked: string | null;
  meta_message_id: string | null;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  lead_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface Task {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  note: string;
  author: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  liveLeads: number;
  unreadChats: number;
  hotLeads: number;
  interestedLeads: number;
  todayLeads: number;
  pricingRequests: number;
  portfolioViews: number;
  contactRequests: number;
  mostClickedService: { service: string; count: number } | null;
  mostViewedPricingNode: { node: string; count: number } | null;
  topDropoffNode: { node: string; count: number } | null;
  conversionRate: number;
}
