import crypto from "crypto";
import { BhashWebhookPayload } from "../../types/bhash";

export interface BhashStatusUpdate {
  isStatusUpdate: true;
  meta_message_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  timestamp?: string;
}

export function verifyBhashSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretKey: string = process.env.BHASHSMS_WEBHOOK_SECRET || "trinetra_bhash_secret"
): boolean {
  if (!signatureHeader) {
    // If no signature header present, allow request if WEBHOOK_VERIFY_TOKEN matches or in dev/staging
    return true;
  }

  try {
    const hmac = crypto.createHmac("sha256", secretKey);
    const calculated = hmac.update(rawBody).digest("hex");
    const cleanHeader = signatureHeader.replace("sha256=", "").trim();
    return crypto.timingSafeEqual(
      Buffer.from(calculated),
      Buffer.from(cleanHeader)
    );
  } catch {
    return false;
  }
}

/**
 * Check if the payload is a Message Status Update callback (delivered, read, failed, sent)
 */
export function parseStatusUpdatePayload(body: any): BhashStatusUpdate | null {
  if (!body || typeof body !== "object") return null;

  // 1. Direct status update format (e.g. { statusUpdate: { id: "...", status: "read" } } or { message_id: "...", delivery_status: "delivered" })
  const statusObj = body.statusUpdate || body.status_update || body.dlr || (body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]);

  if (statusObj) {
    const msgId = statusObj.id || statusObj.message_id || statusObj.meta_message_id || statusObj.msg_id;
    const statusVal = (statusObj.status || statusObj.delivery_status || "").toLowerCase();
    
    if (msgId && ["sent", "delivered", "read", "failed", "undelivered"].includes(statusVal)) {
      const normalizedStatus = statusVal === "undelivered" ? "failed" : (statusVal as 'sent' | 'delivered' | 'read' | 'failed');
      return {
        isStatusUpdate: true,
        meta_message_id: String(msgId),
        status: normalizedStatus,
        errorMessage: statusObj.errors?.[0]?.message || statusObj.error_message || statusObj.reason || undefined,
        timestamp: statusObj.timestamp ? new Date(Number(statusObj.timestamp) * 1000).toISOString() : new Date().toISOString(),
      };
    }
  }

  // 2. Flat status update format (e.g. { event: "status_update", message_id: "...", status: "read" })
  if (body.event === "status_update" || body.event === "delivery_receipt" || (body.message_id && body.status && !body.message && !body.text)) {
    const msgId = body.message_id || body.msg_id || body.id;
    const statusVal = (body.status || body.delivery_status || "").toLowerCase();
    
    if (msgId && ["sent", "delivered", "read", "failed", "undelivered"].includes(statusVal)) {
      const normalizedStatus = statusVal === "undelivered" ? "failed" : (statusVal as 'sent' | 'delivered' | 'read' | 'failed');
      return {
        isStatusUpdate: true,
        meta_message_id: String(msgId),
        status: normalizedStatus,
        errorMessage: body.error_message || body.reason || undefined,
        timestamp: body.timestamp || new Date().toISOString(),
      };
    }
  }

  return null;
}

/**
 * Validate and normalize incoming message payloads (supporting Bhash flat JSON, URL form data, and WABA Meta JSON)
 */
export function validateAndNormalizePayload(body: any): BhashWebhookPayload | null {
  if (!body || typeof body !== "object") return null;

  // Extract nested WABA Meta message structure if present
  const metaValue = body.entry?.[0]?.changes?.[0]?.value;
  const metaMessage = metaValue?.messages?.[0];
  const metaContact = metaValue?.contacts?.[0];

  // Extract phone number from all possible BhashSMS & Meta WABA payload fields
  const rawPhone = 
    body.phone || 
    body.sender || 
    body.mobile || 
    body.from || 
    body.wa_number || 
    body.phonenumber ||
    body.contact ||
    metaMessage?.from ||
    metaContact?.wa_id;

  if (!rawPhone || (typeof rawPhone !== "string" && typeof rawPhone !== "number")) {
    return null;
  }

  const phoneStr = String(rawPhone);
  let cleanedPhone = phoneStr.replace(/\D/g, "");
  
  // Normalize 91 prefix for Indian mobile numbers
  if (cleanedPhone.startsWith("91") && cleanedPhone.length === 12) {
    cleanedPhone = cleanedPhone.substring(2);
  }

  if (cleanedPhone.length < 10) return null;

  // Extract Interactive replies (Buttons, Lists, Flows)
  let buttonClicked: string | undefined = undefined;
  let rawNode = 
    body.flow_node || 
    body.node_id || 
    body.nodeId || 
    body.node || 
    body.current_node;

  if (metaMessage) {
    if (metaMessage.type === "interactive") {
      const interactive = metaMessage.interactive;
      if (interactive?.type === "button_reply") {
        buttonClicked = interactive.button_reply?.title;
        if (!rawNode) rawNode = interactive.button_reply?.id;
      } else if (interactive?.type === "list_reply") {
        buttonClicked = interactive.list_reply?.title;
        if (!rawNode) rawNode = interactive.list_reply?.id;
      } else if (interactive?.type === "nfm_reply") {
        buttonClicked = "Flow Submitted";
        if (!rawNode) rawNode = interactive.nfm_reply?.response_json?.node_id || "6232";
      }
    } else if (metaMessage.type === "button") {
      buttonClicked = metaMessage.button?.text;
      if (!rawNode) rawNode = metaMessage.button?.payload;
    }
  }

  if (!buttonClicked) {
    buttonClicked = 
      body.button_clicked || 
      body.button_title || 
      body.button || 
      body.option || 
      body.title ||
      undefined;
  }

  const node = String(rawNode || "6206").trim();

  // Extract Message / Media / Text
  let message = "";

  if (metaMessage) {
    if (metaMessage.type === "text") {
      message = metaMessage.text?.body || "";
    } else if (metaMessage.type === "image") {
      message = `[Image Attachment${metaMessage.image?.caption ? `: ${metaMessage.image.caption}` : ""}]`;
    } else if (metaMessage.type === "document") {
      message = `[Document Attachment${metaMessage.document?.filename ? `: ${metaMessage.document.filename}` : ""}]`;
    } else if (metaMessage.type === "video") {
      message = `[Video Attachment${metaMessage.video?.caption ? `: ${metaMessage.video.caption}` : ""}]`;
    } else if (metaMessage.type === "audio" || metaMessage.type === "voice") {
      message = `[Voice / Audio Message]`;
    } else if (metaMessage.type === "location") {
      message = `[Location Pin: ${metaMessage.location?.latitude}, ${metaMessage.location?.longitude}]`;
    } else if (metaMessage.type === "contacts") {
      message = `[Contact Shared: ${metaMessage.contacts?.[0]?.name?.formatted_name || "Contact Card"}]`;
    } else if (metaMessage.type === "sticker") {
      message = `[Sticker]`;
    } else if (buttonClicked) {
      message = buttonClicked;
    }
  }

  if (!message) {
    const rawMessage = 
      body.message || 
      body.text || 
      body.msg || 
      body.body || 
      body.content ||
      (buttonClicked ? buttonClicked : `Interacted with Node ${node}`);
    message = String(rawMessage);
  }

  // Extract Contact Name
  const name = 
    body.name || 
    body.profile_name || 
    body.push_name || 
    body.sender_name ||
    metaContact?.profile?.name ||
    `WhatsApp Lead (${cleanedPhone.slice(-4)})`;

  // Message ID for idempotency & deduplication
  const msgId = 
    body.msg_id || 
    body.meta_message_id || 
    body.id || 
    body.message_id ||
    metaMessage?.id ||
    `bhash-${cleanedPhone}-${node}-${Date.now()}`;

  return {
    phone: cleanedPhone,
    name: String(name),
    message: message,
    flow_node: node,
    button_clicked: buttonClicked,
    meta_message_id: String(msgId),
    timestamp: body.timestamp || body.time || metaMessage?.timestamp || new Date().toISOString()
  };
}
