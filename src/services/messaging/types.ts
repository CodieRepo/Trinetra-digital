export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveSection {
  title?: string;
  rows: InteractiveRow[];
}

export interface MessagePayload {
  to: string;
  body: string;
  tenantId: string;
  mediaUrl?: string;
  mediaType?: string;
  templateName?: string;
  templateParams?: string[];
  
  // Interactive options (buttons, lists, flows)
  interactiveType?: 'button' | 'list' | 'flow';
  interactiveHeader?: string;
  interactiveBody?: string;
  interactiveFooter?: string;
  interactiveButtons?: InteractiveButton[];
  interactiveSections?: InteractiveSection[];
  
  // Meta Flow parameters
  flowToken?: string;
  flowId?: string;
  flowCta?: string;
  flowAction?: 'navigate' | 'data_exchange';
  flowActionPayload?: Record<string, any>;

  credentials: {
    apiKey?: string;
    phoneNumberId?: string;
    accessToken?: string;
  };
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  errorMessage?: string;
}

export interface MessagingProvider {
  sendMessage(payload: MessagePayload): Promise<SendResult>;
}
