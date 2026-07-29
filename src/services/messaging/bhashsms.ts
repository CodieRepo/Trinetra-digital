import { MessagingProvider, MessagePayload, SendResult } from "./types";
import { bhashProvider } from "../providers/bhashProvider";

export class BhashSMSProvider implements MessagingProvider {
  async sendMessage(payload: MessagePayload): Promise<SendResult> {
    try {
      const sendResult = await bhashProvider.sendMessage({
        tenant_id: payload.tenantId || "00000000-0000-0000-0000-000000000001",
        to: payload.to,
        body: payload.body,
        template: payload.templateName,
        params: payload.templateParams,
        mediaUrl: payload.mediaUrl,
        mediaType: payload.mediaType as any
      });

      if (sendResult.success) {
        return {
          success: true,
          providerMessageId: sendResult.messageId
        };
      } else {
        return {
          success: false,
          errorMessage: sendResult.error
        };
      }
    } catch (e: any) {
      return {
        success: false,
        errorMessage: e.message || "Failed calling BhashSMS API"
      };
    }
  }
}
