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

    // Extract nested WABA Meta message structure if present
    const metaValue = jsonBody.entry?.[0]?.changes?.[0]?.value;
    const metaMessage = metaValue?.messages?.[0];
    const metaContact = metaValue?.contacts?.[0];

    // Extract phone
    const rawPhone = 
      jsonBody.phone ||
      jsonBody.mobile ||
      jsonBody.mobile_no ||
      jsonBody.mob ||
      jsonBody.contact ||
      jsonBody.contact_no ||
      jsonBody.from ||
      jsonBody.wa_id ||
      jsonBody.wa_number ||
      jsonBody.phonenumber ||
      jsonBody.sender ||
      jsonBody.num ||
      jsonBody.number ||
      jsonBody.phone_number ||
      jsonBody.user_phone ||
      metaMessage?.from ||
      metaContact?.wa_id;

    if (!rawPhone) return null;

    const phoneStr = String(rawPhone).trim();
    let cleanedPhone = phoneStr.replace(/\D/g, "");
    
    // Normalize 91 prefix for Indian mobile numbers
    if (cleanedPhone.startsWith("91") && cleanedPhone.length === 12) {
      cleanedPhone = cleanedPhone.substring(2);
    }

    if (cleanedPhone.length < 10) return null;

    // Extract Interactive replies / Button clicked
    let buttonClicked: string | undefined = undefined;
    let rawNode = 
      jsonBody.flow_node || 
      jsonBody.node_id || 
      jsonBody.nodeId || 
      jsonBody.node || 
      jsonBody.current_node;

    if (metaMessage) {
      if (metaMessage.type === "interactive") {
        const interactive = metaMessage.interactive;
        if (interactive?.type === "button_reply") {
          buttonClicked = interactive.button_reply?.title || undefined;
          if (!rawNode) rawNode = interactive.button_reply?.id;
        } else if (interactive?.type === "list_reply") {
          buttonClicked = interactive.list_reply?.title || undefined;
          if (!rawNode) rawNode = interactive.list_reply?.id;
        } else if (interactive?.type === "nfm_reply") {
          buttonClicked = "Flow Submitted";
          if (!rawNode) rawNode = interactive.nfm_reply?.response_json?.node_id || "6232";
        }
      } else if (metaMessage.type === "button") {
        buttonClicked = metaMessage.button?.text || undefined;
        if (!rawNode) rawNode = metaMessage.button?.payload;
      }
    }

    if (!buttonClicked) {
      buttonClicked = 
        jsonBody.button_clicked || 
        jsonBody.button_title || 
        jsonBody.button || 
        jsonBody.option || 
        jsonBody.title ||
        undefined;
    }

    const flow_node = String(rawNode || "6206").trim();

    // Extract Message / Media / Text
    let text = "";

    if (metaMessage) {
      if (metaMessage.type === "text") {
        text = metaMessage.text?.body || "";
      } else if (metaMessage.type === "image") {
        text = `[Image Attachment${metaMessage.image?.caption ? `: ${metaMessage.image.caption}` : ""}]`;
      } else if (metaMessage.type === "document") {
        text = `[Document Attachment${metaMessage.document?.filename ? `: ${metaMessage.document.filename}` : ""}]`;
      } else if (metaMessage.type === "video") {
        text = `[Video Attachment${metaMessage.video?.caption ? `: ${metaMessage.video.caption}` : ""}]`;
      } else if (metaMessage.type === "audio" || metaMessage.type === "voice") {
        text = `[Voice / Audio Message]`;
      } else if (metaMessage.type === "location") {
        text = `[Location Pin: ${metaMessage.location?.latitude}, ${metaMessage.location?.longitude}]`;
      } else if (metaMessage.type === "contacts") {
        text = `[Contact Shared: ${metaMessage.contacts?.[0]?.name?.formatted_name || "Contact Card"}]`;
      } else if (metaMessage.type === "sticker") {
        text = `[Sticker]`;
      } else if (buttonClicked) {
        text = buttonClicked;
      }
    }

    if (!text) {
      const rawMessage = 
        jsonBody.text ||
        jsonBody.message ||
        jsonBody.body ||
        jsonBody.msg ||
        jsonBody.sms ||
        jsonBody.content ||
        jsonBody.query ||
        jsonBody.user_text ||
        (buttonClicked ? buttonClicked : `Interacted with Node ${flow_node}`);
      text = String(rawMessage);
    }

    // Extract Name
    const name = String(
      jsonBody.name ||
      jsonBody.sender_name ||
      jsonBody.profile_name ||
      jsonBody.push_name ||
      jsonBody.pushname ||
      jsonBody.user_name ||
      metaContact?.profile?.name ||
      `WhatsApp Lead (${cleanedPhone.slice(-4)})`
    );

    // Extract Message ID for idempotency & deduplication
    const meta_message_id = String(
      jsonBody.meta_message_id ||
      jsonBody.msg_id ||
      jsonBody.id ||
      jsonBody.message_id ||
      metaMessage?.id ||
      `bhash-${cleanedPhone}-${flow_node}-${Date.now()}`
    );

    // Timestamp
    const rawTimestamp = jsonBody.timestamp || jsonBody.time || metaMessage?.timestamp || new Date().toISOString();
    const timestamp = typeof rawTimestamp === "number" ? new Date(rawTimestamp * 1000).toISOString() : String(rawTimestamp);

    return {
      tenant_id: jsonBody.tenant_id || "00000000-0000-0000-0000-000000000001",
      phone: cleanedPhone,
      name,
      message: text,
      flow_node,
      button_clicked: buttonClicked,
      meta_message_id,
      timestamp,
      rawPayload: jsonBody,
    };
  }
}

export const bhashProvider = new BhashSMSProvider();
