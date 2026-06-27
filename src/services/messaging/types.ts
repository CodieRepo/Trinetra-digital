export interface MessagePayload {
  to: string;
  body: string;
  tenantId: string;
  mediaUrl?: string;
  mediaType?: string;
  templateName?: string;
  templateParams?: string[];
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
