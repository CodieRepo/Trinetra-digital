import { NextResponse } from "next/server";
import { bhashClient } from "../../../../lib/bhash/client";
import { conversationRepository } from "../../../../repositories/conversationRepository";
import { leadRepository } from "../../../../repositories/leadRepository";
import { BhashTemplateType } from "../../../../types/bhash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp/send
 * Outbound WhatsApp Dispatch API for CRM Agents via BhashSMS
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { leadId, phone, text, body: messageBody, template, templateName, params, templateParams, htype, mediaType, mediaUrl, fname } = body;

    const messageText = text || messageBody;
    const activeTemplate = template || templateName;
    const activeParams = params || templateParams;
    const activeHtype = htype || (mediaType?.includes("image") ? "image" : mediaType?.includes("video") ? "video" : mediaType ? "document" : "normal");

    // Auto-resolve phone number from leadId if phone is missing
    let targetLeadId = leadId;
    if (!phone && targetLeadId) {
      const lead = await leadRepository.findById(targetLeadId);
      if (lead && lead.phone) {
        phone = lead.phone;
      }
    }

    if (!phone && text) {
      // Secondary fallback: lookup by phone directly if leadId was actually a phone number
      const lead = await leadRepository.findByPhone(leadId);
      if (lead) {
        phone = lead.phone;
        targetLeadId = lead.id;
      }
    }

    if (!phone || (!messageText && !activeTemplate)) {
      return NextResponse.json({ error: "Missing required parameters (phone or valid leadId, and text or template)" }, { status: 400 });
    }

    let result;

    if (activeTemplate) {
      // Send Official BhashSMS Utility Template
      result = await bhashClient.sendUtilityTemplate({
        phone,
        text: messageText || activeTemplate,
        template: activeTemplate as BhashTemplateType,
        params: activeParams,
        htype: activeHtype as any,
        mediaUrl,
        fname
      });
    } else {
      // Send Normal Outbound Text / Media Message
      result = await bhashClient.sendMessage({
        phone,
        text: messageText,
        htype: activeHtype as any,
        mediaUrl,
        fname
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed sending message via BhashSMS" }, { status: 500 });
    }

    // Record outbound message in CRM database if targetLeadId exists
    if (targetLeadId) {
      await conversationRepository.saveMessage({
        lead_id: targetLeadId,
        direction: "outbound",
        message: messageText || `Template: ${activeTemplate}`,
        meta_message_id: result.messageId,
      });

      // Update lead's last message
      await leadRepository.updateLead(targetLeadId, {
        last_message: messageText || `Template: ${activeTemplate}`,
        last_message_at: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("Outbound send API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
