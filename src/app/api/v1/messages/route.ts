import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { bhashProvider } from "../../../../services/providers/bhashProvider";
import { sendMessageSchema } from "../../../../lib/validation/schemas";
import { generateFingerprint } from "../../../../utils/bhashHelper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  const body = await request.json();

  try {
    const validated = sendMessageSchema.parse(body);
    const tenant_id = body.tenant_id || "00000000-0000-0000-0000-000000000001";

    let phone = validated.phone;
    if (!phone) {
      const { data: lead } = await db
        .from("leads")
        .select("phone")
        .eq("id", validated.lead_id)
        .maybeSingle();
      phone = lead?.phone || "";
    }

    if (!phone) {
      return NextResponse.json({ success: false, error: "Recipient phone number is required" }, { status: 400 });
    }

    const template = body.template || undefined;
    const params = body.params || undefined;
    const mediaUrl = body.mediaUrl || undefined;
    const mediaType = body.mediaType || undefined;

    // Send via Unified Provider Interface (BhashAPIProvider)
    const sendResult = await bhashProvider.sendMessage({
      tenant_id,
      to: phone,
      body: validated.text,
      template,
      params,
      mediaUrl,
      mediaType
    });

    if (!sendResult.success) {
      return NextResponse.json({ success: false, error: sendResult.error }, { status: 400 });
    }

    // Save conversation & message
    let { data: conv } = await db
      .from("conversations")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("lead_id", validated.lead_id)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await db
        .from("conversations")
        .insert({
          tenant_id,
          lead_id: validated.lead_id,
          channel: "whatsapp",
          provider: "bhash",
          status: "active",
        })
        .select("id")
        .single();
      conv = newConv;
    }

    // Generate outbound unique fingerprint for deduplication
    const outboundFingerprint = generateFingerprint(phone, validated.text);

    const { data: savedMsg } = await db
      .from("messages")
      .insert({
        tenant_id,
        conversation_id: conv?.id,
        lead_id: validated.lead_id,
        direction: "outbound",
        body: validated.text,
        provider_message_id: sendResult.messageId || null,
        fingerprint: outboundFingerprint,
        source: "MANUAL",
        provider: "bhash_api",
        status: "sent"
      })
      .select("*")
      .single();

    // Update lead last message timestamp
    await db
      .from("leads")
      .update({
        last_message: validated.text,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.lead_id);

    // Log timeline event
    await db.from("timeline_events").insert({
      tenant_id,
      lead_id: validated.lead_id,
      event_type: "message_sent",
      title: "Outbound Message Sent",
      description: validated.text,
      metadata: { message_id: savedMsg?.id, template },
    });

    return NextResponse.json({
      success: true,
      message: savedMsg,
      messageId: sendResult.messageId,
    });
  } catch (err: any) {
    console.error("❌ Outbound Message Routing Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
