import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");
  const tenant_id = searchParams.get("tenant_id") || "00000000-0000-0000-0000-000000000001";

  const db = getSupabaseAdmin();
  let query = db
    .from("tasks")
    .select("*")
    .eq("tenant_id", tenant_id)
    .is("deleted_at", null)
    .order("due_date", { ascending: true });

  if (leadId) {
    query = query.eq("lead_id", leadId);
  }

  const { data: tasks, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, tasks: tasks || [] });
}

export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  const body = await request.json();
  const { action = "complete", taskId, status = "completed" } = body;

  try {
    if (action === "complete" || action === "update_status") {
      const { data: task, error } = await db
        .from("tasks")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .select("*")
        .single();

      if (error) throw error;

      if (status === "completed") {
        await db.from("timeline_events").insert({
          tenant_id: task.tenant_id,
          lead_id: task.lead_id,
          event_type: "task_completed",
          title: `Task Completed: ${task.title}`,
          description: `Completed by agent`,
        });
      }

      return NextResponse.json({ success: true, task });
    }

    return NextResponse.json({ error: "Invalid task action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
