import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenant_id = searchParams.get("tenant_id") || "00000000-0000-0000-0000-000000000001";

  const db = getSupabaseAdmin();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    const [
      allLeadsRes,
      todayLeadsRes,
      weeklyLeadsRes,
      monthlyLeadsRes,
      pendingTasksRes,
      recentTimelineRes,
    ] = await Promise.all([
      db.from("leads").select("status, is_customer, source").eq("tenant_id", tenant_id).is("deleted_at", null),
      db.from("leads").select("id", { count: "exact" }).eq("tenant_id", tenant_id).gte("created_at", startOfDay).is("deleted_at", null),
      db.from("leads").select("id", { count: "exact" }).eq("tenant_id", tenant_id).gte("created_at", startOfWeek).is("deleted_at", null),
      db.from("leads").select("id", { count: "exact" }).eq("tenant_id", tenant_id).gte("created_at", startOfMonth).is("deleted_at", null),
      db.from("tasks").select("id", { count: "exact" }).eq("tenant_id", tenant_id).eq("status", "pending").is("deleted_at", null),
      db.from("timeline_events").select("id, title, description, event_type, created_at, leads(name)").eq("tenant_id", tenant_id).order("created_at", { ascending: false }).limit(10),
    ]);

    const leads = allLeadsRes.data || [];
    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === "new").length;
    const qualifiedLeads = leads.filter((l) => l.status === "qualified").length;
    const wonLeads = leads.filter((l) => l.status === "won" || l.is_customer).length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    const stageDistribution = {
      new: leads.filter((l) => l.status === "new").length,
      contacted: leads.filter((l) => l.status === "contacted").length,
      qualified: leads.filter((l) => l.status === "qualified").length,
      quotation: leads.filter((l) => l.status === "quotation").length,
      negotiation: leads.filter((l) => l.status === "negotiation").length,
      won: wonLeads,
      lost: leads.filter((l) => l.status === "lost").length,
    };

    const sourcesBreakdown: Record<string, number> = {};
    leads.forEach((l) => {
      const src = l.source || "WhatsApp";
      sourcesBreakdown[src] = (sourcesBreakdown[src] || 0) + 1;
    });

    const recentActivities = (recentTimelineRes.data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: `${t.leads?.name ? t.leads.name + ": " : ""}${t.description || ""}`,
      timestamp: t.created_at,
      actor: "System",
      type: t.event_type,
    }));

    return NextResponse.json({
      success: true,
      metrics: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        wonLeads,
        conversionRate,
        pendingTasks: pendingTasksRes.count || 0,
        todayLeads: todayLeadsRes.count || 0,
        weeklyLeads: weeklyLeadsRes.count || 0,
        monthlyLeads: monthlyLeadsRes.count || 0,
        sourcesBreakdown,
        stageDistribution,
        recentActivities,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
