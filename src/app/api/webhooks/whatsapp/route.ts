import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// Helper function to lazily initialize the Supabase admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL and Service Role Key are required environment variables");
  }
  return createClient(url, key);
}

// HMAC SHA-256 signature verification helper
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  
  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") return false;
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
    
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(parts[1], "hex")
    );
  } catch (err) {
    return false;
  }
}

/**
 * GET: Webhook Verification Handshake
 * Used by Meta to confirm endpoint ownership.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode && token) {
      if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log("WhatsApp Webhook verified successfully.");
        return new Response(challenge, { status: 200 });
      } else {
        console.warn("WhatsApp Webhook verify token mismatch.");
        return new Response("Forbidden", { status: 403 });
      }
    }
    return new Response("Bad Request", { status: 400 });
  } catch (err: any) {
    return new Response(err.message || "Internal Server Error", { status: 500 });
  }
}

/**
 * POST: Process Incoming Webhook Notifications (Message Events)
 */
export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const signature = request.headers.get("x-hub-signature-256") || "";
    const rawBody = await request.text();

    // Verify Meta App Signature in production or if App Secret is set
    if (process.env.META_APP_SECRET && signature) {
      const isVerified = verifySignature(
        rawBody,
        signature,
        process.env.META_APP_SECRET
      );
      if (!isVerified) {
        console.warn("Webhook rejected: Invalid signature.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    
    // Extract metadata
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const metadata = change?.metadata;
    const phone_number_id = metadata?.phone_number_id;

    if (!phone_number_id) {
      // Not a messaging product event we care about
      return NextResponse.json({ success: true, message: "No phone_number_id found." });
    }

    const message = change?.messages?.[0];
    const contact = change?.contacts?.[0];

    // If no message, could be status notification (sent, delivered, read)
    if (!message) {
      return NextResponse.json({ success: true, message: "Status update ignored." });
    }

    // 1. Look up Tenant by whatsapp_phone_number_id
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("whatsapp_phone_number_id", phone_number_id)
      .single();

    if (tenantError || !tenant) {
      console.warn(`Webhook received for unconfigured Phone Number ID: ${phone_number_id}`);
      return NextResponse.json(
        { error: "Tenant not configured for this phone number." },
        { status: 404 }
      );
    }

    const tenantId = tenant.id;
    const senderPhone = message.from;
    const senderName = contact?.profile?.name || `WhatsApp User (${senderPhone})`;
    const metaMessageId = message.id;
    const timestamp = new Date(Number(message.timestamp) * 1000).toISOString();

    // Parse message body by type
    let messageBody = "";
    let mediaUrl = null;
    let mediaType = null;

    if (message.type === "text") {
      messageBody = message.text?.body || "";
    } else if (message.type === "image") {
      messageBody = "[Image]";
      mediaUrl = message.image?.id || null;
      mediaType = "image";
    } else if (message.type === "video") {
      messageBody = "[Video]";
      mediaUrl = message.video?.id || null;
      mediaType = "video";
    } else if (message.type === "audio") {
      messageBody = "[Audio]";
      mediaUrl = message.audio?.id || null;
      mediaType = "audio";
    } else if (message.type === "document") {
      messageBody = `[Document: ${message.document?.filename || "File"}]`;
      mediaUrl = message.document?.id || null;
      mediaType = "document";
    } else {
      messageBody = `[Unsupported Message Type: ${message.type}]`;
    }

    // 2. Look up or create CRM Contact/Lead
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

      if (createError) {
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
            source: "WhatsApp",
            name: senderName,
            phone: senderPhone
          }
        });
      } catch (e) {
        console.error("Failed to insert lead creation audit log:", e);
      }
    }

    // 3. Look up or create Conversation
    let { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("contact_id", dbContact.id)
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
        .select("id")
        .single();

      if (createConvError) {
        console.error("Failed to create conversation:", createConvError);
        return NextResponse.json({ error: "Database error creating conversation" }, { status: 500 });
      }
      conversation = newConv;
    } else {
      // Update last_message_at
      await supabaseAdmin
        .from("conversations")
        .update({ last_message_at: timestamp })
        .eq("id", conversation.id);
    }

    // 4. Duplicate Check (meta_message_id)
    const { data: existingMsg } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("meta_message_id", metaMessageId)
      .maybeSingle();

    if (existingMsg) {
      return NextResponse.json({ success: true, message: "Duplicate message ignored." });
    }

    // 5. Log Message Event
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

    // 6. Trigger Notifications if active
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

    return NextResponse.json({ success: true, message: "Message processed successfully." });
  } catch (err: any) {
    console.error("Fatal Webhook processing error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
