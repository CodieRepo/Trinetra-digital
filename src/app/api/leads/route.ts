import { NextResponse } from "next/server";
import { leadRepository } from "../../../repositories/leadRepository";
import { conversationRepository } from "../../../repositories/conversationRepository";
import { timelineRepository } from "../../../repositories/timelineRepository";
import { taskRepository } from "../../../repositories/taskRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    if (leadId) {
      const [lead, messages, timeline, tasks, notes] = await Promise.all([
        leadRepository.findById(leadId),
        conversationRepository.getMessagesByLeadId(leadId),
        timelineRepository.getEventsByLeadId(leadId),
        taskRepository.getTasksByLeadId(leadId),
        taskRepository.getNotesByLeadId(leadId),
      ]);

      return NextResponse.json({
        success: true,
        lead,
        messages,
        timeline,
        tasks,
        notes,
      });
    }

    const leads = await leadRepository.getAllLeads();
    return NextResponse.json({ success: true, leads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed fetching leads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, leadId, note, taskTitle, priority, dueDate } = body;

    if (action === "add_note" && leadId && note) {
      const newNote = await taskRepository.createNote({
        lead_id: leadId,
        note: note,
        author: "Agent",
      });
      return NextResponse.json({ success: true, note: newNote });
    }

    if (action === "add_task" && leadId && taskTitle) {
      const newTask = await taskRepository.createTask({
        lead_id: leadId,
        title: taskTitle,
        priority: priority || "high",
        due_date: dueDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      return NextResponse.json({ success: true, task: newTask });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed executing lead action" }, { status: 500 });
  }
}
