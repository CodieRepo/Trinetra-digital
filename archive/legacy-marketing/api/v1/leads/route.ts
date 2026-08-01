import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { createLeadSchema, createNoteSchema, createTaskSchema } from "../../../../lib/validation/schemas";
import { aiService } from "../../../../services/ai/aiService";
import { conversationRepository } from "../../../../repositories/conversationRepository";
import { timelineService } from "../../../../services/timelineService";
import { taskService } from "../../../../services/taskService";
import { leadNoteService } from "../../../../services/leadNoteService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId") || searchParams.get("id");
  const search = searchParams.get("search") || searchParams.get("query") || "";
  const status = searchParams.get("status");
  const temp = searchParams.get("temperature");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const db = getSupabaseAdmin();

  // 1. Single Lead Deep Detail Retrieval (Inbox & Customer Profile 360)
  if (leadId) {
    const { data: dbLead } = await db
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (!dbLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const messages = await conversationRepository.getMessagesByLeadId(leadId);
    const timeline = await timelineService.getEventsByLeadId(leadId);
    const tasks = await taskService.getTasksByLeadId(leadId);
    const notes = await leadNoteService.getNotesByLeadId(leadId);

    return NextResponse.json({
      success: true,
      lead: dbLead,
      messages: messages || [],
      timeline: timeline || [],
      tasks: tasks || [],
      notes: notes || [],
    });
  }

  // 2. Leads List Query
  let query = db
    .from("leads")
    .select("*", { count: "exact" })
    .order("last_message_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (temp) {
    query = query.eq("lead_temperature", temp);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,last_message.ilike.%${search}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: leads, count, error } = await query;

  if (error) {
    console.error("GET /api/v1/leads error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    leads: leads || [],
    total: count || 0,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  const body = await request.json();
  const action = body.action || "create";

  try {
    switch (action) {
      case "create": {
        const validated = createLeadSchema.parse(body);
        const { data: newLead, error } = await db
          .from("leads")
          .insert({
            phone: validated.phone.replace(/\D/g, "").slice(-10),
            name: validated.name || "New Lead",
            service_interest: validated.service_interest || null,
            source: validated.source || "Manual",
            status: "new",
            last_message: "Lead created manually",
            last_message_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (error) throw error;

        try {
          await db.from("timeline_events").insert({
            lead_id: newLead.id,
            event_type: "lead_created",
            title: "Lead Created Manually",
            description: `Lead created by user`,
          });
        } catch (e) {}

        return NextResponse.json({ success: true, lead: newLead });
      }

      case "update_stage": {
        const { leadId, status: newStatus } = body;
        const { data: updatedLead, error } = await db
          .from("leads")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", leadId)
          .select("*")
          .maybeSingle();

        if (error) throw error;

        try {
          await db.from("timeline_events").insert({
            lead_id: leadId,
            event_type: "status_changed",
            title: "Stage Updated",
            description: `Stage changed to ${newStatus}`,
          });
        } catch (e) {}

        return NextResponse.json({ success: true, lead: updatedLead || { id: leadId, status: newStatus } });
      }

      case "add_note": {
        const validated = createNoteSchema.parse(body);
        try {
          const { data: note } = await db
            .from("lead_notes")
            .insert({
              lead_id: validated.lead_id,
              note: validated.note,
              author: validated.author || "Agent",
            })
            .select("*")
            .single();

          return NextResponse.json({ success: true, note });
        } catch (e) {
          return NextResponse.json({ success: true, note: { lead_id: validated.lead_id, note: validated.note } });
        }
      }

      case "add_task": {
        const validated = createTaskSchema.parse(body);
        try {
          const { data: task } = await db
            .from("tasks")
            .insert({
              lead_id: validated.lead_id,
              title: validated.title,
              description: validated.description || null,
              task_type: validated.task_type || "call",
              priority: validated.priority || "medium",
              due_date: validated.due_date,
              assigned_to: validated.assigned_to || "Sales Manager",
            })
            .select("*")
            .single();

          return NextResponse.json({ success: true, task });
        } catch (e) {
          return NextResponse.json({ success: true, task: { lead_id: validated.lead_id, title: validated.title } });
        }
      }

      case "reanalyze_ai": {
        const { leadId } = body;
        const { data: currentLead } = await db.from("leads").select("last_message").eq("id", leadId).maybeSingle();
        const aiResult = await aiService.analyzeLead("default", "", currentLead?.last_message || "");

        try {
          await db
            .from("leads")
            .update({
              ai_summary: aiResult.summary,
              score: aiResult.score,
              ai_intent: aiResult.intent,
              lead_temperature: aiResult.leadTemperature,
              ai_suggested_action: aiResult.suggestedAction,
              updated_at: new Date().toISOString(),
            })
            .eq("id", leadId);
        } catch (e) {}

        return NextResponse.json({ success: true, lead: { id: leadId }, aiResult });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("API Lead Action Error:", err);
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 500 });
  }
}
