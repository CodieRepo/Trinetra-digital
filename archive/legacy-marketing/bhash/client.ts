import { BhashOutboundPayload } from "../../types/bhash";

export class BhashClient {
  private user: string;
  private pass: string;
  private sender: string;

  constructor() {
    this.user = (process.env.BHASHSMS_USER || "Trinetra").trim();
    this.pass = (process.env.BHASHSMS_PASS || "SatwikPal@123Shubham").trim();
    this.sender = (process.env.BHASHSMS_SENDER || "BUZWAP").trim();
  }

  private cleanPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    }
    return cleaned;
  }

  /**
   * Send regular text or media message via BhashSMS sendmsg.php
   */
  async sendMessage(payload: BhashOutboundPayload): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: string }> {
    try {
      const phone = this.cleanPhone(payload.phone);
      const text = encodeURIComponent(payload.text);
      let extra = "";

      if (payload.htype && payload.mediaUrl) {
        extra += `&htype=${payload.htype}&url=${encodeURIComponent(payload.mediaUrl)}`;
        if (payload.fname) {
          extra += `&fname=${encodeURIComponent(payload.fname)}`;
        }
      }

      const url = `http://bhashsms.com/api/sendmsg.php?user=${encodeURIComponent(this.user)}&pass=${encodeURIComponent(this.pass)}&sender=${encodeURIComponent(this.sender)}&phone=${phone}&text=${text}&priority=wa&stype=normal${extra}`;
      const logUrl = `http://bhashsms.com/api/sendmsg.php?user=${this.user}&pass=******&sender=${this.sender}&phone=${phone}&text=${text}&priority=wa&stype=normal${extra}`;

      console.log(`\n=================================================================`);
      console.log(`📡 [BhashSMS Outbound GET Request]: ${logUrl}`);

      const response = await fetch(url, { method: "GET" });
      const responseText = await response.text();

      console.log(`📥 [BhashSMS HTTP Status]: ${response.status} ${response.statusText}`);
      console.log(`📥 [BhashSMS Response Body]: "${responseText}"`);
      console.log(`=================================================================\n`);

      const lowerRes = responseText.toLowerCase();
      const isSuccess = response.ok && 
        !lowerRes.includes("error") && 
        !lowerRes.includes("fail") &&
        !lowerRes.includes("invalid") &&
        !lowerRes.includes("unauthorized") &&
        !lowerRes.includes("access denied");

      if (isSuccess) {
        return {
          success: true,
          messageId: `bhash-${Date.now()}`,
          rawResponse: responseText
        };
      }

      return { 
        success: false, 
        error: `BhashSMS API Error (Status ${response.status}): ${responseText || "Unknown Error"}`,
        rawResponse: responseText 
      };
    } catch (err: any) {
      console.error("❌ BhashClient Send Exception:", err);
      return { success: false, error: err.message || "Failed to connect to BhashSMS API" };
    }
  }

  /**
   * Send official Utility Template message via BhashSMS sendmsgutil.php
   */
  async sendUtilityTemplate(payload: BhashOutboundPayload): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: string }> {
    try {
      const phone = this.cleanPhone(payload.phone);
      const templateName = encodeURIComponent(payload.template || payload.text);
      let extra = "";

      if (payload.params && payload.params.length > 0) {
        extra += `&Params=${encodeURIComponent(payload.params.join(","))}`;
      } else {
        extra += `&Params=1`;
      }

      if (payload.htype) {
        extra += `&htype=${payload.htype}`;
      }

      if (payload.fname) {
        extra += `&fname=${encodeURIComponent(payload.fname)}`;
      }

      if (payload.mediaUrl) {
        extra += `&url=${encodeURIComponent(payload.mediaUrl)}`;
      }

      const url = `http://bhashsms.com/api/sendmsgutil.php?user=${encodeURIComponent(this.user)}&pass=${encodeURIComponent(this.pass)}&sender=${encodeURIComponent(this.sender)}&phone=${phone}&text=${templateName}&priority=wa&stype=normal${extra}`;
      const logUrl = `http://bhashsms.com/api/sendmsgutil.php?user=${this.user}&pass=******&sender=${this.sender}&phone=${phone}&text=${templateName}&priority=wa&stype=normal${extra}`;

      console.log(`\n=================================================================`);
      console.log(`📡 [BhashSMS Utility Template Request]: ${logUrl}`);

      const response = await fetch(url, { method: "GET" });
      const responseText = await response.text();

      console.log(`📥 [BhashSMS Utility Status]: ${response.status} ${response.statusText}`);
      console.log(`📥 [BhashSMS Utility Response Body]: "${responseText}"`);
      console.log(`=================================================================\n`);

      const lowerRes = responseText.toLowerCase();
      const isSuccess = response.ok && 
        !lowerRes.includes("error") && 
        !lowerRes.includes("fail") &&
        !lowerRes.includes("invalid") &&
        !lowerRes.includes("unauthorized") &&
        !lowerRes.includes("access denied");

      if (isSuccess) {
        return {
          success: true,
          messageId: `bhash-util-${Date.now()}`,
          rawResponse: responseText
        };
      }

      return { 
        success: false, 
        error: `BhashSMS Utility Error (Status ${response.status}): ${responseText || "Template dispatch failed"}`,
        rawResponse: responseText
      };
    } catch (err: any) {
      console.error("❌ BhashClient Utility Template Exception:", err);
      return { success: false, error: err.message || "Failed to send utility template" };
    }
  }
}

export const bhashClient = new BhashClient();
