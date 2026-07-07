import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getMessagingProvider } from "../../../../services/messaging";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, to: rawToPhone, body: messageBody, mediaUrl, mediaType, templateName, templateParams } = body;

    if (!leadId && !rawToPhone) {
      return NextResponse.json(
        { error: "Either leadId or to field is required." },
        { status: 400 }
      );
    }
    if (!messageBody && !mediaUrl && !templateName) {
      return NextResponse.json(
        { error: "At least one content field (body, mediaUrl, or templateName) is required." },
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

    // 3. Resolve recipient phone and target leadId
    let targetLeadId = leadId;
    let recipientPhone = rawToPhone || "";

    if (targetLeadId) {
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("phone, name")
        .eq("id", targetLeadId)
        .eq("tenant_id", tenantId)
        .single();

      if (contactError || !contact) {
        return NextResponse.json({ error: "Lead not found or access denied." }, { status: 404 });
      }
      recipientPhone = contact.phone;
    } else if (rawToPhone) {
      // Find or create lead contact for the raw phone number
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("phone", rawToPhone)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existingContact) {
        targetLeadId = existingContact.id;
      } else {
        const { data: newContact, error: createError } = await supabase
          .from("contacts")
          .insert({
            tenant_id: tenantId,
            name: `Diagnostic User (${rawToPhone})`,
            phone: rawToPhone,
            status: "new"
          })
          .select("id, name")
          .single();

        if (!createError && newContact) {
          targetLeadId = newContact.id;
        }
      }
    }


    if (!targetLeadId) {
      return NextResponse.json({ error: "Could not resolve or create Contact." }, { status: 500 });
    }

    const toPhone = recipientPhone.replace(/\+/g, "").replace(/\s/g, "").replace(/-/g, "").trim();

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
      .eq("contact_id", targetLeadId)
      .maybeSingle();

    if (convError) {
      return NextResponse.json({ error: "Database error resolving conversation." }, { status: 500 });
    }

    if (!conversation) {
      const { data: newConv, error: createConvError } = await supabase
        .from("conversations")
        .insert({
          tenant_id: tenantId,
          contact_id: targetLeadId,
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
        body: messageBody || templateName || "Media Attachment",
        status: "queued",
        sender_id: user.id,
        media_url: mediaUrl || null,
        media_type: mediaType || null
      })
      .select("id")
      .single();

    if (msgInsertError || !dbMessage) {
      console.error("Outbound message queue insert failed:", msgInsertError);
      return NextResponse.json({ error: "Failed to queue outbound message." }, { status: 500 });
    }

    // 7. Make outbound request using our Provider Factory
    const providerType = (tenant as any)?.provider_type || process.env.WHATSAPP_PROVIDER || "bhashsms";
    const provider = getMessagingProvider(providerType);
    
    const sendResult = await provider.sendMessage({
      to: toPhone,
      body: messageBody || "",
      tenantId: tenantId,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      templateName: templateName,
      templateParams: templateParams,
      credentials: {
        apiKey: accessToken,
        phoneNumberId: phoneNumberId,
        accessToken: accessToken
      }
    });

    if (!sendResult.success) {
      console.error(`${providerType} returned error:`, sendResult.errorMessage);
      
      await supabase
        .from("messages")
        .update({ status: "failed", error_message: sendResult.errorMessage || "Provider failed" })
        .eq("id", dbMessage.id);

      return NextResponse.json(
        { error: sendResult.errorMessage || "Provider failed sending message." },
        { status: 502 }
      );
    }

    const metaMessageId = sendResult.providerMessageId;

    if (!metaMessageId) {
      await supabase
        .from("messages")
        .update({ status: "failed", error_message: "No message ID returned from provider." })
        .eq("id", dbMessage.id);

      return NextResponse.json(
        { error: "Provider did not return a valid message ID." },
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
        payload: { provider: providerType, recipient: toPhone, body: messageBody, result: sendResult }
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
