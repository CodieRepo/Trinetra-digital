import { MessagingProvider, MessagePayload, SendResult } from "./types";

function cleanPhoneNumber(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, "");
  // If it starts with 91 and has 12 digits, strip the 91 prefix
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

export class BhashSMSProvider implements MessagingProvider {
  async sendMessage(payload: MessagePayload): Promise<SendResult> {
    try {
      // Resolve credentials
      const user = payload.credentials.phoneNumberId || process.env.BHASHSMS_USER || "Trinetra";
      const pass = payload.credentials.apiKey || process.env.BHASHSMS_PASS;
      const sender = process.env.BHASHSMS_SENDER || "BUZWAP";
      
      if (!pass) {
        return { success: false, errorMessage: "BhashSMS password (API key) is not configured." };
      }
      
      const cleanedPhone = cleanPhoneNumber(payload.to);
      
      // Determine if template message
      let textParam = payload.body;
      let extraParams = "";
      
      if (payload.templateName) {
        textParam = payload.templateName;
        if (payload.templateParams && payload.templateParams.length > 0) {
          extraParams += `&Params=${encodeURIComponent(payload.templateParams.join(","))}`;
        }
      }
      
      const encodedText = encodeURIComponent(textParam);
      
      // Determine if media message (Phase 4 / 6)
      let htype = "normal";
      let mediaUrlParam = "";
      
      if (payload.mediaUrl) {
        const type = (payload.mediaType || "").toLowerCase();
        if (type.includes("image")) {
          htype = "image";
        } else if (type.includes("video")) {
          htype = "video";
        } else {
          htype = "document"; // Default fallback
        }
        mediaUrlParam = `&htype=${htype}&url=${encodeURIComponent(payload.mediaUrl)}`;
      } else {
        htype = "normal";
      }
      
      // Build BhashSMS GET request URL
      // If a template is sent, stype=normal, htype is omit or normal.
      const url = `http://bhashsms.com/api/sendmsg.php?user=${user}&pass=${pass}&sender=${sender}&phone=${cleanedPhone}&text=${encodedText}&priority=wa&stype=normal&htype=${htype}${extraParams}${mediaUrlParam}`;
      
      console.log(`📡 Sending BhashSMS GET request: http://bhashsms.com/api/sendmsg.php?user=${user}&pass=******&sender=${sender}&phone=${cleanedPhone}&priority=wa&stype=normal&htype=${htype}`);
      
      const response = await fetch(url, {
        method: "GET"
      });
      
      const responseText = await response.text();
      console.log("BhashSMS Raw Response:", responseText);
      
      const isSuccess = response.ok && 
        !responseText.toLowerCase().includes("error") && 
        !responseText.toLowerCase().includes("fail") &&
        !responseText.toLowerCase().includes("invalid");
        
      if (isSuccess) {
        return {
          success: true,
          providerMessageId: `bhash-${Date.now()}`
        };
      } else {
        return {
          success: false,
          errorMessage: responseText || `BhashSMS error status ${response.status}`
        };
      }
    } catch (e: any) {
      console.error("BhashSMS provider exception:", e);
      return { success: false, errorMessage: e.message || "Failed calling BhashSMS API" };
    }
  }
}
