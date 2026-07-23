import { getSupabaseAdmin } from "../lib/supabase/admin";
import { IngestedPayload } from "./providers/providerInterfaces";
import { Lead } from "../types/crm";
import { aiService } from "./ai/aiService";
import { auditService } from "./auditService";
import { eventBus } from "./events/domainEventBus";

export class LeadIngestionService {
  async processInboundMessage(payload: IngestedPayload): Promise<{ lead: Lead; isNewLead: boolean }> {
    const db = getSupabaseAdmin();
    const cleanPhone = payload.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

    let lead: Lead | null = null;
    let isNewLead = false;

    // 1. Fetch or Create Lead
    const { data: existingLead } = await db
      .from("leads")
      .select("*")
      .eq("phone", formattedPhone)
      .maybeSingle();

    if (!existingLead) {
      isNewLead = true;

      const coreLeadPayload = {
        phone: formattedPhone,
        name: payload.name || `WhatsApp Lead (${formattedPhone.slice(-4)})`,
        last_message: payload.message || "Incoming Message",
        last_message_at: new Date().toISOString(),
        status: "new",
        source: "WhatsApp",
      };

      const { data: newLead, error: createErr } = await db
        .from("leads")
        .insert(coreLeadPayload)
        .select("*")
        .single();

      if (createErr || !newLead) {
        throw new Error(`Failed creating lead: ${createErr?.message}`);
      }

      lead = newLead as Lead;

      // Log Lead Created Timeline event if table exists
      try {
        await db.from("timeline_events").insert({
          lead_id: lead.id,
          event_type: "lead_created",
          title: "Lead Created",
          description: `Lead first engaged via WhatsApp`,
        });
      } catch (e) {}

      // Log System Audit
      try {
        await auditService.logAction({
          entity_type: "lead",
          entity_id: lead.id,
          actor: "System (Webhook)",
          action: "create_lead",
          new_value: { phone: formattedPhone, name: lead.name },
        });
      } catch (e) {}

      eventBus.publish("LEAD_CREATED", { lead });
    } else {
      lead = existingLead as Lead;

      // Update existing lead
      const { data: updatedLead } = await db
        .from("leads")
        .update({
          last_message: payload.message || lead.last_message,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id)
        .select("*")
        .maybeSingle();

      if (updatedLead) {
        lead = updatedLead as Lead;
      }
    }

    // 2. Save Message to bhash_conversations and messages
    const messageBody = payload.message || `Navigated to node ${payload.flow_node}`;
    const timestampStr = payload.timestamp || new Date().toISOString();

    const { error: bhashConvErr } = await db
      .from("bhash_conversations")
      .insert({
        lead_id: lead.id,
        direction: "inbound",
        message: messageBody,
        flow_node: payload.flow_node || null,
        button_clicked: payload.button_clicked || null,
        meta_message_id: payload.meta_message_id || null,
        timestamp: timestampStr,
      })
      .select("id")
      .maybeSingle();

    if (bhashConvErr) {
      console.warn("bhash_conversations insert notice:", bhashConvErr.message);
    }

    try {
      await db.from("messages").insert({
        lead_id: lead.id,
        direction: "inbound",
        body: messageBody,
        provider_message_id: payload.meta_message_id || null,
        created_at: timestampStr,
      });
    } catch (e) {}

    // 3. Log Message Received Timeline Event
    try {
      await db.from("timeline_events").insert({
        lead_id: lead.id,
        event_type: "message_received",
        title: "Incoming Message",
        description: messageBody,
        metadata: { node: payload.flow_node },
      });
    } catch (e) {}

    eventBus.publish("MESSAGE_RECEIVED", { lead, message: messageBody });

    // 4. ASYNCHRONOUS NON-BLOCKING AI ANALYSIS
    const targetLeadId = lead.id;
    const incomingText = messageBody;

    setTimeout(async () => {
      try {
        const aiResult = await aiService.analyzeLead("default", "", incomingText);

        try {
          await db
            .from("leads")
            .update({
              ai_summary: aiResult.summary,
              score: aiResult.score,
              ai_intent: aiResult.intent,
              lead_temperature: aiResult.leadTemperature,
              ai_suggested_action: aiResult.suggestedAction,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetLeadId);
        } catch (e) {}

        eventBus.publish("AI_ANALYSIS_UPDATED", { lead_id: targetLeadId, aiResult });
      } catch (aiErr) {
        console.error("Async AI Background Error:", aiErr);
      }
    }, 0);

    return { lead, isNewLead };
  }
}

export const leadIngestionService = new LeadIngestionService();
