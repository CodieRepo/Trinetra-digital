import { getSupabaseAdmin } from "../lib/supabase/admin";
import { IngestedPayload } from "./providers/providerInterfaces";
import { Lead } from "../types/crm";
import { auditService } from "./auditService";
import { eventBus } from "./events/domainEventBus";
import { normalizePhoneNumber } from "../utils/bhashHelper";

export class LeadIngestionService {
  async processInboundMessage(payload: IngestedPayload): Promise<{ lead: Lead; isNewLead: boolean; messageId?: string }> {
    const db = getSupabaseAdmin();
    const formattedPhone = normalizePhoneNumber(payload.phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new Error(`Invalid phone number '${payload.phone}': must have at least 10 valid digits`);
    }

    const tenantId = payload.tenant_id;
    if (!tenantId) {
      throw new Error("Tenant ID is required for deterministic lead ingestion");
    }

    const messageBody = payload.message || `Navigated to node ${payload.flow_node || ""}`.trim() || "Incoming Message";
    const timestampStr = payload.timestamp || new Date().toISOString();
    const internalEventId = payload.rawPayload?.internal_event_id || null;

    // Compensatory Rollback Tracking to guarantee transactional integrity
    let newlyCreatedLeadId: string | null = null;
    let newlyCreatedContactId: string | null = null;
    let newlyCreatedConvId: string | null = null;
    let newlyCreatedMsgId: string | null = null;
    let newlyCreatedTimelineId: string | null = null;

    try {
      // 1. Fetch or Create Lead (STRICTLY SCOPED TO TENANT_ID + PHONE)
      let lead: Lead | null = null;
      let isNewLead = false;

      const { data: existingLead, error: leadQueryErr } = await db
        .from("leads")
        .select("*")
        .eq("phone", formattedPhone)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (leadQueryErr) {
        throw new Error(`Database error querying lead: ${leadQueryErr.message}`);
      }

      if (!existingLead) {
        isNewLead = true;

        const coreLeadPayload = {
          tenant_id: tenantId,
          phone: formattedPhone,
          name: payload.name || `WhatsApp Lead (${formattedPhone.slice(-4)})`,
          last_message: messageBody,
          last_message_at: timestampStr,
          status: "new",
          source: "WhatsApp",
        };

        const { data: newLead, error: createErr } = await db
          .from("leads")
          .insert(coreLeadPayload)
          .select("*")
          .single();

        if (createErr || !newLead) {
          // Secondary safety check: in case of concurrent insert race condition for this tenant
          const { data: racedLead } = await db
            .from("leads")
            .select("*")
            .eq("phone", formattedPhone)
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (racedLead) {
            lead = racedLead as Lead;
            isNewLead = false;
          } else {
            throw new Error(`Failed creating lead: ${createErr?.message}`);
          }
        } else {
          lead = newLead as Lead;
          newlyCreatedLeadId = lead.id;

          // Log System Audit
          try {
            await auditService.logAction({
              entity_type: "lead",
              entity_id: lead.id,
              actor: "System (Webhook)",
              action: "create_lead",
              new_value: { phone: formattedPhone, name: lead.name, tenant_id: tenantId },
            });
          } catch (e) {}

          eventBus.publish("LEAD_CREATED", { lead });
        }
      } else {
        lead = existingLead as Lead;

        // Update existing lead (SCOPED TO TENANT_ID)
        const { data: updatedLead, error: updateErr } = await db
          .from("leads")
          .update({
            last_message: messageBody,
            last_message_at: timestampStr,
            status: lead.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
          .eq("tenant_id", tenantId)
          .select("*")
          .maybeSingle();

        if (updateErr) {
          throw new Error(`Failed updating lead: ${updateErr.message}`);
        }

        if (updatedLead) {
          lead = updatedLead as Lead;
        }
      }

      // 2. Find or Create Contact (Required by conversations table foreign key constraint)
      let contactId: string | null = null;
      const { data: existingContact } = await db
        .from("contacts")
        .select("id")
        .eq("phone", formattedPhone)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: cntErr } = await db
          .from("contacts")
          .insert({
            tenant_id: tenantId,
            name: payload.name || `WhatsApp Contact (${formattedPhone.slice(-4)})`,
            phone: formattedPhone,
            status: "new",
          })
          .select("id")
          .single();

        if (cntErr || !newContact) {
          throw new Error(`Failed creating contact: ${cntErr?.message}`);
        }
        contactId = newContact.id;
        newlyCreatedContactId = contactId;
      }

      // 3. Find or Create Conversation in canonical conversations table
      let conversationId: string | null = null;
      const { data: existingConv } = await db
        .from("conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("contact_id", contactId)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        await db
          .from("conversations")
          .update({
            last_message_at: timestampStr,
            lead_id: lead.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .eq("tenant_id", tenantId);
      } else {
        const { data: newConv, error: convErr } = await db
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            contact_id: contactId,
            lead_id: lead.id,
            status: "active",
            last_message_at: timestampStr,
          })
          .select("id")
          .single();

        if (convErr || !newConv) {
          throw new Error(`Failed creating conversation: ${convErr?.message}`);
        }
        conversationId = newConv.id;
        newlyCreatedConvId = conversationId;
      }

      // 4. Save Message to CANONICAL messages table
      // Inbound message status uses verified schema default 'queued' without inventing delivery/read semantics.
      // External message ID is explicitly null as Bhash does not provide inbound provider message IDs.
      const { data: savedMsg, error: msgErr } = await db
        .from("messages")
        .insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          lead_id: lead.id,
          direction: "inbound",
          body: messageBody,
          status: "queued",
          meta_message_id: null,
          created_at: timestampStr,
        })
        .select("id")
        .single();

      if (msgErr || !savedMsg) {
        throw new Error(`Failed inserting canonical message: ${msgErr?.message}`);
      }
      newlyCreatedMsgId = savedMsg.id;

      // 5. Log Message Received Timeline Event
      const { data: timelineEvt, error: timelineErr } = await db
        .from("timeline_events")
        .insert({
          tenant_id: tenantId,
          lead_id: lead.id,
          event_type: "message_received",
          title: "Incoming Message",
          description: messageBody,
          metadata: {
            internal_event_id: internalEventId,
            node: payload.flow_node || null,
          },
        })
        .select("id")
        .single();

      if (timelineErr) {
        console.warn("Notice: Timeline event insert skipped:", timelineErr.message);
      } else if (timelineEvt) {
        newlyCreatedTimelineId = timelineEvt.id;
      }

      // Broadcast WebSocket & Redux Ingestion events to dashboard
      eventBus.publish("MESSAGE_RECEIVED", { lead, message: messageBody });

      // 6. Precomputed ML Handling (Synchronous if already attached in payload)
      const hasPrecomputedML = payload.rawPayload && payload.rawPayload.ml_intent;
      if (hasPrecomputedML) {
        const mlResult = {
          summary: payload.rawPayload.ml_summary,
          score: Number(payload.rawPayload.ml_score) || 50,
          intent: payload.rawPayload.ml_intent,
          leadTemperature: payload.rawPayload.ml_temperature || "warm",
          suggestedAction: payload.rawPayload.ml_suggested_action,
        };

        try {
          await db
            .from("leads")
            .update({
              ai_summary: mlResult.summary,
              score: mlResult.score,
              ai_intent: mlResult.intent,
              lead_temperature: mlResult.leadTemperature,
              ai_suggested_action: mlResult.suggestedAction,
              updated_at: new Date().toISOString(),
            })
            .eq("id", lead.id)
            .eq("tenant_id", tenantId);
        } catch (mlErr) {
          console.error("Failed saving precomputed ML data:", mlErr);
        }
      }

      return { lead, isNewLead, messageId: savedMsg.id };
    } catch (atomicErr) {
      // COMPENSATORY ROLLBACK: If any core step failed, clean up any newly created records in reverse order
      // to guarantee zero orphaned records in the database.
      console.error("Atomic CRM Persistence Failure. Executing compensatory rollback:", atomicErr);

      if (newlyCreatedTimelineId) {
        try {
          await db.from("timeline_events").delete().eq("id", newlyCreatedTimelineId);
        } catch {}
      }
      if (newlyCreatedMsgId) {
        try {
          await db.from("messages").delete().eq("id", newlyCreatedMsgId);
        } catch {}
      }
      if (newlyCreatedConvId) {
        try {
          await db.from("conversations").delete().eq("id", newlyCreatedConvId);
        } catch {}
      }
      if (newlyCreatedContactId) {
        try {
          await db.from("contacts").delete().eq("id", newlyCreatedContactId);
        } catch {}
      }
      if (newlyCreatedLeadId) {
        try {
          await db.from("leads").delete().eq("id", newlyCreatedLeadId);
        } catch {}
      }

      throw atomicErr;
    }
  }
}

export const leadIngestionService = new LeadIngestionService();
