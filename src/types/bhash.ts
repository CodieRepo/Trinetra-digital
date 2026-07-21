export type BhashFlowNode = 
  | '6206' // Welcome
  | '6207' // Explore Services
  | '6208' // Service: Web Dev
  | '6209' // Service: Mobile Dev
  | '6210' // Service: SEO
  | '6211' // Service: AI Solutions
  | '6212' // Service: Digital Marketing
  | '6213' // Service: Branding
  | '6219' | '6220' | '6221' | '6222' | '6223' | '6224' // Detailed Information
  | '6225' | '6226' | '6227' | '6228' | '6229' | '6230' // Pricing
  | '6231' // Portfolio
  | '6232' // Contact Confirmation
  | string;

export interface BhashWebhookPayload {
  phone: string;
  sender?: string;
  message?: string;
  text?: string;
  flow_node?: BhashFlowNode;
  node_id?: BhashFlowNode;
  button_clicked?: string;
  button_title?: string;
  timestamp?: string | number;
  msg_id?: string;
  meta_message_id?: string;
  name?: string;
}

export interface BhashMappedNodeResult {
  eventType: string;
  eventTitle: string;
  eventDescription: string;
  serviceInterest?: string;
  leadStatusUpdate?: 'new' | 'nurturing' | 'Interested' | 'hot' | 'converted' | 'lost';
  isContactRequested: boolean;
}

export type BhashTemplateType = 
  | 'service_done'
  | 'document_ready'
  | 'proposal_shared'
  | 'ticket_resolved'
  | 'support_ticket_created'
  | 'invoice_ready'
  | 'quotation_ready'
  | 'payment_received'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'appointment_confirmed'
  | 'consultation_received';

export interface BhashOutboundPayload {
  phone: string;
  text: string;
  template?: BhashTemplateType;
  params?: string[];
  htype?: 'normal' | 'document' | 'image' | 'video';
  fname?: string;
  mediaUrl?: string;
}
