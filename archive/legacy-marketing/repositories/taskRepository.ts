import { getSupabaseAdmin } from "../lib/supabase/admin";
import { Task, LeadNote } from "../types/crm";

export class TaskRepository {
  private db = getSupabaseAdmin();

  async createTask(task: {
    lead_id: string;
    title: string;
    description?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    due_date?: string;
    assigned_to?: string | null;
  }): Promise<Task> {
    const { data, error } = await this.db
      .from("bhash_tasks")
      .insert({
        lead_id: task.lead_id,
        title: task.title,
        description: task.description || null,
        status: "pending",
        priority: task.priority || "high",
        due_date: task.due_date || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        assigned_to: task.assigned_to || "Sales Desk",
      })
      .select("*")
      .single();

    if (error) {
      console.error("TaskRepository.createTask error:", error);
      throw error;
    }
    return data as Task;
  }

  async getTasksByLeadId(leadId: string): Promise<Task[]> {
    const { data, error } = await this.db
      .from("bhash_tasks")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("TaskRepository.getTasksByLeadId error:", error);
      return [];
    }
    return (data || []) as Task[];
  }

  async createNote(note: { lead_id: string; note: string; author?: string }): Promise<LeadNote> {
    const { data, error } = await this.db
      .from("bhash_lead_notes")
      .insert({
        lead_id: note.lead_id,
        note: note.note,
        author: note.author || "Agent",
      })
      .select("*")
      .single();

    if (error) {
      console.error("TaskRepository.createNote error:", error);
      throw error;
    }
    return data as LeadNote;
  }

  async getNotesByLeadId(leadId: string): Promise<LeadNote[]> {
    const { data, error } = await this.db
      .from("bhash_lead_notes")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("TaskRepository.getNotesByLeadId error:", error);
      return [];
    }
    return (data || []) as LeadNote[];
  }
}

export const taskRepository = new TaskRepository();
