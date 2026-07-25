import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { leadIngestionService } from "@/services/leadIngestionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getSupabaseAdmin();
  try {
    const { data: leads } = await db
      .from("leads")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(50);

    const { data: messages } = await db
      .from("bhash_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      leads: leads || [],
      messages: messages || [],
      syncStatus: {
        lastSyncedAt: new Date().toISOString(),
        totalLeads: leads?.length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leads: scrapedLeads, secret } = body;

    // Optional secret check if triggered by GitHub Actions scraper
    const expectedSecret = process.env.SCRAPER_SECRET || "trinetra-scraper-secret-2026";
    if (secret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized scraper request" }, { status: 401 });
    }

    let newLeadsDetected = 0;
    const processedResults = [];

    if (Array.isArray(scrapedLeads)) {
      for (const item of scrapedLeads) {
        const phone = String(item.phone || item.mobile || "").replace(/\D/g, "").slice(-10);
        if (!phone || phone.length < 10) continue;

        const result = await leadIngestionService.processInboundMessage({
          tenant_id: "00000000-0000-0000-0000-000000000001",
          phone,
          name: item.name || `WhatsApp Lead (${phone.slice(-4)})`,
          message: item.message || item.last_message || "Incoming lead from Bhash Portal",
          flow_node: item.node || "6206",
          meta_message_id: item.id || `scrape-${phone}-${Date.now()}`,
          timestamp: item.timestamp || new Date().toISOString(),
          rawPayload: item,
        });

        if (result.isNewLead) {
          newLeadsDetected++;
        }
        processedResults.push(result);
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: processedResults.length,
      newLeadsDetected,
      message: `Successfully synced ${processedResults.length} records. ${newLeadsDetected} new leads detected!`,
    });
  } catch (err: any) {
    console.error("❌ Bhash Sync Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
