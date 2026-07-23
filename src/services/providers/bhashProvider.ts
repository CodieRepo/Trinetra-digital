import { MessagingProvider, OutboundMessageRequest, OutboundMessageResponse, IngestedPayload, ProviderCapabilities } from "./providerInterfaces";

export class BhashSMSProvider implements MessagingProvider {
  key = "bhash";

  capabilities: ProviderCapabilities = {
    hasTextMessaging: true,
    hasTemplates: true,
    hasMedia: false,
    hasDeliveryReceipts: false,
    hasReadReceipts: false,
    hasInteractiveButtons: false,
  };

  async sendMessage(req: OutboundMessageRequest): Promise<OutboundMessageResponse> {
    const user = process.env.BHASHSMS_USER;
    const pass = process.env.BHASHSMS_PASS;
    const sender = process.env.BHASHSMS_SENDER || "TRINTR";

    if (!user || !pass) {
      console.warn("⚠️ BhashSMS credentials missing. Simulating output.");
      return { success: true, messageId: `sim-bhash-${Date.now()}` };
    }

    try {
      const cleanPhone = req.to.replace(/\D/g, "").slice(-10);
      const url = `https://bhashsms.com/api/sendmsg.php?user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&sender=${encodeURIComponent(sender)}&phone=${cleanPhone}&text=${encodeURIComponent(req.body)}&priority=ndnd&stype=normal`;

      const response = await fetch(url);
      const responseText = await response.text();

      console.log(`[BhashSMS Gateway Response]:`, responseText);

      return {
        success: true,
        messageId: `bhash-${Date.now()}`,
      };
    } catch (err: any) {
      console.error("❌ BhashSMS send error:", err);
      return { success: false, error: err.message };
    }
  }

  parseWebhookPayload(jsonBody: any): IngestedPayload | null {
    if (!jsonBody) return null;

    // Expand key matching for BhashSMS variations (phone, mobile, mobile_no, contact, sender, num, etc.)
    const phone = String(
      jsonBody.phone ||
      jsonBody.mobile ||
      jsonBody.mobile_no ||
      jsonBody.mob ||
      jsonBody.contact ||
      jsonBody.contact_no ||
      jsonBody.from ||
      jsonBody.wa_id ||
      jsonBody.sender ||
      jsonBody.num ||
      jsonBody.number ||
      jsonBody.phone_number ||
      jsonBody.user_phone ||
      ""
    ).trim();

    if (!phone) return null;

    const name =
      jsonBody.name ||
      jsonBody.sender_name ||
      jsonBody.pushname ||
      jsonBody.user_name ||
      `WhatsApp Lead (${phone.slice(-4)})`;

    const text =
      jsonBody.text ||
      jsonBody.message ||
      jsonBody.body ||
      jsonBody.msg ||
      jsonBody.sms ||
      jsonBody.content ||
      jsonBody.query ||
      jsonBody.user_text ||
      "Incoming text message";

    const flow_node = jsonBody.node || jsonBody.flow_node || jsonBody.current_node || "6206";
    const button_clicked = jsonBody.button_clicked || jsonBody.button || null;
    const meta_message_id = jsonBody.meta_message_id || jsonBody.msg_id || jsonBody.id || null;
    const timestamp = jsonBody.timestamp || jsonBody.time || new Date().toISOString();

    return {
      tenant_id: jsonBody.tenant_id || "00000000-0000-0000-0000-000000000001",
      phone,
      name,
      message: text,
      flow_node: String(flow_node),
      button_clicked,
      meta_message_id,
      timestamp,
      rawPayload: jsonBody,
    };
  }
}

export const bhashProvider = new BhashSMSProvider();
