import { AIAnalysisResult } from "../../types/crm";

export interface ProviderCapabilities {
  hasTextMessaging: boolean;
  hasTemplates: boolean;
  hasMedia: boolean;
  hasDeliveryReceipts: boolean;
  hasReadReceipts: boolean;
  hasInteractiveButtons: boolean;
}

export interface OutboundMessageRequest {
  tenant_id: string;
  to: string;
  body: string;
  template?: string;
  params?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'normal';
}

export interface OutboundMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IngestedPayload {
  tenant_id: string;
  phone: string;
  name?: string;
  message?: string;
  flow_node?: string;
  button_clicked?: string;
  meta_message_id?: string;
  timestamp?: string;
  rawPayload: any;
}

export interface MessagingProvider {
  key: string;
  capabilities: ProviderCapabilities;
  sendMessage(req: OutboundMessageRequest): Promise<OutboundMessageResponse>;
  parseWebhookPayload(req: any): IngestedPayload | null;
}

export interface AiProvider {
  key: string;
  analyzeLead(
    tenant_id: string,
    conversationHistory: string,
    lastMessage: string,
    systemPromptOverride?: string
  ): Promise<AIAnalysisResult>;
}
