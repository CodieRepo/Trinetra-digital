import * as crypto from "crypto";

export interface ParsedBhashPayload {
  mobile: string;
  rawMobile: string;
  message: string;
  name?: string;
}

export interface ParseBhashResult {
  success: boolean;
  data?: ParsedBhashPayload;
  error?: string;
}

/**
 * Normalizes a phone number to canonical 10-digit format for Indian numbers.
 * Strips all non-digit characters, removes leading 91 or 0 if applicable.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return "";
}

/**
 * Generates an internal unique event ID for Bhash incoming deliveries.
 * Explicitly decoupled from provider message ID.
 */
export function generateInternalEventId(): string {
  const uuid = typeof crypto.randomUUID === "function" 
    ? crypto.randomUUID() 
    : crypto.randomBytes(16).toString("hex");
  return `bhash_evt_${uuid}`;
}

/**
 * Robust marker-based parser for BhashSMS plain-text incoming webhook payloads.
 * Format: "Mobile: 919876543210, Message: Hello from Bhash, Name: Bhash"
 *
 * Requirements:
 * - Preserves commas, colons, emojis, and special characters inside Message.
 * - Handles arbitrary field order.
 * - Trims extraneous whitespace.
 * - Rejects missing Mobile or Message fields safely.
 * - Includes defensive JSON fallback if body is JSON.
 */
export function parseBhashPlainTextPayload(body: string): ParseBhashResult {
  if (!body || typeof body !== "string" || body.trim() === "") {
    return { success: false, error: "Empty or invalid request payload" };
  }

  const trimmed = body.trim();

  // Defensive JSON fallback if payload arrives as JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const json = JSON.parse(trimmed);
      const rawMobile = String(json.mobile || json.phone || json.from || "").trim();
      const message = String(json.message || json.text || json.body || "").trim();
      const name = json.name || json.sender_name || undefined;

      if (!rawMobile) {
        return { success: false, error: "Malformed JSON payload: Missing Mobile field" };
      }
      if (!message) {
        return { success: false, error: "Malformed JSON payload: Missing Message field" };
      }

      const mobile = normalizePhoneNumber(rawMobile);
      if (!mobile || mobile.length < 10) {
        return { success: false, error: "Invalid Mobile number in JSON: must contain at least 10 digits" };
      }

      return {
        success: true,
        data: {
          mobile,
          rawMobile,
          message,
          name: name ? String(name).trim() : undefined,
        },
      };
    } catch {
      // Fall through to plain text parsing if JSON parse fails
    }
  }

  // Marker detection: matches field labels preceded by start-of-string or comma
  const markerRegexes = [
    { key: "mobile", regex: /(?:^|,)\s*Mobile\s*:/i },
    { key: "message", regex: /(?:^|,)\s*Message\s*:/i },
    { key: "name", regex: /(?:^|,)\s*Name\s*:/i },
  ];

  const foundMarkers: { key: string; startIndex: number; valueStartIndex: number }[] = [];

  for (const m of markerRegexes) {
    const match = m.regex.exec(trimmed);
    if (match) {
      foundMarkers.push({
        key: m.key,
        startIndex: match.index,
        valueStartIndex: match.index + match[0].length,
      });
    }
  }

  // Validate required markers
  const hasMobile = foundMarkers.some((m) => m.key === "mobile");
  const hasMessage = foundMarkers.some((m) => m.key === "message");

  if (!hasMobile) {
    return { success: false, error: "Malformed plain text payload: Missing required 'Mobile:' field" };
  }
  if (!hasMessage) {
    return { success: false, error: "Malformed plain text payload: Missing required 'Message:' field" };
  }

  // Sort markers by their position in the raw string
  foundMarkers.sort((a, b) => a.startIndex - b.startIndex);

  const values: Record<string, string> = {};

  for (let i = 0; i < foundMarkers.length; i++) {
    const current = foundMarkers[i];
    const next = foundMarkers[i + 1];
    const valueEndIndex = next ? next.startIndex : trimmed.length;

    let rawVal = trimmed.substring(current.valueStartIndex, valueEndIndex).trim();
    // Strip trailing comma if present at the boundary
    if (rawVal.endsWith(",")) {
      rawVal = rawVal.slice(0, -1).trim();
    }
    values[current.key] = rawVal;
  }

  const rawMobile = values.mobile || "";
  const rawMessage = values.message !== undefined ? values.message : "";
  const rawName = values.name || "";

  if (!rawMobile) {
    return { success: false, error: "Malformed plain text payload: 'Mobile:' value is empty" };
  }
  if (!rawMessage) {
    return { success: false, error: "Malformed plain text payload: 'Message:' value is empty" };
  }

  const normalizedMobile = normalizePhoneNumber(rawMobile);
  if (!normalizedMobile || normalizedMobile.length < 10) {
    return { success: false, error: `Invalid Mobile number '${rawMobile}': must contain at least 10 valid digits` };
  }

  return {
    success: true,
    data: {
      mobile: normalizedMobile,
      rawMobile,
      message: rawMessage,
      name: rawName ? rawName : undefined,
    },
  };
}

/**
 * Backwards compatibility wrapper for existing callers.
 */
export function parsePlainTextPayload(body: string) {
  const result = parseBhashPlainTextPayload(body);
  if (result.success && result.data) {
    return {
      mobile: result.data.mobile,
      message: result.data.message,
      name: result.data.name,
    };
  }
  return {
    mobile: "",
    message: "",
    name: undefined,
  };
}

/**
 * Computes a stable SHA256 fingerprint for outbound or batch deduplication.
 */
export function generateFingerprint(phone: string, message: string, timestamp?: string): string {
  const cleanPhone = normalizePhoneNumber(phone);
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

