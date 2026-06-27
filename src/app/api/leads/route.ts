import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL and Service Role Key are required environment variables");
  }
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    
    // 1. Resolve Tenant ID dynamically
    let tenantId = searchParams.get("tenant_id") || searchParams.get("tenant_slug");
    
    // Check referer header if not provided
    if (!tenantId) {
      const referer = request.headers.get("referer");
      if (referer) {
        try {
          const referrerDomain = new URL(referer).hostname;
          const tenantSlug = referrerDomain.split(".")[0];
          const { data: tenant } = await supabaseAdmin
            .from("tenants")
            .select("id")
            .ilike("name", `%${tenantSlug}%`)
            .maybeSingle();
            
          if (tenant) {
            tenantId = tenant.id;
          }
        } catch (e) {}
      }
    }
    
    // Fallback to default tenant ID env
    if (!tenantId) {
      tenantId = process.env.DEFAULT_TENANT_ID || null;
    }
    
    if (!tenantId) {
      console.error("Public Lead Submission Error: Tenant ID could not be resolved.");
      return NextResponse.json(
        { error: "Configuration Error: Default Tenant ID is missing or could not be resolved." },
        { status: 500 }
      );
    }
    
    // 2. Parse request body
    const body = await request.json();
    const { name, phone, email, company, service, message, source } = body;
    
    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and Phone fields are required." },
        { status: 400 }
      );
    }
    
    // 3. Look up or create contact in Supabase
    let { data: contact, error: contactErr } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone", phone)
      .maybeSingle();
      
    if (contactErr) throw contactErr;
    
    if (!contact) {
      const { data: newContact, error: createErr } = await supabaseAdmin
        .from("contacts")
        .insert({
          tenant_id: tenantId,
          name,
          phone,
          email: email || null,
          company: company || null,
          service: service || null,
          status: "new",
          ai_enabled: true
        })
        .select("id")
        .single();
        
      if (createErr || !newContact) throw createErr;
      contact = newContact;
      
      // Log audit
      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        action: "lead_created",
        details: {
          lead_id: contact.id,
          source: source || "Website Lead Form",
          name,
          phone
        }
      });
    }
    
    // 4. Create conversation
    let { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("contact_id", contact.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
      
    if (!conversation) {
      const { data: newConv } = await supabaseAdmin
        .from("conversations")
        .insert({
          tenant_id: tenantId,
          contact_id: contact.id,
          status: "active"
        })
        .select("id")
        .single();
      conversation = newConv;
    }
    
    // 5. Store message if message body was sent
    if (message && conversation) {
      await supabaseAdmin
        .from("messages")
        .insert({
          tenant_id: tenantId,
          conversation_id: conversation.id,
          direction: "inbound",
          body: message,
          status: "read",
          meta_message_id: `form-${Date.now()}`
        });
    }
    
    return NextResponse.json({
      success: true,
      contactId: contact.id,
      message: "Lead captured successfully"
    });
  } catch (err: any) {
    console.error("Public Lead Submission exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
