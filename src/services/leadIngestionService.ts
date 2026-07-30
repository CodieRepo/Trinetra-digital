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
    const tenantId = payload.tenant_id || "00000000-0000-0000-0000-000000000001";

    // 0. Check if this exact message has already been ingested in messages or bhash_conversations
    if (payload.meta_message_id) {
      const { data: existingMsg } = await db
        .from("messages")
        .select("id, lead_id")
        .eq("fingerprint", payload.meta_message_id)
        .maybeSingle();

      if (existingMsg) {
        const { data: existingLead } = await db
          .from("leads")
          .select("*")
          .eq("id", existingMsg.lead_id)
          .maybeSingle();
        if (existingLead) {
          return { lead: existingLead as Lead, isNewLead: false };
        }
      }

      // Check fallback legacy table
      const { data: legacyMsg } = await db
        .from("bhash_conversations")
        .select("id, lead_id")
        .eq("meta_message_id", payload.meta_message_id)
        .maybeSingle();

      if (legacyMsg) {
        const { data: legacyLead } = await db
          .from("leads")
          .select("*")
          .eq("id", legacyMsg.lead_id)
          .maybeSingle();
        if (legacyLead) {
          return { lead: legacyLead as Lead, isNewLead: false };
        }
      }
    }

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
        tenant_id: tenantId,
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

      // Log Lead Created Timeline event
      try {
        await db.from("timeline_events").insert({
          tenant_id: tenantId,
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

    // 2. Save Message to bhash_conversations (primary storage - WORKING)
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

    // 3. Attempt unified messages table insert (graceful fallback if schema mismatch)
    try {
      // First try to find or create a conversation using available schema
      let conversationId: string | null = null;
      
      const { data: existingConv } = await db
        .from("conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      }

      if (conversationId) {
        const { error: msgInsertErr } = await db.from("messages").insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          direction: "inbound",
          body: messageBody,
          meta_message_id: payload.meta_message_id || null,
          status: "delivered",
          created_at: timestampStr,
        });
        if (msgInsertErr) {
          console.warn("Messages table insert skipped (schema mismatch):", msgInsertErr.message);
        }
      } else {
        console.log("No conversation found for unified messages table. bhash_conversations is primary.");
      }
    } catch (e) {
      console.warn("Messages table insert skipped:", e);
    }

    // 4. Log Message Received Timeline Event
    try {
      await db.from("timeline_events").insert({
        tenant_id: tenantId,
        lead_id: lead.id,
        event_type: "message_received",
        title: "Incoming Message",
        description: messageBody,
        metadata: { node: payload.flow_node },
      });
    } catch (e) {}

    // Broadcast WebSocket & Redux Ingestion events to dashboard
    eventBus.publish("MESSAGE_RECEIVED", { lead, message: messageBody });

    // 4. ASYNCHRONOUS NON-BLOCKING AI ANALYSIS
    const targetLeadId = lead.id;
    const incomingText = messageBody;

    const hasPrecomputedML = payload.rawPayload && payload.rawPayload.ml_intent;

    if (hasPrecomputedML) {
      const mlResult = {
        summary: payload.rawPayload.ml_summary,
        score: Number(payload.rawPayload.ml_score) || 50,
        intent: payload.rawPayload.ml_intent,
        leadTemperature: payload.rawPayload.ml_temperature || "warm",
        suggestedAction: payload.rawPayload.ml_suggested_action,
        appointmentIntent: !!payload.rawPayload.ml_metadata?.appointmentIntent,
        quotationIntent: !!payload.rawPayload.ml_metadata?.quotationIntent,
        humanHandoff: !!payload.rawPayload.ml_metadata?.humanHandoff,
        serviceInquiry: !!payload.rawPayload.ml_metadata?.serviceInquiry,
        followUpRequired: !!payload.rawPayload.ml_metadata?.followUpRequired,
      };

      (async () => {
        try {
          await db
            .from("leads")
            .update({
              ai_summary: mlResult.summary,
              score: mlResult.score,
              ai_intent: mlResult.intent,
              lead_temperature: mlResult.leadTemperature,
              ai_suggested_action: mlResult.suggestedAction,
              ai_intelligence: {
                appointmentIntent: mlResult.appointmentIntent,
                quotationIntent: mlResult.quotationIntent,
                humanHandoff: mlResult.humanHandoff,
                serviceInquiry: mlResult.serviceInquiry,
                followUpRequired: mlResult.followUpRequired
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetLeadId);
          eventBus.publish("AI_ANALYSIS_UPDATED", { lead_id: targetLeadId, aiResult: mlResult });
        } catch (e) {
          console.error("Failed to save precomputed ML data:", e);
        }
      })();
    } else {
      setTimeout(async () => {
        try {
          const aiResult = await aiService.analyzeLead(tenantId, "", incomingText);

          try {
            await db
              .from("leads")
              .update({
                ai_summary: aiResult.summary,
                score: aiResult.score,
                ai_intent: aiResult.intent,
                lead_temperature: aiResult.leadTemperature,
                ai_suggested_action: aiResult.suggestedAction,
                ai_intelligence: {
                  appointmentIntent: aiResult.appointmentIntent,
                  quotationIntent: aiResult.quotationIntent,
                  humanHandoff: aiResult.humanHandoff,
                  serviceInquiry: aiResult.serviceInquiry,
                  followUpRequired: aiResult.followUpRequired
                },
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetLeadId);
          } catch (e) {}

          eventBus.publish("AI_ANALYSIS_UPDATED", { lead_id: targetLeadId, aiResult });
        } catch (aiErr) {
          console.error("Async AI Background Error:", aiErr);
        }
      }, 0);
    }

    return { lead, isNewLead };
  }
}

export const leadIngestionService = new LeadIngestionService();
