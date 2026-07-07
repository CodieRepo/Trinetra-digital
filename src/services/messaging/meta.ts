import { MessagingProvider, MessagePayload, SendResult } from "./types";

export class MetaProvider implements MessagingProvider {
  async sendMessage(payload: MessagePayload): Promise<SendResult> {
    const phoneNumberId = payload.credentials.phoneNumberId;
    const accessToken = payload.credentials.accessToken;
    
    if (!phoneNumberId || !accessToken) {
      return { success: false, errorMessage: "Meta WhatsApp credentials not configured." };
    }
    
    const metaUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    
    let type = "text";
    const metaPayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
    };

    // Construct request payload based on content types
    if (payload.templateName) {
      type = "template";
      metaPayload.template = {
        name: payload.templateName,
        language: { code: "en" }, // default to English
        components: []
      };
      if (payload.templateParams && payload.templateParams.length > 0) {
        metaPayload.template.components.push({
          type: "body",
          parameters: payload.templateParams.map(param => ({
            type: "text",
            text: param
          }))
        });
      }
    } else if (payload.mediaUrl) {
      const mediaType = (payload.mediaType || "document").toLowerCase();
      if (mediaType.includes("image")) {
        type = "image";
        metaPayload.image = { url: payload.mediaUrl, caption: payload.body };
      } else if (mediaType.includes("video")) {
        type = "video";
        metaPayload.video = { url: payload.mediaUrl, caption: payload.body };
      } else if (mediaType.includes("audio")) {
        type = "audio";
        metaPayload.audio = { url: payload.mediaUrl };
      } else {
        type = "document";
        metaPayload.document = { url: payload.mediaUrl, filename: "Attachment", caption: payload.body };
      }
    } else if (payload.interactiveType) {
      type = "interactive";
      metaPayload.interactive = {
        type: payload.interactiveType,
      };
      
      if (payload.interactiveHeader) {
        metaPayload.interactive.header = {
          type: "text",
          text: payload.interactiveHeader
        };
      }
      
      metaPayload.interactive.body = {
        text: payload.interactiveBody || payload.body
      };
      
      if (payload.interactiveFooter) {
        metaPayload.interactive.footer = {
          text: payload.interactiveFooter
        };
      }
      
      if (payload.interactiveType === "button") {
        metaPayload.interactive.action = {
          buttons: (payload.interactiveButtons || []).map(btn => ({
            type: "reply",
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        };
      } else if (payload.interactiveType === "list") {
        metaPayload.interactive.action = {
          button: payload.flowCta || "Select Options",
          sections: (payload.interactiveSections || []).map(sec => ({
            title: sec.title || "Options",
            rows: sec.rows.map(row => ({
              id: row.id,
              title: row.title,
              description: row.description
            }))
          }))
        };
      } else if (payload.interactiveType === "flow") {
        metaPayload.interactive.action = {
          name: "flow",
          parameters: {
            flow_token: payload.flowToken || `flow-${Date.now()}`,
            flow_id: payload.flowId,
            flow_cta: payload.flowCta || "Book Now",
            flow_action: payload.flowAction || "navigate",
            flow_action_payload: payload.flowActionPayload || { screen: "BOOKING_SCREEN" }
          }
        };
      }
    } else {
      type = "text";
      metaPayload.text = { body: payload.body };
    }
    
    metaPayload.type = type;
    
    try {
      const response = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metaPayload)
      });
      
      const metaData = await response.json();
      if (response.ok && !metaData.error) {
        return {
          success: true,
          providerMessageId: metaData.messages?.[0]?.id
        };
      } else {
        return {
          success: false,
          errorMessage: metaData.error?.message || "Meta API error"
        };
      }
    } catch (e: any) {
      return { success: false, errorMessage: e.message || "Meta Graph fetch exception" };
    }
  }
}
