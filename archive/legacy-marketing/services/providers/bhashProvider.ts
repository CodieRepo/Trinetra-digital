import { getSupabaseAdmin } from "../../lib/supabase/admin";
import { MessagingProvider, OutboundMessageRequest, OutboundMessageResponse, IngestedPayload, ProviderCapabilities } from "./providerInterfaces";

export class BhashSMSProvider implements MessagingProvider {
  key = "bhash";

  capabilities: ProviderCapabilities = {
    hasTextMessaging: true,
    hasTemplates: true,
    hasMedia: true,
    hasDeliveryReceipts: false,
    hasReadReceipts: false,
    hasInteractiveButtons: false,
  };

  async sendMessage(req: OutboundMessageRequest): Promise<OutboundMessageResponse> {
    const db = getSupabaseAdmin();
    
    // 1. Resolve credentials from tenants table, fallback to env vars
    const { data: tenant } = await db
      .from("tenants")
      .select("whatsapp_phone_number_id, whatsapp_access_token_encrypted, whatsapp_business_account_id")
      .eq("id", req.tenant_id)
      .maybeSingle();

    const user = tenant?.whatsapp_phone_number_id || process.env.BHASHSMS_USER || "Trinetra";
    const pass = tenant?.whatsapp_access_token_encrypted || process.env.BHASHSMS_PASS;
    const sender = tenant?.whatsapp_business_account_id || process.env.BHASHSMS_SENDER || "BUZWAP";

    if (!pass) {
      console.warn("⚠️ BhashSMS credentials missing (API Key/Password).");
      return { success: false, error: "BhashSMS credentials are not configured." };
    }

    const priority = "wa";
    const cleanPhone = req.to.replace(/\D/g, "");
    let phoneParam = cleanPhone;
    if (phoneParam.startsWith("91") && phoneParam.length === 12) {
      phoneParam = phoneParam.substring(2);
    }

    // 2. Check 24-hour session window
    let inside24Hours = false;
    try {
      const { data: lead } = await db
        .from("leads")
        .select("id")
        .eq("phone", phoneParam)
        .maybeSingle();

      if (lead) {
        const { data: lastInbound } = await db
          .from("messages")
          .select("created_at")
          .eq("lead_id", lead.id)
          .eq("direction", "inbound")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastInbound) {
          const lastInboundTime = new Date(lastInbound.created_at).getTime();
          inside24Hours = (Date.now() - lastInboundTime) <= 24 * 60 * 60 * 1000;
        }
      }
    } catch (dbErr) {
      console.error("Error checking session window in database:", dbErr);
    }

    // 3. Determine endpoint & parameterization based on session window
    let url = "";
    const isTemplateSend = !!req.template || !inside24Hours;

    if (isTemplateSend) {
      // Must use Utility Template
      const templateName = req.template || "fallback_msg";
      const paramsCSV = req.params && req.params.length > 0 ? req.params.join(",") : "";
      
      const baseUrl = "https://bhashsms.com/api/sendmsgutil.php";
      const queryParams = new URLSearchParams({
        user,
        pass,
        sender,
        phone: phoneParam,
        text: templateName,
        priority,
        stype: "normal",
      });

      if (paramsCSV) {
        queryParams.append("Params", paramsCSV);
      }

      // Add media attachment if provided
      if (req.mediaUrl) {
        const type = (req.mediaType || "normal").toLowerCase();
        let htype = "normal";
        if (type.includes("image")) htype = "image";
        else if (type.includes("video")) htype = "video";
        else if (type.includes("document")) htype = "document";

        if (htype !== "normal") {
          queryParams.append("htype", htype);
          queryParams.append("url", req.mediaUrl);
        }
      }

      url = `${baseUrl}?${queryParams.toString()}`;
    } else {
      // Inside 24h window -> Send Session Free-text reply
      const replyUrl = "https://bhashsms.com/api/sendmsgutilreply.php";
      const queryParams = new URLSearchParams({
        user,
        pass,
        sender,
        phone: phoneParam,
        text: req.body,
        priority,
        stype: "normal",
        htype: "normal",
      });

      url = `${replyUrl}?${queryParams.toString()}`;
    }

    try {
      console.log(`📡 Sending BhashSMS Request: ${url.split("?")[0]}?user=${user}&phone=${phoneParam}`);
      const response = await fetch(url, { method: "GET" });
      const responseText = (await response.text()).trim();
      console.log(`[BhashSMS Response]: ${responseText}`);

      // BhashSMS Response Format: s.896541 (success) or e.<reason> (error)
      const success = responseText.startsWith("s.");
      
      // Update health telemetry in provider_configs
      await updateTelemetryStats(db, req.tenant_id, success, responseText);

      if (success) {
        const messageId = responseText.substring(2);
        return { success: true, messageId };
      } else {
        return { success: false, error: responseText };
      }
    } catch (err: any) {
      console.error("❌ BhashSMS Send Request Exception:", err);
      await updateTelemetryStats(db, req.tenant_id, false, err.message || "Network Timeout");
      return { success: false, error: err.message || "Failed calling BhashSMS API" };
    }
  }

  parseWebhookPayload(payload: any): IngestedPayload | null {
    if (!payload || !payload.mobile) return null;

    const phoneStr = String(payload.mobile).trim();
    let cleanedPhone = phoneStr.replace(/\D/g, "");
    
    // Normalize 91 prefix for Indian mobile numbers
    if (cleanedPhone.startsWith("91") && cleanedPhone.length === 12) {
      cleanedPhone = cleanedPhone.substring(2);
    }

    if (cleanedPhone.length < 10) return null;

    const meta_message_id = payload.meta_message_id || `bhash-msg-${cleanedPhone}-${Date.now()}`;
    const timestamp = payload.timestamp || new Date().toISOString();

    return {
      tenant_id: payload.tenant_id || "00000000-0000-0000-0000-000000000001",
      phone: cleanedPhone,
      name: payload.name || `WhatsApp Lead (${cleanedPhone.slice(-4)})`,
      message: payload.message || "",
      meta_message_id,
      timestamp,
      rawPayload: payload,
    };
  }
}

async function updateTelemetryStats(db: any, tenantId: string, success: boolean, rawResponse: string) {
  try {
    const { data: config } = await db
      .from("provider_configs")
      .select("config_json")
      .eq("tenant_id", tenantId)
      .eq("provider_key", "whatsapp_bhash")
      .maybeSingle();

    const configJson = config?.config_json || {};
    const health = configJson.health || {};
    
    health.api_health = success ? "connected" : "degraded";
    if (!success) {
      health.api_failures_count = (health.api_failures_count || 0) + 1;
      health.last_api_failure_at = new Date().toISOString();
    }
    health.last_api_response = {
      timestamp: new Date().toISOString(),
      raw: rawResponse
    };
    health.updated_at = new Date().toISOString();
    configJson.health = health;

    await db
      .from("provider_configs")
      .upsert({
        tenant_id: tenantId,
        provider_key: "whatsapp_bhash",
        config_json: configJson,
        updated_at: new Date().toISOString()
      }, { onConflict: "tenant_id,provider_key" });
  } catch (err) {
    console.error("Failed to update telemetry configs:", err);
  }
}

export const bhashProvider = new BhashSMSProvider();
