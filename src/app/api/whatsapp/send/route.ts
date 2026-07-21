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
    const { leadId, phone, text, template, params, htype, mediaUrl, fname } = body;

    if (!phone || (!text && !template)) {
      return NextResponse.json({ error: "Missing required parameters (phone, text or template)" }, { status: 400 });
    }

    let targetLeadId = leadId;

    if (!targetLeadId) {
      const lead = await leadRepository.findByPhone(phone);
      if (lead) {
        targetLeadId = lead.id;
      }
    }

    let result;

    if (template) {
      // Send Official BhashSMS Utility Template
      result = await bhashClient.sendUtilityTemplate({
        phone,
        text,
        template: template as BhashTemplateType,
        params,
        htype,
        mediaUrl,
        fname
      });
    } else {
      // Send Normal Outbound Text / Media Message
      result = await bhashClient.sendMessage({
        phone,
        text,
        htype,
        mediaUrl,
        fname
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed sending message via BhashSMS" }, { status: 500 });
    }

    // Record outbound message in CRM database if leadId exists
    if (targetLeadId) {
      await conversationRepository.saveMessage({
        lead_id: targetLeadId,
        direction: "outbound",
        message: text || `Template: ${template}`,
        meta_message_id: result.messageId,
      });

      // Update lead's last message
      await leadRepository.updateLead(targetLeadId, {
        last_message: text || `Template: ${template}`,
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
