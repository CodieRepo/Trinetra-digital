import { MessagingProvider, MessagePayload, SendResult } from "./types";

export class MetaProvider implements MessagingProvider {
  async sendMessage(payload: MessagePayload): Promise<SendResult> {
    const phoneNumberId = payload.credentials.phoneNumberId;
    const accessToken = payload.credentials.accessToken;
    
    if (!phoneNumberId || !accessToken) {
      return { success: false, errorMessage: "Meta WhatsApp credentials not configured." };
    }
    
    const metaUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const metaPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: { body: payload.body }
    };
    
    try {
      const response = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metaPayload)
      });
      
      const metaData = await response.json();
      if (response.ok && !metaData.error) {
        return {
          success: true,
          providerMessageId: metaData.messages?.[0]?.id
        };
      } else {
        return {
          success: false,
          errorMessage: metaData.error?.message || "Meta API error"
        };
      }
    } catch (e: any) {
      return { success: false, errorMessage: e.message || "Meta Graph fetch exception" };
    }
  }
}
