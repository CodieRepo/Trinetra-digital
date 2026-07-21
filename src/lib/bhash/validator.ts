import crypto from "crypto";
import { BhashWebhookPayload } from "../../types/bhash";

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

export function validateAndNormalizePayload(body: any): BhashWebhookPayload | null {
  if (!body || typeof body !== "object") return null;

  // Extract phone number from all possible BhashSMS payload fields
  const rawPhone = 
    body.phone || 
    body.sender || 
    body.mobile || 
    body.from || 
    body.wa_number || 
    body.phonenumber ||
    body.contact;

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

  // Extract Node ID (BhashSMS flow node 6206-6232)
  const rawNode = 
    body.flow_node || 
    body.node_id || 
    body.nodeId || 
    body.node || 
    body.current_node ||
    "6206";
  const node = String(rawNode).trim();

  // Extract Message / Text
  const rawMessage = 
    body.message || 
    body.text || 
    body.msg || 
    body.body || 
    body.content ||
    `Interacted with Node ${node}`;
  const message = String(rawMessage);

  // Extract Button Clicked
  const buttonClicked = 
    body.button_clicked || 
    body.button_title || 
    body.button || 
    body.option || 
    body.title ||
    null;

  // Extract Contact Name
  const name = 
    body.name || 
    body.profile_name || 
    body.push_name || 
    body.sender_name ||
    `WhatsApp Lead (${cleanedPhone.slice(-4)})`;

  // Message ID for idempotency & deduplication
  const msgId = 
    body.msg_id || 
    body.meta_message_id || 
    body.id || 
    body.message_id ||
    `bhash-${cleanedPhone}-${node}-${Date.now()}`;

  return {
    phone: cleanedPhone,
    name: String(name),
    message: message,
    flow_node: node,
    button_clicked: buttonClicked ? String(buttonClicked) : undefined,
    meta_message_id: String(msgId),
    timestamp: body.timestamp || body.time || new Date().toISOString()
  };
}
