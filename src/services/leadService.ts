import { leadRepository } from "../repositories/leadRepository";
import { conversationRepository } from "../repositories/conversationRepository";
import { timelineRepository } from "../repositories/timelineRepository";
import { taskRepository } from "../repositories/taskRepository";
import { mapBhashNodeToCRM } from "../lib/bhash/mapper";
import { BhashWebhookPayload } from "../types/bhash";
import { Lead } from "../types/crm";
import { getSupabaseAdmin } from "../lib/supabase/admin";

export class LeadService {
  async processInboundBhashPayload(payload: BhashWebhookPayload): Promise<{ lead: Lead; isNewLead: boolean }> {
    const { phone, name, message, flow_node, button_clicked, meta_message_id, timestamp } = payload;
    const node = String(flow_node || "6206");
    const nodeMapping = mapBhashNodeToCRM(node, button_clicked);
    const db = getSupabaseAdmin();

    let lead = await leadRepository.findByPhone(phone);
    let isNewLead = false;

    // 1. Check or Create Lead
    if (!lead) {
      isNewLead = true;
      lead = await leadRepository.createLead({
        phone: phone,
        name: name || `WhatsApp Lead (${phone.slice(-4)})`,
        service_interest: nodeMapping.serviceInterest || null,
        current_flow_node: node,
        last_message: message || null,
        status: nodeMapping.leadStatusUpdate || "new",
        source: "WhatsApp",
      });

      // Mirror to legacy contacts table if exists
      try {
        await db.from("contacts").insert({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          status: lead.status,
          service: lead.service_interest,
          source: "WhatsApp"
        });
      } catch (e) {}

      // Log Lead Created Timeline event
      await timelineRepository.createEvent({
        lead_id: lead.id,
        event_type: "lead_created",
        title: "Lead Created",
        description: `Lead first engaged via WhatsApp at Node ${node}`,
        metadata: { source: "WhatsApp", initial_node: node },
      });
    } else {
      // Update existing lead
      const updateData: any = {
        current_flow_node: node,
        last_message: message || lead.last_message,
        last_message_at: new Date().toISOString(),
      };

      if (nodeMapping.serviceInterest) {
        updateData.service_interest = nodeMapping.serviceInterest;
      }

      if (nodeMapping.leadStatusUpdate) {
        updateData.status = nodeMapping.leadStatusUpdate;
      }

      lead = await leadRepository.updateLead(lead.id, updateData);

      // Mirror update to legacy contacts table
      try {
        await db.from("contacts").update({
          name: lead.name,
          status: lead.status,
          service: lead.service_interest
        }).eq("phone", phone);
      } catch (e) {}
    }

    // 2. Save Conversation Message
    await conversationRepository.saveMessage({
      lead_id: lead.id,
      direction: "inbound",
      message: message || `Navigated to Node ${node}`,
      flow_node: node,
      button_clicked: button_clicked || null,
      meta_message_id: meta_message_id || null,
      timestamp: typeof timestamp === "string" ? timestamp : new Date().toISOString(),
    });

    // Mirror to legacy messages table
    try {
      const { data: conv } = await db.from("conversations").select("id").eq("contact_id", lead.id).maybeSingle();
      let conversationId = conv?.id;
      if (!conversationId) {
        const { data: newConv } = await db.from("conversations").insert({ contact_id: lead.id, status: "active" }).select("id").single();
        conversationId = newConv?.id;
      }
      if (conversationId) {
        await db.from("messages").insert({
          conversation_id: conversationId,
          direction: "inbound",
          body: message || `Navigated to Node ${node}`,
          meta_message_id: meta_message_id || null,
          status: "read"
        });
      }
    } catch (e) {}

    // 3. Automatically Create Timeline Event
    await timelineRepository.createEvent({
      lead_id: lead.id,
      event_type: nodeMapping.eventType,
      title: nodeMapping.eventTitle,
      description: nodeMapping.eventDescription,
      metadata: { node_id: node, button_clicked: button_clicked || null },
    });

    // 4. TRIGGER FOR NODE 6232 (Contact Confirmation)
    if (nodeMapping.isContactRequested) {
      console.log(`🚨 Node 6232 Reached for Lead ${lead.phone}! Executing automated contact trigger...`);

      // Update Lead Status to 'Interested'
      lead = await leadRepository.updateLead(lead.id, { status: "Interested" });

      // Automatically create follow-up task
      await taskRepository.createTask({
        lead_id: lead.id,
        title: `🔥 Immediate Follow-up: ${lead.name} (${lead.phone})`,
        description: `Requested contact/callback via WhatsApp Flow (Node 6232). Service Interest: ${lead.service_interest || "General Inquiry"}.`,
        priority: "urgent",
        due_date: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), // 2 hours due
        assigned_to: "Sales Manager",
      });

      // Write CRM system notification
      try {
        await db.from("notifications").insert({
          type: "contact_requested",
          message: `🔥 HIGH INTENT LEAD: ${lead.name} (${lead.phone}) requested direct contact at Node 6232!`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Failed writing CRM notification:", err);
      }
    }

    return { lead, isNewLead };
  }
}

export const leadService = new LeadService();
