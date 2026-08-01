import crypto from "crypto";

/**
 * Parses the raw plain text payload from BhashSMS webhook.
 * Example format: "Mobile: 919876543210, Message: Hello, Name: Rahul"
 */
export function parsePlainTextPayload(body: string) {
  const mobileLabel = "Mobile:";
  const messageLabel = "Message:";
  const nameLabel = "Name:";

  const mobileIdx = body.indexOf(mobileLabel);
  const messageIdx = body.indexOf(messageLabel);
  const nameIdx = body.indexOf(nameLabel);

  let mobile = "";
  let message = "";
  let name = "";

  if (mobileIdx !== -1) {
    let mobileEnd = body.length;
    if (messageIdx > mobileIdx) mobileEnd = messageIdx;
    else if (nameIdx > mobileIdx) mobileEnd = nameIdx;
    
    mobile = body.substring(mobileIdx + mobileLabel.length, mobileEnd).trim();
    if (mobile.endsWith(",")) mobile = mobile.slice(0, -1).trim();
  }

  if (messageIdx !== -1) {
    let messageEnd = body.length;
    const markers = [
      { name: "Name:", idx: nameIdx },
      { name: "Mobile:", idx: mobileIdx }
    ].filter(m => m.idx > messageIdx)
     .sort((a, b) => a.idx - b.idx);

    if (markers.length > 0) messageEnd = markers[0].idx;

    message = body.substring(messageIdx + messageLabel.length, messageEnd).trim();
    if (message.endsWith(",")) message = message.slice(0, -1).trim();
  }

  if (nameIdx !== -1) {
    let nameEnd = body.length;
    const markers = [
      { name: "Message:", idx: messageIdx },
      { name: "Mobile:", idx: mobileIdx }
    ].filter(m => m.idx > nameIdx)
     .sort((a, b) => a.idx - b.idx);

    if (markers.length > 0) nameEnd = markers[0].idx;

    name = body.substring(nameIdx + nameLabel.length, nameEnd).trim();
    if (name.endsWith(",")) name = name.slice(0, -1).trim();
  }

  // Cleanup phone number: remove non-digits
  let cleanedPhone = mobile.replace(/\D/g, "");
  if (cleanedPhone.startsWith("91") && cleanedPhone.length === 12) {
    cleanedPhone = cleanedPhone.substring(2);
  }

  return {
    mobile: cleanedPhone,
    message: message || "",
    name: name || undefined
  };
}

/**
 * Computes a stable SHA256 fingerprint for message deduplication.
 * Resolves collisions using 1-minute time windows.
 */
export function generateFingerprint(phone: string, message: string, timestamp?: string): string {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const cleanMsg = message.toLowerCase().replace(/\s+/g, "").trim();
  
  const time = timestamp ? new Date(timestamp) : new Date();
  const year = time.getUTCFullYear();
  const month = String(time.getUTCMonth() + 1).padStart(2, "0");
  const day = String(time.getUTCDate()).padStart(2, "0");
  const hour = String(time.getUTCHours()).padStart(2, "0");
  const minute = String(time.getUTCMinutes()).padStart(2, "0");
  const minuteStamp = `${year}-${month}-${day}T${hour}:${minute}`;

  return crypto.createHash("sha256").update(`${cleanPhone}-${cleanMsg}-${minuteStamp}`).digest("hex");
}
