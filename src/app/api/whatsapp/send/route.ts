import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, body: messageBody } = body;

    if (!leadId || !messageBody) {
      return NextResponse.json(
        { error: "leadId and body are required fields." },
        { status: 400 }
      );
    }

    // 1. Authenticate user session (via cookies first, then Authorization header)
    const supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
      if (token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const tokenSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        });
        const { data: { user: headerUser } } = await tokenSupabase.auth.getUser();
        user = headerUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // 2. Resolve user's tenant ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Could not retrieve user profile." }, { status: 403 });
    }

    const tenantId = profile.tenant_id;

    // 3. Query the contact details to get the recipient phone number
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("phone, name")
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Lead not found or access denied." }, { status: 404 });
    }

    const rawPhone = contact.phone;
    // Clean phone number (strip spaces, symbols, and leading + for Meta API)
    const toPhone = rawPhone.replace(/\+/g, "").replace(/\s/g, "").replace(/-/g, "").trim();

    // 4. Retrieve tenant WhatsApp credentials (fallback to environment variables)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("whatsapp_phone_number_id, whatsapp_access_token_encrypted")
      .eq("id", tenantId)
      .single();

    // Decrypted access token logic fallback
    const phoneNumberId = tenant?.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = tenant?.whatsapp_access_token_encrypted || process.env.META_PERMANENT_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: "WhatsApp credentials not configured for this tenant." },
        { status: 500 }
      );
    }

    // 5. Find or create conversation
    let { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", leadId)
      .maybeSingle();

    if (convError) {
      return NextResponse.json({ error: "Database error resolving conversation." }, { status: 500 });
    }

    if (!conversation) {
      const { data: newConv, error: createConvError } = await supabase
        .from("conversations")
        .insert({
          tenant_id: tenantId,
          contact_id: leadId,
          status: "active"
        })
        .select("id")
        .single();

      if (createConvError) {
        return NextResponse.json({ error: "Failed to create conversation entry." }, { status: 500 });
      }
      conversation = newConv;
    }

    // 6. Insert message with 'queued' status
    const { data: dbMessage, error: msgInsertError } = await supabase
      .from("messages")
      .insert({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        direction: "outbound",
        body: messageBody,
        status: "queued",
        sender_id: user.id
      })
      .select("id")
      .single();

    if (msgInsertError || !dbMessage) {
      console.error("Outbound message queue insert failed:", msgInsertError);
      return NextResponse.json({ error: "Failed to queue outbound message." }, { status: 500 });
    }

    // 7. Make outbound Meta Graph API request
    const metaUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const metaPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "text",
      text: {
        body: messageBody
      }
    };

    let metaResponse;
    let metaData;
    try {
      metaResponse = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metaPayload)
      });
      metaData = await metaResponse.json();
    } catch (fetchErr: any) {
      console.error("Meta Graph API fetch exception:", fetchErr);
      
      // Update message status to failed
      await supabase
        .from("messages")
        .update({ status: "failed", error_message: fetchErr.message || "Network exception" })
        .eq("id", dbMessage.id);

      return NextResponse.json(
        { error: "Network failed connecting to Meta API." },
        { status: 502 }
      );
    }

    // 8. Handle Meta API Response
    if (!metaResponse.ok || metaData.error) {
      console.error("Meta Graph API returned error:", metaData);
      
      const errorMsg = metaData.error?.message || "Meta API error";
      
      // Update message status to failed
      await supabase
        .from("messages")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", dbMessage.id);

      // Attempt to log failed send attempt in message_events if message ID exists
      if (metaData.error?.fbtrace_id) {
        try {
          await supabase.from("message_events").insert({
            meta_message_id: `failed-trace-${metaData.error.fbtrace_id}`,
            event_type: "failed",
            payload: { request: metaPayload, response: metaData }
          });
        } catch (e) {
          console.error("Failed writing message_event log:", e);
        }
      }

      return NextResponse.json(
        { error: errorMsg, details: metaData.error },
        { status: metaResponse.status }
      );
    }

    // Success! Extract Meta message ID
    const metaMessageId = metaData.messages?.[0]?.id;

    if (!metaMessageId) {
      await supabase
        .from("messages")
        .update({ status: "failed", error_message: "No message ID returned from Meta." })
        .eq("id", dbMessage.id);

      return NextResponse.json(
        { error: "Meta API did not return a valid message ID." },
        { status: 502 }
      );
    }

    // 9. Update message to 'sent' and save meta_message_id
    const { error: finalMsgUpdateError } = await supabase
      .from("messages")
      .update({
        status: "sent",
        meta_message_id: metaMessageId
      })
      .eq("id", dbMessage.id);

    if (finalMsgUpdateError) {
      console.error("Failed to update message to 'sent':", finalMsgUpdateError);
    }

    // 10. Update last_message_at on conversation
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // 11. Write audit event to message_events
    try {
      await supabase.from("message_events").insert({
        meta_message_id: metaMessageId,
        event_type: "send_attempt",
        payload: { request: metaPayload, response: metaData }
      });
    } catch (e) {
      console.error("Failed writing message_event record:", e);
    }

    return NextResponse.json({
      success: true,
      messageId: dbMessage.id,
      metaMessageId: metaMessageId
    });

  } catch (err: any) {
    console.error("Fatal exception in WhatsApp send route:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
