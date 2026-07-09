import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getMessagingProvider } from "../../../../services/messaging";
import { processRuleEngine } from "../../../../services/messaging/ruleEngine";
import { queueBookingWorkflow } from "../../../../services/messaging/workflowEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL and Service Role Key are required environment variables");
  }
  return createClient(url, key);
}


/**
 * GET: Webhook Verification Handshake
 * Used for confirming webhook endpoint ownership.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode && token) {
      if (mode === "subscribe" && token === (process.env.WEBHOOK_VERIFY_TOKEN || "trinetra_token")) {
        console.log("WhatsApp Webhook verified successfully.");
        return new Response(challenge, { 
          status: 200, 
          headers: { "Content-Type": "text/plain" } 
        });
      } else {
        console.warn("WhatsApp Webhook verify token mismatch.");
        return new Response("Forbidden", { 
          status: 403, 
          headers: { "Content-Type": "text/plain" } 
        });
      }
    }
    return new Response("OK", { status: 200 });
  } catch (err: any) {
    return new Response(err.message || "Internal Server Error", { status: 500 });
  }
}

/**
 * POST: Process Incoming Webhook Notifications (Message & Status Events)
 * Idempotent, tenant-aware, and supports dynamic slug mapping.
 */
export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    
    // 1. Dynamic Tenant Resolution (Query Params, Headers, or Fallback)
    let tenantId = searchParams.get("tenant_id") || searchParams.get("tenant_slug");
    
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    
    // If not uuid, treat as tenant slug mapping
    if (tenantId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("name", tenantId) // fallback to company name match
        .maybeSingle();
      if (tenant) {
        tenantId = tenant.id;
      } else {
        tenantId = null;
      }
    }
    
    // Resolve from phone number id mapping if still unresolved
    const phone_number_id = payload.phone_number_id || payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (!tenantId && phone_number_id) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("whatsapp_phone_number_id", phone_number_id)
        .single();
      if (tenant) {
        tenantId = tenant.id;
      }
    }
    
    // Fall back to default tenant ID env
    if (!tenantId) {
      tenantId = process.env.DEFAULT_TENANT_ID || null;
    }
    
    if (!tenantId) {
      console.error("Webhook rejected: Tenant ID could not be resolved.");
      return NextResponse.json({ error: "Configuration Error: Tenant ID could not be resolved" }, { status: 400 });
    }
    
    // 2. Extract Status Update or Message payload (Supports BhashSMS & Meta JSON)
    const statusUpdate = payload.statusUpdate || payload.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
    const message = payload.message || payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact = payload.contact || payload.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    
    // ── CASE A: Process Status Update ──
    if (statusUpdate) {
      const metaMessageId = statusUpdate.id || statusUpdate.message_id;
      const status = statusUpdate.status; // 'sent', 'delivered', 'read', 'failed'
      const errorMessage = statusUpdate.errors?.[0]?.message || statusUpdate.error_message || null;
      
      if (!metaMessageId) {
        return NextResponse.json({ error: "Missing message ID for status update" }, { status: 400 });
      }

      console.log(`Processing WhatsApp status update: messageId=${metaMessageId}, status=${status}`);

      // Log to message_events
      try {
        const eventType = status === "sent" ? "send_attempt" : status;
        await supabaseAdmin.from("message_events").insert({
          meta_message_id: metaMessageId,
          event_type: eventType,
          payload: statusUpdate
        });
      } catch (e) {
        console.error("Failed writing message_event log:", e);
      }

      // Update message status in DB
      const updatePayload: any = { status };
      if (errorMessage) {
        updatePayload.error_message = errorMessage;
      }

      const { error } = await supabaseAdmin
        .from("messages")
        .update(updatePayload)
        .eq("meta_message_id", metaMessageId)
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Database failed to update message status:", error);
        return NextResponse.json({ error: "Failed to update message status" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Status updated successfully." });
    }
    
    // ── CASE B: Process Inbound Message ──
    if (message) {
      const senderPhone = message.from || message.sender;
      const senderName = contact?.profile?.name || message.sender_name || `WhatsApp User (${senderPhone})`;
      const metaMessageId = message.id || message.message_id;
      const timestamp = message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString();
      
      if (!senderPhone || !metaMessageId) {
        return NextResponse.json({ error: "Missing sender phone or message ID" }, { status: 400 });
      }

      // Idempotency: Ignore duplicate messages
      const { data: existingMsg } = await supabaseAdmin
        .from("messages")
        .select("id")
        .eq("meta_message_id", metaMessageId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
        
      if (existingMsg) {
        return NextResponse.json({ success: true, message: "Duplicate message ignored." });
      }

      let messageBody = "";
      let mediaUrl = null;
      let mediaType = null;

      if (message.type === "text" || !message.type) {
        messageBody = message.text?.body || message.body || "";
      } else {
        messageBody = `[Media message: ${message.type}]`;
        mediaUrl = message[message.type]?.id || null;
        mediaType = message.type;
      }

      // Look up or create CRM Contact
      let { data: dbContact, error: contactError } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone", senderPhone)
        .maybeSingle();

      if (contactError) {
        console.error("Failed to query contact:", contactError);
        return NextResponse.json({ error: "Database error querying contact" }, { status: 500 });
      }

      if (!dbContact) {
        const { data: newContact, error: createError } = await supabaseAdmin
          .from("contacts")
          .insert({
            tenant_id: tenantId,
            name: senderName,
            phone: senderPhone,
            status: "new",
            ai_enabled: true
          })
          .select("id")
          .single();

        if (createError || !newContact) {
          console.error("Failed to create contact:", createError);
          return NextResponse.json({ error: "Database error creating contact" }, { status: 500 });
        }
        dbContact = newContact;

        // Log lead creation
        try {
          await supabaseAdmin.from("audit_logs").insert({
            tenant_id: tenantId,
            action: "lead_created",
            details: {
              lead_id: dbContact.id,
              source: "WhatsApp Webhook",
              name: senderName,
              phone: senderPhone
            }
          });
        } catch (e) {
          console.error("Failed to insert lead creation audit log:", e);
        }
      }

      // Look up or create Conversation
      let { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("id, active_flow, flow_state, flow_version")
        .eq("contact_id", dbContact.id)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (convError) {
        console.error("Failed to query conversation:", convError);
        return NextResponse.json({ error: "Database error querying conversation" }, { status: 500 });
      }

      if (!conversation) {
        const { data: newConv, error: createConvError } = await supabaseAdmin
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            contact_id: dbContact.id,
            status: "active",
            last_message_at: timestamp
          })
          .select("id, active_flow, flow_state, flow_version")
          .single();

        if (createConvError || !newConv) {
          console.error("Failed to create conversation:", createConvError);
          return NextResponse.json({ error: "Database error creating conversation" }, { status: 500 });
        }
        conversation = newConv;
      } else {
        await supabaseAdmin
          .from("conversations")
          .update({ last_message_at: timestamp })
          .eq("id", conversation.id);
      }

      // Insert incoming message
      const { error: msgInsertError } = await supabaseAdmin
        .from("messages")
        .insert({
          tenant_id: tenantId,
          conversation_id: conversation.id,
          direction: "inbound",
          body: messageBody,
          media_url: mediaUrl,
          media_type: mediaType,
          status: "read",
          meta_message_id: metaMessageId,
          created_at: timestamp
        });

      if (msgInsertError) {
        console.error("Failed to insert message:", msgInsertError);
        return NextResponse.json({ error: "Database error saving message" }, { status: 500 });
      }

      // Trigger Notification
      try {
        await supabaseAdmin.from("notifications").insert({
          tenant_id: tenantId,
          type: "new_lead",
          contact_id: dbContact.id,
          message: `New message from ${senderName}: "${messageBody.slice(0, 60)}"`
        });
      } catch (e) {
        console.error("Failed to write notification:", e);
      }

      // ── PRIORITY MATCHING RULE ENGINE ──
      let replyText = "";
      let stateUpdate = null;
      let triggerWorkflow = false;
      let workflowPayload = undefined;

      try {
        const ruleResult = await processRuleEngine(
          tenantId,
          dbContact.id,
          conversation.active_flow,
          conversation.flow_state,
          messageBody,
          "text", // default type
          null, // payload
          supabaseAdmin
        );
        replyText = ruleResult.replyText;
        stateUpdate = ruleResult.stateUpdate;
        triggerWorkflow = ruleResult.triggerWorkflow;
        workflowPayload = ruleResult.workflowPayload;
      } catch (ruleErr) {
        console.error("Rule Engine execution failed:", ruleErr);
        replyText = "Thanks for your message! Our team will contact you shortly.";
      }

      // Persist conversation flow state updates
      if (stateUpdate) {
        await supabaseAdmin
          .from("conversations")
          .update({
            active_flow: stateUpdate.active_flow,
            flow_state: stateUpdate.flow_state
          })
          .eq("id", conversation.id);
      }

      // Dispatch asynchronous workflows
      if (triggerWorkflow && workflowPayload) {
        try {
          await queueBookingWorkflow(tenantId, dbContact.id, workflowPayload, supabaseAdmin);
        } catch (workErr) {
          console.error("Failed to queue booking workflow:", workErr);
        }
      }

      // Send automated response via Messaging Provider (BhashSMS REST API)
      try {
        const { data: tenant } = await supabaseAdmin
          .from("tenants")
          .select("whatsapp_phone_number_id, whatsapp_access_token_encrypted")
          .eq("id", tenantId)
          .single();

        const phoneNumberId = tenant?.whatsapp_phone_number_id || process.env.BHASHSMS_USER || "Trinetra";
        const accessToken = tenant?.whatsapp_access_token_encrypted || process.env.BHASHSMS_PASS;

        if (accessToken && replyText) {
          const provider = getMessagingProvider("bhashsms");
          console.log(`Sending automated response to ${senderPhone} via BhashSMS...`);
          const sendResult = await provider.sendMessage({
            to: senderPhone,
            body: replyText,
            tenantId: tenantId,
            credentials: {
              apiKey: accessToken,
              phoneNumberId: phoneNumberId,
              accessToken: accessToken
            }
          });

          if (sendResult.success && sendResult.providerMessageId) {
            console.log(`Response sent successfully. Message ID: ${sendResult.providerMessageId}`);
            // Log outbound reply to database
            await supabaseAdmin
              .from("messages")
              .insert({
                tenant_id: tenantId,
                conversation_id: conversation.id,
                direction: "outbound",
                body: replyText,
                status: "sent",
                meta_message_id: sendResult.providerMessageId
              });
          } else {
            console.error("Outbound dispatch failed:", sendResult.errorMessage);
          }
        } else {
          console.warn("BhashSMS credentials missing, skipping response dispatch.");
        }
      } catch (e) {
        console.error("Error executing outbound response dispatch:", e);
      }

      return NextResponse.json({ success: true, message: "Message processed successfully." });
    }

    return NextResponse.json({ success: true, message: "Unsupported change event type." });
  } catch (err: any) {
    console.error("Fatal Webhook processing error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
